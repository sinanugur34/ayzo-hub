import { providerUsageFetch } from "@/lib/providerUsageHttpCore";

export type EtherscanProbeNetwork = "ethereum" | "sonic" | "mantle";
export type EtherscanProbeOutcome =
  | "AVAILABLE"
  | "PLAN_RESTRICTED"
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "NETWORK_FAILURE"
  | "HTTP_ERROR"
  | "INVALID_RESPONSE"
  | "KEY_MISSING";

export type EtherscanProbeResult = Readonly<{
  network: EtherscanProbeNetwork;
  chainId: number;
  provider: "etherscan";
  operation: "proxy.eth_blockNumber";
  outcome: EtherscanProbeOutcome;
  httpStatus: number | null;
  durationMs: number;
}>;

type ProbeOptions = Readonly<{
  apiKey?: string;
  transport?: typeof fetch;
  timeoutMs?: number;
}>;

const chainIds = { ethereum: 1, sonic: 146, mantle: 5000 } as const;
const MAX_BYTES = 32 * 1024;
const BLOCK = /^0x[0-9a-fA-F]{1,32}$/;

export function classifyEtherscanProbeMessage(value: unknown): EtherscanProbeOutcome {
  if (typeof value !== "string") return "INVALID_RESPONSE";
  // Inspect only the category, never return, store, or log upstream messages.
  const message = value.toLowerCase().slice(0, 1024);
  if (/free api access.*not support|not supported for this chain|paid plan|upgrade.*plan|plan.*required|higher api plan|pro endpoint/.test(message)) {
    return "PLAN_RESTRICTED";
  }
  if (/invalid api key|invalid apikey|api key.*invalid|missing api key/.test(message)) {
    return "INVALID_CREDENTIALS";
  }
  if (/rate limit|too many requests|max rate/.test(message)) {
    return "RATE_LIMITED";
  }
  return "INVALID_RESPONSE";
}

export async function probeEtherscanNetwork(
  network: EtherscanProbeNetwork,
  options: ProbeOptions = {},
): Promise<EtherscanProbeResult> {
  const chainId = chainIds[network];
  const started = performance.now();
  const result = (outcome: EtherscanProbeOutcome, httpStatus: number | null): EtherscanProbeResult => ({
    network, chainId, provider: "etherscan", operation: "proxy.eth_blockNumber", outcome,
    httpStatus, durationMs: Math.max(0, Math.round(performance.now() - started)),
  });
  const key = (options.apiKey ?? process.env.ETHERSCAN_API_KEY)?.trim();
  if (!key) return result("KEY_MISSING", null);
  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", String(chainId));
  url.searchParams.set("module", "proxy");
  url.searchParams.set("action", "eth_blockNumber");
  url.searchParams.set("apikey", key);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(7000, Math.max(100, options.timeoutMs ?? 7000)));
  let upstreamStatus: number | null = null;
  try {
    const response = await providerUsageFetch(
      { provider: "etherscan", operation: "evm.probe.blockNumber" },
      url,
      () => (options.transport ?? fetch)(url, {
        method: "GET", redirect: "error", cache: "no-store", signal: controller.signal,
      }),
    );
    upstreamStatus = response.status;
    if (response.status === 429) {
      await response.body?.cancel();
      return result("RATE_LIMITED", upstreamStatus);
    }
    if (response.status === 401 || response.status === 403) {
      await response.body?.cancel();
      return result("INVALID_CREDENTIALS", upstreamStatus);
    }
    if (!response.ok) {
      await response.body?.cancel();
      return result("HTTP_ERROR", upstreamStatus);
    }
    const declared = response.headers.get("content-length");
    if (declared && Number(declared) > MAX_BYTES) {
      await response.body?.cancel();
      return result("INVALID_RESPONSE", upstreamStatus);
    }
    const reader = response.body?.getReader();
    if (!reader) return result("INVALID_RESPONSE", upstreamStatus);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > MAX_BYTES) {
        await reader.cancel();
        return result("INVALID_RESPONSE", upstreamStatus);
      }
      chunks.push(part.value);
    }
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
    const json: unknown = JSON.parse(decoded);
    if (!json || typeof json !== "object" || Array.isArray(json)) return result("INVALID_RESPONSE", upstreamStatus);
    const data = json as Record<string, unknown>;
    if (typeof data.result === "string" && BLOCK.test(data.result)) return result("AVAILABLE", upstreamStatus);
    const apiMessage = [data.result, data.message, data.error].filter(x => typeof x === "string").join(" ");
    return result(classifyEtherscanProbeMessage(apiMessage), upstreamStatus);
  } catch {
    return result(controller.signal.aborted ? "TIMEOUT" : "NETWORK_FAILURE", upstreamStatus);
  } finally {
    clearTimeout(timeout);
  }
}
