import { alchemyEvmProvider } from "./alchemy";
import type {
  ProviderCapability,
} from "@/lib/providers/types";
import {
  providerUsageFetch,
} from "@/lib/providerUsageHttpCore";
import type {
  EvmPaginatedAddressRequest,
  EvmTokenHoldersProvider,
} from "../provider";
import type {
  EvmNetworkContext,
  EvmProviderErrorCode,
  EvmProviderResult,
  EvmTokenHolder,
  EvmTokenHolders,
} from "../types";

type JsonObject = Record<string, unknown>;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const UINT = /^(?:0|[1-9]\d*)$/;
const CAPABILITIES = ["tokenHolders"] as const satisfies readonly ProviderCapability[];
const ROUTESCAN_IDS: Readonly<Record<string, number>> = {
  ethereum: 1,
  mantle: 5000,
};
const BLOCKSCOUT_IDS: Readonly<Record<string, number>> = {
  optimism: 10,
  scroll: 534352,
};
const MAX_BYTES = 512 * 1024;
const MAX_PAGE_SIZE = 100;
const TIMEOUT_MS = 12_000;

function obj(x: unknown): JsonObject | null {
  return x !== null && typeof x === "object" && !Array.isArray(x)
    ? x as JsonObject : null;
}
function count(x: unknown): number | null {
  return typeof x === "number" && Number.isSafeInteger(x) && x >= 0 ? x : null;
}
function rawUint(x: unknown): string | null {
  if (typeof x !== "string" || x.length > 120 || !UINT.test(x)) return null;
  return x;
}
function percentage(balance: string, supply: string): number | null {
  const denom = BigInt(supply);
  if (denom <= 0n) return null;
  const value = BigInt(balance);
  // Reject impossible raw balances before fixed-point truncation.
  // A balance just one unit over a large supply can otherwise round to 100%.
  if (value > denom) return null;
  const fixed = (value * 100_000_000n) / denom;
  const result = Number(fixed) / 1_000_000;
  return Number.isFinite(result) && result >= 0 && result <= 100 ? result : null;
}
function sortedUnique(holders: EvmTokenHolder[]): EvmTokenHolder[] | null {
  const seen = new Set<string>();
  for (const h of holders) {
    if (seen.has(h.address)) return null;
    seen.add(h.address);
  }
  return holders.sort((a, b) => {
    const av = BigInt(a.balance), bv = BigInt(b.balance);
    return av === bv ? a.address.localeCompare(b.address) : av > bv ? -1 : 1;
  });
}
function failure(providerId: "routescan" | "blockscout", code: EvmProviderErrorCode,
  latencyMs: number | null): EvmProviderResult<EvmTokenHolders> {
  return { ok: false, providerId, code, latencyMs,
    error: `Verified ${providerId} holder evidence could not be obtained (${code}).` };
}
function parseLimit(limit?: number): number | null {
  const n = limit ?? 100;
  return Number.isInteger(n) && n >= 1 && n <= MAX_PAGE_SIZE ? n : null;
}
function makeCursor(provider: "routescan" | "blockscout", data: unknown): string | null {
  const raw = JSON.stringify(data);
  if (!raw || raw.length > 1500) return null;
  return `${provider}:` + Buffer.from(raw, "utf8").toString("base64url");
}
function readCursor(provider: "routescan" | "blockscout", cursor?: string | null): unknown {
  if (!cursor) return null;
  const prefix = `${provider}:`;
  if (!cursor.startsWith(prefix) || cursor.length > 2200 || !/^[a-zA-Z0-9_-]+$/.test(cursor.slice(prefix.length))) {
    return undefined;
  }
  try { return JSON.parse(Buffer.from(cursor.slice(prefix.length), "base64url").toString("utf8")); }
  catch { return undefined; }
}
function boundedUrl(base: string, path: string, params: Record<string, string>): URL {
  const url = new URL(path, base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}
async function getJson(
  provider: "routescan" | "blockscout", operation: string, url: URL,
  headers: HeadersInit, signal?: AbortSignal,
): Promise<{status: number; payload: unknown} | {status: 0; payload: null}> {
  const c = new AbortController();
  const abort = () => c.abort();
  if (signal?.aborted) return {status: 0, payload: null};
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, TIMEOUT_MS);
  try {
    const response = await providerUsageFetch(
      {provider, operation}, url,
      () => fetch(url, {method: "GET", headers, cache: "no-store", redirect: "error", signal: c.signal})
    );
    if (!response.ok) { await response.body?.cancel(); return {status: response.status, payload: null}; }
    if (Number(response.headers.get("content-length") || "0") > MAX_BYTES) {
      await response.body?.cancel(); return {status: 0, payload: null};
    }
    const reader = response.body?.getReader();
    if (!reader) return {status: 0, payload: null};
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_BYTES) { await reader.cancel(); return {status: 0, payload: null}; }
      chunks.push(part.value);
    }
    const payload = JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(Buffer.concat(chunks)));
    return {status: response.status, payload};
  } catch { return {status: 0, payload: null}; }
  finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}
