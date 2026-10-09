import { isInternalApiRequest } from "@/lib/apiSecurity";
import { isGoldRushExitCanaryActive } from "@/lib/goldRushExitCanary";
import { alchemyEvmProvider } from "@/lib/intelligence/evm/providers/alchemy";
import { getEvmNetworkContext } from "@/lib/intelligence/evm/engine";
import { decodeBlockscoutHolders } from "@/lib/intelligence/evm/providers/indexedHolderAdapters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fixed public USDC contract. No attacker-supplied URLs, networks, addresses or cursors.
const token = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const origin = "https://eth.blockscout.com";
const tokenPath = `/api/v2/tokens/${token}`;
const maxBytes = 128 * 1024;
const timeoutMs = 8_000;
const decimal = /^(?:0|[1-9][0-9]{0,119})$/;
const cursorFields = new Set(["address_hash", "value", "items_count", "fiat_value", "holder_count"]);

type Stage = "GATE" | "METADATA" | "RPC_SUPPLY" | "SUPPLY_MATCH" | "HOLDER_PAGE_1" | "HOLDER_PAGE_2" | "DONE";
type Category = "PASS" | "BLOCKED" | "KEY_MISSING" | "HTTP_4XX" | "RATE_LIMITED" | "HTTP_5XX" | "TRANSPORT_OR_TIMEOUT" | "INVALID_RESPONSE" | "RPC_ERROR" | "SUPPLY_MISMATCH" | "ORDER_OR_SCHEMA_REJECTED" | "INCOMPLETE";
type Snapshot = { stage: Stage; category: Category; count?: number };

type JsonObject = Record<string, unknown>;
function object(x: unknown): JsonObject | null {
  return x !== null && typeof x === "object" && !Array.isArray(x) ? x as JsonObject : null;
}
function safeDecimal(x: unknown): string | null {
  return typeof x === "string" && decimal.test(x) ? x : null;
}
function statusCategory(status: number): Category {
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "HTTP_5XX";
  if (status >= 400) return "HTTP_4XX";
  return "TRANSPORT_OR_TIMEOUT";
}
async function readFixed(path: string, params?: Record<string, string>): Promise<{ok: true; body: unknown} | {ok: false; category: Category}> {
  const url = new URL(path, origin);
  if (params) for (const [k,v] of Object.entries(params)) url.searchParams.set(k,v);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store", redirect: "error",
      headers: { accept: "application/json" }, signal: ctl.signal });
    if (!res.ok) { await res.body?.cancel(); return {ok:false, category:statusCategory(res.status)}; }
    if (!res.body) return {ok:false,category:"INVALID_RESPONSE"};
    const length = res.headers.get("content-length");
    if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
      await res.body.cancel(); return {ok:false,category:"INVALID_RESPONSE"};
    }
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return {ok:false,category:"INVALID_RESPONSE"}; }
      chunks.push(part.value);
    }
    try {
      const body: unknown = JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(Buffer.concat(chunks)));
      return {ok:true,body};
    } catch { return {ok:false,category:"INVALID_RESPONSE"}; }
  } catch { return {ok:false,category:"TRANSPORT_OR_TIMEOUT"}; }
  finally { clearTimeout(timer); }
}
function extractCursor(body: unknown): Record<string,string> | null | undefined {
  const root = object(body);
  if (!root) return undefined;
  if (root.next_page_params === null || root.next_page_params === undefined) return null;
  const raw = object(root.next_page_params);
  if (!raw || Object.keys(raw).length === 0) return undefined;
  const result: Record<string,string> = {};
  for (const [k,v] of Object.entries(raw)) {
    if (!cursorFields.has(k) || (typeof v !== "string" && typeof v !== "number" && v !== null) || String(v).length > 180) return undefined;
    if (v !== null) result[k] = String(v);
  }
  return result;
}

