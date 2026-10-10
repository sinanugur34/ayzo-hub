import { providerUsageFetch } from "@/lib/providerUsageHttpCore";
import type { ProviderCapability } from "@/lib/providers/types";
import type { EvmTransfersProvider, EvmTokenTransfersRequest } from "../provider";
import type { EvmNetworkContext, EvmProviderResult, EvmTransfersPage, EvmTransfer } from "../types";

type Rec = Record<string, unknown>;
const addr = /^0x[a-fA-F0-9]{40}$/;
const hash = /^0x[a-fA-F0-9]{64}$/;
const maxBytes = 512 * 1024;
const capabilities = ["tokenTransfers"] as const satisfies readonly ProviderCapability[];
const chains = new Map<string, number>([["sonic", 146], ["mantle", 5000]]);
const asRec = (v: unknown): Rec | null => v && typeof v === "object" && !Array.isArray(v) ? v as Rec : null;
const str = (v: unknown): string | null => typeof v === "string" ? v : null;
const normAddr = (v: unknown): string | null => {
  const s = str(v); return s && addr.test(s) ? s.toLowerCase() : null;
};
const rawAmount = (v: unknown): string | null => {
  const s = str(v); return s && /^(0|[1-9][0-9]*)$/.test(s) && s.length <= 100 ? s : null;
};
const smallInt = (v: unknown): number | null => {
  const s = str(v);
  if (!s || !/^(0|[1-9][0-9]*)$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
};
export function parseEtherscanTransferCursor(value?: string | null): number | null {
  if (!value) return 1;
  const m = /^etherscan-transfer:([1-9][0-9]{0,5})$/.exec(value);
  if (!m) return null;
  const p = Number(m[1]);
  return p >= 1 && p <= 1000 ? p : null;
}
export function normalizeEtherscanErc20Transfers(
  payload: unknown, wallet: string, tokenAddress: string, page: number,
): EvmTransfersPage | null {
  const root = asRec(payload);
  if (!root || root.status !== "1" || !Array.isArray(root.result) || root.result.length > 100) return null;
  const rows: EvmTransfer[] = [];
  const seen = new Set<string>();
  for (const item of root.result) {
    const rec = asRec(item);
    if (!rec) return null;
    const from = normAddr(rec.from), to = normAddr(rec.to), token = normAddr(rec.contractAddress);
    const transactionHash = str(rec.hash)?.toLowerCase() ?? "";
    const value = rawAmount(rec.value), blockNumber = smallInt(rec.blockNumber);
    const timestampSeconds = smallInt(rec.timeStamp);
    const logIndex = smallInt(rec.logIndex);
    if (!from || !to || !token || !hash.test(transactionHash) || value === null ||
        blockNumber === null || timestampSeconds === null || logIndex === null ||
        token !== tokenAddress || (from !== wallet && to !== wallet)) return null;
    const millis = timestampSeconds * 1000;
    if (!Number.isSafeInteger(millis) || !Number.isFinite(new Date(millis).getTime())) return null;
    const id = `${transactionHash}:${logIndex}`;
    if (seen.has(id)) return null;
    seen.add(id);
    rows.push({transactionHash, blockNumber, timestamp: new Date(millis).toISOString(),
      from, to, tokenAddress: token, value});
  }
  // Etherscan returns a stable page number but not an authoritative last-page indicator.
  // A full page may have more; never forge a continuation for a partial page.
  return {transfers: rows, nextCursor: rows.length === 100 && page < 1000 ? `etherscan-transfer:${page + 1}` : null};
}

export class EtherscanTransfersProvider implements EvmTransfersProvider {
  readonly id = "etherscan" as const;
  readonly capabilities = capabilities;
  supportsNetwork(network: EvmNetworkContext): boolean {
    return chains.get(network.networkId) === network.chainId;
  }
  supportsCapability(capability: ProviderCapability): boolean {return capability === "tokenTransfers";}
  async getTokenTransfers(request: EvmTokenTransfersRequest): Promise<EvmProviderResult<EvmTransfersPage>> {
    const failure = (code: "UPSTREAM_ERROR" | "TIMEOUT" | "RATE_LIMITED" | "INVALID_ADDRESS" | "INVALID_TOKEN_ADDRESS") =>
      ({ok: false as const, providerId: this.id, latencyMs: null, code,
        error: `Etherscan ERC-20 transfer evidence unavailable (${code}).`});
    if (!this.supportsNetwork(request.network)) return {ok: false, providerId: this.id, latencyMs: null,
      code: "UNSUPPORTED_NETWORK", error: "Etherscan transfer adapter is not certified for this network."};
    const wallet = normAddr(request.address), token = normAddr(request.tokenAddress);
    if (!wallet) return failure("INVALID_ADDRESS");
    if (!token) return failure("INVALID_TOKEN_ADDRESS");
    const page = parseEtherscanTransferCursor(request.cursor);
    if (page === null || (request.limit !== undefined && request.limit !== 100)) return failure("UPSTREAM_ERROR");
    const key = process.env.ETHERSCAN_API_KEY?.trim();
    if (!key) return failure("UPSTREAM_ERROR");
    const url = new URL("https://api.etherscan.io/v2/api");
    for (const [k, v] of Object.entries({chainid: String(request.network.chainId), module: "account", action: "tokentx",
      address: wallet, contractaddress: token, sort: "desc", page: String(page), offset: "100", apikey: key})) {
      url.searchParams.set(k, v);
    }
    const c = new AbortController();
    const abort = () => c.abort();
    if (request.signal?.aborted) return failure("TIMEOUT");
    request.signal?.addEventListener("abort", abort, {once: true});
    const timer = setTimeout(abort, 12000);
    const start = performance.now();
    try {
      const response = await providerUsageFetch({provider: "etherscan", operation: "evm.transfers"},
        url, () => fetch(url, {cache: "no-store", redirect: "error", signal: c.signal}));
      const latencyMs = Math.round(performance.now() - start);
      if (response.status === 429) return {...failure("RATE_LIMITED"), latencyMs};
      if (!response.ok) return {...failure("UPSTREAM_ERROR"), latencyMs};
      if (Number(response.headers.get("content-length") || 0) > maxBytes) return {...failure("UPSTREAM_ERROR"), latencyMs};
      const reader = response.body?.getReader();
      if (!reader) return {...failure("UPSTREAM_ERROR"), latencyMs};
      const chunks: Uint8Array[] = []; let bytes = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > maxBytes) {await reader.cancel(); return {...failure("UPSTREAM_ERROR"), latencyMs};}
        chunks.push(chunk.value);
      }
      const root: unknown = JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(Buffer.concat(chunks)));
      const obj = asRec(root);
      // V2 reports status=0 for both "No transactions found" and API failures;
      // only the exact known no-results response is a valid empty page.
      if (obj?.status === "0" && obj.message === "No transactions found" &&
          (obj.result === "" || (Array.isArray(obj.result) && obj.result.length === 0))) {
        return {ok: true, providerId: this.id, latencyMs, data: {transfers: [], nextCursor: null}};
      }
      if (obj?.status === "0" && /rate limit/i.test(String(obj.result))) return {...failure("RATE_LIMITED"), latencyMs};
      const normalized = normalizeEtherscanErc20Transfers(root, wallet, token, page);
      if (!normalized) return {...failure("UPSTREAM_ERROR"), latencyMs};
      return {ok: true, providerId: this.id, latencyMs, data: normalized};
    } catch {return {...failure(c.signal.aborted ? "TIMEOUT" : "UPSTREAM_ERROR"), latencyMs: Math.round(performance.now() - start)};}
    finally {clearTimeout(timer); request.signal?.removeEventListener("abort", abort);}
  }
}
export const etherscanTransfersProvider = new EtherscanTransfersProvider();