function failureCode(status: number): EvmProviderErrorCode {
  return status === 429 ? "RATE_LIMITED" : status === 0 ? "TIMEOUT" : "UPSTREAM_ERROR";
}

/** Pure parser. A missing percentage is NOT interpreted as 0% concentration. */
export function decodeRoutescanHolders(
  payload: unknown, expectedChainId: number, limit: number, tokenAddress?: string | null, totalSupply?: string | null,
): EvmTokenHolders | null {
  const root = obj(payload);
  if (!root || !Array.isArray(root.items) || root.items.length > limit) return null;
  const holders: EvmTokenHolder[] = [];
  for (const item of root.items) {
    const row = obj(item);
    const balance = rawUint(row?.balance);
    const addr = typeof row?.address === "string" ? row.address.toLowerCase() : "";
    const supplied = row?.percentage;
    const computed = totalSupply && balance !== null ? percentage(balance, totalSupply) : null;
    const p = totalSupply ? computed : supplied;
    if (!ADDRESS.test(addr) || balance === null ||
      (row?.chainId !== undefined && String(row.chainId) !== String(expectedChainId)) ||
      typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 100) return null;
    holders.push({address: addr, balance, percentage: p});
  }
  const unique = sortedUnique(holders);
  if (!unique) return null;
  if (totalSupply &&
    unique.reduce((sum, holder) => sum + BigInt(holder.balance), 0n) > BigInt(totalSupply)) {
    return null;
  }
  const link = obj(root.link);
  let next = typeof link?.nextToken === "string" ? link.nextToken : null;
  if (!next && typeof link?.next === "string") {
    try {
      const nextUrl = new URL(link.next, "https://api.routescan.io");
      if (nextUrl.origin === "https://api.routescan.io" &&
        nextUrl.pathname === `/v2/network/mainnet/evm/${expectedChainId}/erc20/${tokenAddress || ""}/holders`) {
        next = nextUrl.searchParams.get("next");
      }
    } catch { /* no cursor */ }
  }
  if (next && (next.length > 1200 || !/^[a-zA-Z0-9_+./=-]+$/.test(next))) return null;
  return {
    holders: unique,
    totalSupply: totalSupply ?? null,
    totalCount: root.countType === "exact" ? count(root.count) : null,
    nextCursor: next ? makeCursor("routescan", next) : null,
  };
}
/** Pure parser. Blockscout supplies raw (unscaled) balances and total_supply. */
export function decodeBlockscoutHolders(
  holderPayload: unknown, tokenPayload: unknown, limit: number,
): EvmTokenHolders | null {
  const root = obj(holderPayload), token = obj(tokenPayload);
  if (!root || !token || !Array.isArray(root.items) || root.items.length > limit) return null;
  const supply = rawUint(token.total_supply);
  if (!supply || BigInt(supply) <= 0n) return null;
  const holders: EvmTokenHolder[] = [];
  for (const item of root.items) {
    const row = obj(item);
    const address = obj(row?.address)?.hash ?? row?.address_hash;
    const addr = typeof address === "string" ? address.toLowerCase() : "";
    const balance = rawUint(row?.value);
    if (!ADDRESS.test(addr) || balance === null) return null;
    const p = percentage(balance, supply);
    if (p === null) return null;
    holders.push({address: addr, balance, percentage: p});
  }
  const unique = sortedUnique(holders);
  if (!unique) return null;
  // Also protect the partial-page return path when page two times out.
  if (unique.reduce((sum, holder) => sum + BigInt(holder.balance), 0n) > BigInt(supply)) {
    return null;
  }
  const nextPage = obj(root.next_page_params);
  let nextCursor: string | null = null;
  if (nextPage && Object.keys(nextPage).length) {
    const allowed = ["address_hash", "value", "items_count", "fiat_value", "holder_count"];
    const entries = Object.entries(nextPage);
    if (entries.some(([k,v]) => !allowed.includes(k) ||
      (typeof v !== "string" && typeof v !== "number" && v !== null) ||
      String(v).length > 180)) return null;
    nextCursor = makeCursor("blockscout", nextPage);
  }
  return {holders: unique, totalSupply: supply, totalCount: null, nextCursor};
}

