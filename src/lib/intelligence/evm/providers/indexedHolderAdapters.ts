import { createHmac, timingSafeEqual } from "node:crypto";
import { alchemyEvmProvider } from "./alchemy";
import { isIndexedHolderCanaryAllowed } from "./indexedHolderCanary";
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
  ethereum: 1, // Preview-only through preferredHolders canary; never a production cutover.
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
// All public indexed holder continuations are network- and token-bound HMAC cursors.
// The adapter remains Preview/local-only.
const ETH_CURSOR_TTL_MS = 15 * 60 * 1000;
const ETH_CURSOR_DOMAIN = "AYZO/blockscout/holders/cursor/v2\n";
type EthereumHolderCursorClaims = {
  v: 1;
  c: 1;
  a: string;
  n: string;
  iat: number;
  p: JsonObject;
};
function ethereumCursorKey(): string | null {
  const key = process.env.AYZO_HOLDER_CURSOR_SIGNING_KEY;
  return typeof key === "string" && /^[a-f0-9]{64}$/.test(key) ? key : null;
}
function ethereumCursorSignature(claims: EthereumHolderCursorClaims, key: string): Buffer {
  return createHmac("sha256", key)
    .update(ETH_CURSOR_DOMAIN, "utf8")
    .update(JSON.stringify(claims), "utf8")
    .digest();
}
function signEthereumHolderCursor(raw: string, token: string, network: string): string | null {
  const key = ethereumCursorKey();
  const page = obj(readCursor("blockscout", raw));
  if (!key || !page || !ADDRESS.test(token)) return null;
  const claims: EthereumHolderCursorClaims = {
    v: 1, c: 1, a: token.toLowerCase(), n: network, iat: Date.now(), p: page,
  };
  const s = ethereumCursorSignature(claims, key).toString("base64url");
  const result = `blockscout:${Buffer.from(JSON.stringify({ ...claims, s }), "utf8").toString("base64url")}`;
  return result.length <= 2200 ? result : null;
}
function verifyEthereumHolderCursor(cursor: string, token: string, network: string): JsonObject | undefined {
  const key = ethereumCursorKey();
  const envelope = obj(readCursor("blockscout", cursor));
  if (!key || !envelope || !ADDRESS.test(token) ||
    Object.keys(envelope).sort().join(",") !== "a,c,iat,n,p,s,v" ||
    envelope.v !== 1 || envelope.c !== 1 || envelope.a !== token.toLowerCase() || envelope.n !== network ||
    typeof envelope.iat !== "number" || !Number.isSafeInteger(envelope.iat) ||
    typeof envelope.s !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(envelope.s) ||
    !obj(envelope.p)) return undefined;
  const now = Date.now();
  if (envelope.iat > now + 30_000 || now - envelope.iat > ETH_CURSOR_TTL_MS) return undefined;
  const claims: EthereumHolderCursorClaims = {
    v: 1, c: 1, a: envelope.a, n: network, iat: envelope.iat, p: envelope.p as JsonObject,
  };
  const actual = Buffer.from(envelope.s, "base64url");
  const expected = ethereumCursorSignature(claims, key);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return undefined;
  return claims.p;
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
  options?: Readonly<{ canonicalSupply: string; omitPercentages: boolean }>,
): EvmTokenHolders | null {
  const root = obj(holderPayload), token = obj(tokenPayload);
  if (!root || !token || !Array.isArray(root.items) || root.items.length > limit) return null;
  const supply = rawUint(options?.canonicalSupply ?? token.total_supply);
  if (!supply || BigInt(supply) <= 0n) return null;
  const holders: EvmTokenHolder[] = [];
  let previousBalance: bigint | null = null;
  for (const item of root.items) {
    const row = obj(item);
    const address = obj(row?.address)?.hash ?? row?.address_hash;
    const addr = typeof address === "string" ? address.toLowerCase() : "";
    const balance = rawUint(row?.value);
    if (!ADDRESS.test(addr) || balance === null) return null;
    const currentBalance = BigInt(balance);
    // Do not sort an unordered provider page into a plausible-looking TOP list.
    if (previousBalance !== null && currentBalance > previousBalance) return null;
    previousBalance = currentBalance;
    const p = percentage(balance, supply);
    if (p === null) return null;
    // A stale indexed snapshot must never fabricate current concentration data.
    holders.push({address: addr, balance, percentage: options?.omitPercentages ? null : p});
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
/**
 * An explicitly bounded preview-only escape hatch for OPTIMISM WETH metadata lag.
 * A valid 100-row indexed balance list can be shown, but we must withhold both
 * percentages and totalSupply when indexer and chain state are not reconciled.
 * The exception is restricted to WETH on Optimism, one basis point maximum,
 * and never applies to production (the existing canary gate remains mandatory).
 * Everything else, including a downward supply drift, fails closed.
 */
export function classifyIndexedSupplySnapshot(
  networkId: string, tokenAddress: string, indexedRaw: string, chainHex: string,
): "verified" | "indexed_snapshot_only" | "reject" {
  if (!rawUint(indexedRaw) || BigInt(indexedRaw) <= 0n ||
    !/^0x[0-9a-fA-F]{1,64}$/.test(chainHex)) return "reject";
  const indexed = BigInt(indexedRaw);
  const chain = BigInt(chainHex);
  if (chain <= 0n) return "reject";
  if (chain === indexed) return "verified";
  if (networkId !== "optimism" ||
      tokenAddress.toLowerCase() !== "0x4200000000000000000000000000000000000006" ||
      chain <= indexed ||
      (chain - indexed) * 10_000n > chain) return "reject";
  return "indexed_snapshot_only";
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

    // Defense in depth: ALL indexed Blockscout networks are Preview/development
    // canaries. Direct adapter callers may not bypass the preferred provider gate.
    // The GoldRush exit gate itself is environment-restricted.
    const directIndexedCanaryAllowed = isIndexedHolderCanaryAllowed({
      flag: process.env.AYZO_INDEXED_HOLDER_CANARY,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    });
    if (!directIndexedCanaryAllowed) return fail("UPSTREAM_ERROR");
    // Never issue upstream requests without a strong internal cursor signing key.
    // All public Blockscout Preview networks require strong HMAC signing, before HTTP.
    if (!ethereumCursorKey()) return fail("UPSTREAM_ERROR");
    // This adapter is reached for Ethereum only through the indexed Preview canary.
    const limit = parseLimit(request.limit);
    const cursor = request.cursor
      ? verifyEthereumHolderCursor(request.cursor, request.address, request.network.networkId)
      : null;
    if (limit === null || cursor === undefined || (cursor !== null && !obj(cursor))) return fail("UPSTREAM_ERROR");
    // Fixed allowlist: no dynamic host, API key query or redirects.
    const publicHosts: Readonly<Record<string, string>> = {
      ethereum: "https://eth.blockscout.com",
      optimism: "https://explorer.optimism.io",
      scroll: "https://scrollscan.com",
    };
    const base = publicHosts[request.network.networkId];
    if (!base) return fail("UNSUPPORTED_NETWORK");
    const root = `/api/v2/tokens/${request.address}`;
    const authParams: Record<string, string> = {};
    const headers = { accept: "application/json" };
    // Fetch metadata once; use the same supply snapshot for both indexed pages.
    let token = await getJson(
      this.id, "evm.holders.metadata",
      boundedUrl(base, root, authParams), headers, request.signal,
    );
    if (token.status !== 200) return fail(failureCode(token.status));
    // Strict equality for all tokens except bounded Optimism WETH indexed-only
    // Preview evidence. Re-read BOTH sources when there is a mismatch.
    let supplyEvidence: "verified" | "indexed_snapshot_only" | null = null;
    let verifiedChainSupply: string | null = null;
    let indexedSnapshotSupply: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (request.signal?.aborted) return fail("TIMEOUT");
      const onChain = await alchemyEvmProvider.callContract({
        network: request.network, address: request.address,
        data: "0x18160ddd", signal: request.signal,
      });
      const indexed = rawUint(obj(token.payload)?.total_supply);
      if (!onChain.ok || !indexed || BigInt(indexed) <= 0n ||
        !/^0x[0-9a-fA-F]{1,64}$/.test(onChain.data.result)) {
        console.warn("AYZO_HOLDER_FAILURE", { network: request.network.networkId, stage: "supply_rpc_or_metadata" });
        return fail("UPSTREAM_ERROR");
      }
      const classification = classifyIndexedSupplySnapshot(
        request.network.networkId, request.address, indexed, onChain.data.result,
      );
      if (classification === "verified" || attempt === 1) {
        if (classification === "reject") {
          console.warn("AYZO_HOLDER_FAILURE", { network: request.network.networkId, stage: "supply_mismatch" });
          return fail("UPSTREAM_ERROR");
        }
        supplyEvidence = classification;
        verifiedChainSupply = BigInt(onChain.data.result).toString();
        indexedSnapshotSupply = indexed;
        break;
      }
      // One bounded refresh pair. No network requests to /holders before this.
      token = await getJson(
        this.id, "evm.holders.metadata",
        boundedUrl(base, root, authParams), headers, request.signal,
      );
      if (token.status !== 200) return fail(failureCode(token.status));
    }
    if (!supplyEvidence || !verifiedChainSupply || !indexedSnapshotSupply) return fail("UPSTREAM_ERROR");
    const indexerDrift = supplyEvidence === "indexed_snapshot_only";

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
      const params: Record<string, string> = { ...authParams };
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
          (response.status === 0 || response.status === 429 || response.status >= 500) &&
          (!indexerDrift || collected.reduce((sum, h) => sum + BigInt(h.balance), 0n) <= BigInt(indexedSnapshotSupply))) {
          const clientCursor = signEthereumHolderCursor(continuation, request.address, request.network.networkId);
          if (!clientCursor) return fail("UPSTREAM_ERROR");
          return { ok: true, providerId: this.id,
            latencyMs: Math.round(performance.now() - start),
            data: { holders: collected, totalSupply: indexerDrift ? null : supply,
              totalCount: null, nextCursor: clientCursor, supplyEvidence } };
        }
        return fail(failureCode(response.status));
      }

      // Per-page parser validates addresses, raw integer balances, percentages,
      // duplicate addresses and bounded cursor structure.
      const parsed = decodeBlockscoutHolders(
        response.payload, token.payload, limit,
        indexerDrift ? {canonicalSupply: verifiedChainSupply, omitPercentages: true} : undefined,
      );
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

    const totalIndexedBalances = collected.reduce((sum, h) => sum + BigInt(h.balance), 0n);
    if (!supply || collected.length === 0 ||
      totalIndexedBalances > BigInt(supply) ||
      (indexerDrift && totalIndexedBalances > BigInt(indexedSnapshotSupply))) {
      return fail("UPSTREAM_ERROR");
    }
    const clientCursor = continuation
      ? signEthereumHolderCursor(continuation, request.address, request.network.networkId) : null;
    if (continuation && !clientCursor) return fail("UPSTREAM_ERROR");
    return { ok: true, providerId: this.id,
      latencyMs: Math.round(performance.now() - start),
      data: { holders: collected, totalSupply: indexerDrift ? null : supply,
        totalCount: null, nextCursor: clientCursor, supplyEvidence } };

  }
}
export const routescanHoldersProvider = new RoutescanHoldersProvider();
export const blockscoutHoldersProvider = new BlockscoutHoldersProvider();