// All outward responses are bounded classifications: no data, addresses or provider bodies.
export async function POST(request: Request): Promise<Response> {
  const headers = { "cache-control": "no-store" };
  const respond = (status: number, result: Snapshot) => Response.json(result, {status,headers});
  if (!isInternalApiRequest(request)) return respond(403,{stage:"GATE",category:"BLOCKED"});
  if (process.env.VERCEL_ENV !== "preview" || !isGoldRushExitCanaryActive() ||
      process.env.AYZO_INDEXED_HOLDER_CANARY !== "1") return respond(404,{stage:"GATE",category:"BLOCKED"});
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    return respond(400,{stage:"GATE",category:"BLOCKED"});
  // Only a zero-input fixed probe; nonempty bodies are rejected.
  let body: unknown;
  try { body = await request.json(); } catch { return respond(400,{stage:"GATE",category:"BLOCKED"}); }
  if (!object(body) || Object.keys(body as JsonObject).length !== 0)
    return respond(400,{stage:"GATE",category:"BLOCKED"});
  if (!process.env.ALCHEMY_API_KEY?.trim()) return respond(502,{stage:"RPC_SUPPLY",category:"KEY_MISSING"});
  if (!process.env.AYZO_INTERNAL_API_KEY || process.env.AYZO_INTERNAL_API_KEY.length < 24)
    return respond(502,{stage:"GATE",category:"BLOCKED"});

  const metadata = await readFixed(tokenPath);
  if (!metadata.ok) return respond(502,{stage:"METADATA",category:metadata.category});
  const indexed = safeDecimal(object(metadata.body)?.total_supply);
  if (!indexed || BigInt(indexed) === 0n) return respond(502,{stage:"METADATA",category:"INVALID_RESPONSE"});
  const network = getEvmNetworkContext("ethereum");
  if (!network || network.chainId !== 1) return respond(502,{stage:"RPC_SUPPLY",category:"BLOCKED"});
  const rpc = await alchemyEvmProvider.callContract({network,address:token,data:"0x18160ddd", signal:request.signal});
  if (!rpc.ok) return respond(502,{stage:"RPC_SUPPLY",category: rpc.code === "RATE_LIMITED" ? "RATE_LIMITED" : rpc.code === "TIMEOUT" ? "TRANSPORT_OR_TIMEOUT" : "RPC_ERROR"});
  if (!/^0x[0-9a-fA-F]{1,64}$/.test(rpc.data.result)) return respond(502,{stage:"RPC_SUPPLY",category:"INVALID_RESPONSE"});
  if (BigInt(rpc.data.result) !== BigInt(indexed)) return respond(502,{stage:"SUPPLY_MATCH",category:"SUPPLY_MISMATCH"});

  const first = await readFixed(tokenPath + "/holders");
  if (!first.ok) return respond(502,{stage:"HOLDER_PAGE_1",category:first.category});
  const parsedFirst = decodeBlockscoutHolders(first.body,metadata.body,100);
  if (!parsedFirst || parsedFirst.holders.length !== 50 || !parsedFirst.nextCursor)
    return respond(502,{stage:"HOLDER_PAGE_1",category:"ORDER_OR_SCHEMA_REJECTED"});
  const page = extractCursor(first.body);
  if (!page || Object.keys(page).length === 0) return respond(502,{stage:"HOLDER_PAGE_1",category:"INVALID_RESPONSE"});
  const second = await readFixed(tokenPath + "/holders",page);
  if (!second.ok) return respond(502,{stage:"HOLDER_PAGE_2",category:second.category});
  const parsedSecond = decodeBlockscoutHolders(second.body,metadata.body,100);
  if (!parsedSecond || parsedSecond.holders.length !== 50) return respond(502,{stage:"HOLDER_PAGE_2",category:"ORDER_OR_SCHEMA_REJECTED"});
  const seen = new Set(parsedFirst.holders.map(h=>h.address));
  if (parsedSecond.holders.some(h=>seen.has(h.address)) ||
      BigInt(parsedSecond.holders[0].balance) > BigInt(parsedFirst.holders[49].balance) ||
      [...parsedFirst.holders,...parsedSecond.holders].reduce((sum,h)=>sum+BigInt(h.balance),0n)>BigInt(indexed))
    return respond(502,{stage:"HOLDER_PAGE_2",category:"ORDER_OR_SCHEMA_REJECTED"});
  return respond(200,{stage:"DONE",category:"PASS",count:100});
}
