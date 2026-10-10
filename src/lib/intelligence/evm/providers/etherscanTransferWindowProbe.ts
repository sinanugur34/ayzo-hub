import { providerUsageFetch } from "@/lib/providerUsageHttpCore";

export type WindowNetwork = "sonic" | "mantle";
export type WindowOutcome =
  | "EVENT_WITH_LOG_INDEX" | "EVENT_MISSING_LOG_INDEX" | "EMPTY_WINDOW"
  | "PLAN_RESTRICTED" | "INVALID_CREDENTIALS" | "RATE_LIMITED"
  | "TIMEOUT" | "NETWORK_FAILURE" | "HTTP_ERROR" | "INVALID_RESPONSE" | "KEY_MISSING";

export type WindowProbeResult = Readonly<{
  network: WindowNetwork;
  chainId: 146 | 5000;
  provider: "etherscan";
  operation: "account.tokentx.bounded";
  outcome: WindowOutcome;
  stage: "configuration" | "head" | "transfer";
  httpStatus: number | null;
  durationMs: number;
  windowBlocks: 2048;
  examinedRows: 0 | 1;
  eventHasLogIndex: boolean | null;
}>;

type Options = Readonly<{
  apiKey?: string;
  transport?: typeof fetch;
  timeoutMs?: number;
  signal?: AbortSignal;
}>;

const NET = {
  sonic: { chainId: 146, token: "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38" },
  mantle: { chainId: 5000, token: "0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8" },
} as const;
const MAX_BYTES = 32 * 1024;
const RANGE = 2048 as const;
const ADDR = /^0x[a-fA-F0-9]{40}$/;
const HASH = /^0x[a-fA-F0-9]{64}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const HEX = /^0x[0-9a-fA-F]{1,16}$/;
type Dict = Record<string, unknown>;
const object = (x: unknown): Dict | null =>
  x !== null && typeof x === "object" && !Array.isArray(x) ? x as Dict : null;

// Only categories leave the server. Never return API keys, request URLs,
// upstream bodies, free-form messages, token amounts, or wallet identifiers.
function apiError(text: unknown): WindowOutcome {
  const s = typeof text === "string" ? text.toLowerCase().slice(0, 1000) : "";
  if (/free api access.*not support|not supported for this chain|paid plan|upgrade.*plan|plan.*required|higher api plan|pro endpoint/.test(s)) return "PLAN_RESTRICTED";
  if (/invalid api key|invalid apikey|api key.*invalid|missing api key/.test(s)) return "INVALID_CREDENTIALS";
  if (/rate limit|too many requests|max rate/.test(s)) return "RATE_LIMITED";
  return "INVALID_RESPONSE";
}

type FetchResult = { payload: unknown; http: number | null; outcome: WindowOutcome | null };
async function boundedFetch(url: URL, operation: string, options: Options): Promise<FetchResult> {
  const c = new AbortController();
  const abort = () => c.abort();
  if (options.signal?.aborted) return { payload: null, http: null, outcome: "TIMEOUT" };
  options.signal?.addEventListener("abort", abort, { once: true });
  // <= 5 seconds per operation, 10 seconds total maximum (before app overhead).
  const timer = setTimeout(abort, Math.min(5000, Math.max(100, options.timeoutMs ?? 5000)));
  let http: number | null = null;
  try {
    const response = await providerUsageFetch(
      { provider: "etherscan", operation }, url,
      () => (options.transport ?? fetch)(url, {
        method: "GET", cache: "no-store", redirect: "error", signal: c.signal,
      }),
    );
    http = response.status;
    if (http === 429) { await response.body?.cancel(); return {payload:null,http,outcome:"RATE_LIMITED"}; }
    if (http === 401 || http === 403) { await response.body?.cancel(); return {payload:null,http,outcome:"INVALID_CREDENTIALS"}; }
    if (!response.ok) { await response.body?.cancel(); return {payload:null,http,outcome:"HTTP_ERROR"}; }
    const declared = response.headers.get("content-length");
    if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BYTES)) {
      await response.body?.cancel(); return {payload:null,http,outcome:"INVALID_RESPONSE"};
    }
    const reader = response.body?.getReader();
    if (!reader) return {payload:null,http,outcome:"INVALID_RESPONSE"};
    let bytes = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_BYTES) { await reader.cancel(); return {payload:null,http,outcome:"INVALID_RESPONSE"}; }
      chunks.push(part.value);
    }
    const payload: unknown = JSON.parse(new TextDecoder("utf-8", {fatal:true}).decode(Buffer.concat(chunks)));
    return {payload,http,outcome:null};
  } catch {
    return {payload:null,http,outcome:c.signal.aborted ? "TIMEOUT" : "NETWORK_FAILURE"};
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}