export class RoutescanHoldersProvider implements EvmTokenHoldersProvider {
  readonly id = "routescan" as const;
  readonly capabilities = CAPABILITIES;
  supportsNetwork(network: EvmNetworkContext) {
    return ROUTESCAN_IDS[network.networkId] === network.chainId;
  }
  supportsCapability(cap: ProviderCapability) { return (CAPABILITIES as readonly string[]).includes(cap); }
  async getTokenHolders(request: EvmPaginatedAddressRequest): Promise<EvmProviderResult<EvmTokenHolders>> {
    const start = performance.now();
    const fail = (code: EvmProviderErrorCode) => failure(this.id, code, Math.round(performance.now() - start));
    if (!this.supportsNetwork(request.network)) return fail("UNSUPPORTED_NETWORK");
    if (!ADDRESS.test(request.address)) return fail("INVALID_ADDRESS");
    const limit = parseLimit(request.limit);
    const cursor = readCursor(this.id, request.cursor);
    if (limit === null || cursor === undefined || (cursor !== null && typeof cursor !== "string")) return fail("UPSTREAM_ERROR");
    const chain = request.network.chainId;
    const url = boundedUrl("https://api.routescan.io", `/v2/network/mainnet/evm/${chain}/erc20/${request.address}/holders`, {
      limit: String(limit), ...(cursor ? {next: cursor} : {}),
    });
    const key = process.env.ROUTESCAN_API_KEY?.trim();
    const headers: Record<string, string> = {accept: "application/json"};
    if (key) headers.apikey = key;
    // On-chain raw supply prevents optional indexer percentages
    // silently becoming zero in AYZO concentration calculations.
    const contract = await alchemyEvmProvider.callContract({
      network: request.network, address: request.address,
      data: "0x18160ddd", signal: request.signal,
    });
    if (!contract.ok || !/^0x[0-9a-fA-F]+$/.test(contract.data.result)) return fail("UPSTREAM_ERROR");
    const totalSupply = BigInt(contract.data.result).toString();
    if (totalSupply === "0") return fail("UPSTREAM_ERROR");
    const res = await getJson(this.id, "evm.holders", url, headers, request.signal);
    if (res.status !== 200) return fail(failureCode(res.status));
    const parsed = decodeRoutescanHolders(res.payload, chain, limit, request.address, totalSupply);
    if (!parsed) return fail("UPSTREAM_ERROR");
    return {ok: true, providerId: this.id, latencyMs: Math.round(performance.now() - start), data: parsed};
  }
}
export class BlockscoutHoldersProvider implements EvmTokenHoldersProvider {
  readonly id = "blockscout" as const;
  readonly capabilities = CAPABILITIES;
  supportsNetwork(network: EvmNetworkContext) {
    return BLOCKSCOUT_IDS[network.networkId] === network.chainId;
  }
  supportsCapability(cap: ProviderCapability) { return (CAPABILITIES as readonly string[]).includes(cap); }
  async getTokenHolders(request: EvmPaginatedAddressRequest): Promise<EvmProviderResult<EvmTokenHolders>> {
    const start = performance.now();
    const fail = (code: EvmProviderErrorCode) => failure(this.id, code, Math.round(performance.now() - start));
    if (!this.supportsNetwork(request.network)) return fail("UNSUPPORTED_NETWORK");
    if (!ADDRESS.test(request.address)) return fail("INVALID_ADDRESS");
    const key = process.env.BLOCKSCOUT_API_KEY?.trim();
    if (!key || !/^proapi_[A-Za-z0-9_-]+$/.test(key)) return fail("UPSTREAM_ERROR");
    const limit = parseLimit(request.limit);
    const cursor = readCursor(this.id, request.cursor);
    if (limit === null || cursor === undefined || (cursor !== null && !obj(cursor))) return fail("UPSTREAM_ERROR");
    const root = `/${request.network.chainId}/api/v2/tokens/${request.address}`;
    const base = "https://api.blockscout.com";
    const headers = { accept: "application/json" };
    // Fetch metadata once; use the same supply snapshot for both indexed pages.
    const token = await getJson(
      this.id, "evm.holders.metadata",
      boundedUrl(base, root, { apikey: key }), headers, request.signal,
    );
    if (token.status !== 200) return fail(failureCode(token.status));

    // Blockscout has a 50-row indexer page. AYZO requests 100 root holders.
    // Fetch at most two pages; never substitute a 50-row page for top 100.
    // Other requested limits preserve the existing bounded single-page behavior.
    const maxPages = limit === 100 ? 2 : 1;
    const collected: EvmTokenHolder[] = [];
    const observed = new Set<string>();
    const cursorHistory = new Set<string>();
    let activeCursor: JsonObject | null = cursor === null ? null : obj(cursor);
    let continuation: string | null = null;
    let supply: string | null = null;
    let lowestBalance: bigint | null = null;

    for (let page = 0; page < maxPages; page++) {
      if (request.signal?.aborted) return fail("TIMEOUT");
      const params: Record<string, string> = { apikey: key };
      const cursorEntries = activeCursor ? Object.entries(activeCursor) : [];
      if (cursorEntries.some(([k, v]) =>
        !["address_hash", "value", "items_count", "fiat_value", "holder_count"].includes(k) ||
        (typeof v !== "string" && typeof v !== "number" && v !== null) ||
        String(v).length > 180
      )) return fail("UPSTREAM_ERROR");
      for (const [k, v] of cursorEntries) if (v !== null) params[k] = String(v);

      const response = await getJson(
        this.id, "evm.holders",
        boundedUrl(base, root + "/holders", params), headers, request.signal,
      );
      if (response.status !== 200) {
        // On transient failure of page two, preserve the verified first 50
        // with its continuation marker and explicit partial-coverage status.
        if (!request.signal?.aborted && collected.length > 0 && continuation &&
          (response.status === 0 || response.status === 429 || response.status >= 500)) {
          return { ok: true, providerId: this.id,
            latencyMs: Math.round(performance.now() - start),
            data: { holders: collected, totalSupply: supply,
              totalCount: null, nextCursor: continuation } };
        }
        return fail(failureCode(response.status));
      }

      // Per-page parser validates addresses, raw integer balances, percentages,
      // duplicate addresses and bounded cursor structure.
      const parsed = decodeBlockscoutHolders(response.payload, token.payload, limit);
      if (!parsed || !parsed.totalSupply || parsed.holders.length === 0) return fail("UPSTREAM_ERROR");
      if (supply !== null && supply !== parsed.totalSupply) return fail("UPSTREAM_ERROR");
      supply = parsed.totalSupply;
      if (collected.length + parsed.holders.length > limit) return fail("UPSTREAM_ERROR");

      for (const holder of parsed.holders) {
        const balance = BigInt(holder.balance);
        if (observed.has(holder.address) ||
          (lowestBalance !== null && balance > lowestBalance)) return fail("UPSTREAM_ERROR");
        observed.add(holder.address);
        collected.push(holder);
        lowestBalance = balance;
      }

      continuation = parsed.nextCursor;
      if (!continuation || collected.length === limit) break;
      if (cursorHistory.has(continuation)) return fail("UPSTREAM_ERROR");
      cursorHistory.add(continuation);
      const decoded = readCursor(this.id, continuation);
      activeCursor = obj(decoded);
      if (!activeCursor) return fail("UPSTREAM_ERROR");
    }

    if (!supply || collected.length === 0 ||
      collected.reduce((sum, h) => sum + BigInt(h.balance), 0n) > BigInt(supply)) {
      return fail("UPSTREAM_ERROR");
    }
    return { ok: true, providerId: this.id,
      latencyMs: Math.round(performance.now() - start),
      data: { holders: collected, totalSupply: supply,
        totalCount: null, nextCursor: continuation } };

  }
}
export const routescanHoldersProvider = new RoutescanHoldersProvider();
export const blockscoutHoldersProvider = new BlockscoutHoldersProvider();