export async function probeEtherscanTransferWindow(
  network: WindowNetwork,
  options: Options = {},
): Promise<WindowProbeResult> {
  const config = NET[network];
  const started = performance.now();
  const result = (
    outcome: WindowOutcome,
    stage: WindowProbeResult["stage"],
    httpStatus: number | null,
    examinedRows: 0 | 1 = 0,
    eventHasLogIndex: boolean | null = null,
  ): WindowProbeResult => ({
    network, chainId: config.chainId, provider:"etherscan", operation:"account.tokentx.bounded",
    outcome, stage, httpStatus, durationMs: Math.round(performance.now() - started),
    windowBlocks:RANGE, examinedRows, eventHasLogIndex,
  });
  const key = (options.apiKey ?? process.env.ETHERSCAN_API_KEY)?.trim();
  if (!key) return result("KEY_MISSING", "configuration", null);
  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("apikey", key);
  url.searchParams.set("chainid", String(config.chainId));
  url.searchParams.set("module", "proxy");
  url.searchParams.set("action", "eth_blockNumber");
  const head = await boundedFetch(url, "evm.probe.transferWindow.head", options);
  if (head.outcome) return result(head.outcome, "head", head.http);
  const h = object(head.payload);
  if (!h || typeof h.result !== "string" || !HEX.test(h.result)) {
    return result(apiError([h?.result, h?.message, h?.error].filter(x => typeof x === "string").join(" ")), "head", head.http);
  }
  const current = Number.parseInt(h.result, 16);
  if (!Number.isSafeInteger(current) || current < 0) return result("INVALID_RESPONSE", "head", head.http);
  const start = Math.max(0, current - RANGE + 1);
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "tokentx");
  url.searchParams.set("contractaddress", config.token);
  url.searchParams.set("startblock", String(start));
  url.searchParams.set("endblock", String(current));
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", "1");
  url.searchParams.set("sort", "desc");
  const transfer = await boundedFetch(url, "evm.probe.transferWindow.oneRow", options);
  if (transfer.outcome) return result(transfer.outcome, "transfer", transfer.http);
  const root = object(transfer.payload);
  if (!root) return result("INVALID_RESPONSE", "transfer", transfer.http);
  if (root.status === "0") {
    if (root.message === "No transactions found" &&
        (root.result === "" || (Array.isArray(root.result) && root.result.length === 0))) {
      return result("EMPTY_WINDOW", "transfer", transfer.http);
    }
    return result(apiError([root.result,root.message,root.error].filter(x => typeof x === "string").join(" ")),"transfer",transfer.http);
  }
  if (root.status !== "1" || !Array.isArray(root.result) || root.result.length !== 1) {
    return result("INVALID_RESPONSE", "transfer", transfer.http);
  }
  const item = object(root.result[0]);
  if (!item || typeof item.hash !== "string" || !HASH.test(item.hash) ||
      typeof item.from !== "string" || !ADDR.test(item.from) ||
      typeof item.to !== "string" || !ADDR.test(item.to) ||
      typeof item.contractAddress !== "string" || item.contractAddress.toLowerCase() !== config.token ||
      typeof item.value !== "string" || !DECIMAL.test(item.value) || item.value.length > 100 ||
      typeof item.blockNumber !== "string" || !DECIMAL.test(item.blockNumber) ||
      typeof item.timeStamp !== "string" || !DECIMAL.test(item.timeStamp)) {
    return result("INVALID_RESPONSE", "transfer", transfer.http);
  }
  const block = Number(item.blockNumber);
  const stamp = Number(item.timeStamp);
  if (!Number.isSafeInteger(block) || block < start || block > current ||
      !Number.isSafeInteger(stamp) || !Number.isFinite(new Date(stamp * 1000).getTime())) {
    return result("INVALID_RESPONSE", "transfer", transfer.http);
  }
  const log = item.logIndex;
  if (log === undefined || log === null) return result("EVENT_MISSING_LOG_INDEX", "transfer", transfer.http, 1, false);
  if (typeof log !== "string" || !DECIMAL.test(log) || !Number.isSafeInteger(Number(log))) {
    return result("INVALID_RESPONSE", "transfer", transfer.http);
  }
  return result("EVENT_WITH_LOG_INDEX", "transfer", transfer.http, 1, true);
}
