import { providerUsageFetch } from "@/lib/providerUsageHttpCore";

export type CorrelationNetwork = "sonic" | "mantle";
export type CorrelationOutcome =
  | "MATCHED_SINGLE_LOG" | "AMBIGUOUS_MATCH" | "NO_MATCH"
  | "TRUNCATED_LOG_RESULTS" | "EVENT_MISSING_LOG_INDEX"
  | "EMPTY_WINDOW" | "PLAN_RESTRICTED" | "INVALID_CREDENTIALS"
  | "RATE_LIMITED" | "TIMEOUT" | "NETWORK_FAILURE"
  | "HTTP_ERROR" | "INVALID_RESPONSE" | "KEY_MISSING";
export type CorrelationResult = Readonly<{
  network: CorrelationNetwork;
  chainId: 146 | 5000;
  provider: "etherscan";
  operation: "tokentx+getLogs";
  outcome: CorrelationOutcome;
  stage: "configuration" | "head" | "transfer" | "logs" | "correlation";
  upstreamHttp: number | null;
  durationMs: number;
  transferRows: 0 | 1;
  logRows: number;
  uniqueMatch: boolean;
}>;
type Options = Readonly<{
  apiKey?: string;
  transport?: typeof fetch;
  timeoutMs?: number;
  signal?: AbortSignal;
}>;
const NETWORKS = {
  sonic: { chainId: 146, token: "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38" },
  mantle: { chainId: 5000, token: "0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8" },
} as const;
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;
const UINT = /^(0|[1-9][0-9]*)$/;
const HEX_UINT = /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/;
const DATA = /^0x[0-9a-fA-F]{64}$/;
const MAX_BYTES = 128 * 1024;
const MAX_LOGS = 50;
const WINDOW = 2048;
type Obj = Record<string, unknown>;
function obj(x: unknown): Obj | null {
  return x !== null && typeof x === "object" && !Array.isArray(x) ? x as Obj : null;
}
function boundedInt(raw: unknown): number | null {
  if (typeof raw !== "string" || !(UINT.test(raw) || HEX_UINT.test(raw)) || raw.length > 32) return null;
  try {
    const value = BigInt(raw);
    return value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : null;
  } catch { return null; }
}
function classify(raw: unknown): CorrelationOutcome {
  const s = typeof raw === "string" ? raw.toLowerCase().slice(0, 1200) : "";
  if (/free api access.*not support|not supported for this chain|paid plan|upgrade.*plan|plan.*required|higher api plan|pro endpoint/.test(s)) return "PLAN_RESTRICTED";
  if (/invalid api key|invalid apikey|api key.*invalid|missing api key/.test(s)) return "INVALID_CREDENTIALS";
  if (/rate limit|too many requests|max rate/.test(s)) return "RATE_LIMITED";
  return "INVALID_RESPONSE";
}
function apiOutcome(x: Obj): CorrelationOutcome {
  return classify([x.result, x.message, x.error].filter(v => typeof v === "string").join(" "));
}
function padded(address: string): string {
  return "0x" + "0".repeat(24) + address.slice(2).toLowerCase();
}
function urlFor(chainId: number, key: string, params: Record<string, string>): URL {
  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", String(chainId));
  url.searchParams.set("apikey", key);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return url;
}
type FetchOut = { data: Obj | null; http: number | null; failure: CorrelationOutcome | null };
async function requestJson(url: URL, operation: string, options: Options): Promise<FetchOut> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) return {data:null,http:null,failure:"TIMEOUT"};
  options.signal?.addEventListener("abort", abort, {once:true});
  const timeout = setTimeout(abort, Math.min(5000, Math.max(100, options.timeoutMs ?? 5000)));
  let http: number | null = null;
  try {
    const response = await providerUsageFetch(
      {provider:"etherscan",operation}, url,
      () => (options.transport ?? fetch)(url, {
        method:"GET",cache:"no-store",redirect:"error",signal:controller.signal,
      }),
    );
    http = response.status;
    if (http === 429) { await response.body?.cancel(); return {data:null,http,failure:"RATE_LIMITED"}; }
    if (http === 401 || http === 403) { await response.body?.cancel(); return {data:null,http,failure:"INVALID_CREDENTIALS"}; }
    if (!response.ok) { await response.body?.cancel(); return {data:null,http,failure:"HTTP_ERROR"}; }
    const size = response.headers.get("content-length");
    if (size && (!UINT.test(size) || Number(size) > MAX_BYTES)) {
      await response.body?.cancel(); return {data:null,http,failure:"INVALID_RESPONSE"};
    }
    const reader = response.body?.getReader();
    if (!reader) return {data:null,http,failure:"INVALID_RESPONSE"};
    const chunks: Uint8Array[] = []; let total = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > MAX_BYTES) {await reader.cancel();return {data:null,http,failure:"INVALID_RESPONSE"};}
      chunks.push(part.value);
    }
    const decoded = new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(chunks));
    const data = obj(JSON.parse(decoded));
    return data ? {data,http,failure:null} : {data:null,http,failure:"INVALID_RESPONSE"};
  } catch {
    return {data:null,http,failure:controller.signal.aborted ? "TIMEOUT" : "NETWORK_FAILURE"};
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}
export type TransferWitness = Readonly<{
  transactionHash: string; token: string; from: string; to: string;
  value: string; block: number;
}>;
export function correlateTransferLog(sample: TransferWitness, logs: unknown):
  {outcome: CorrelationOutcome; matched: number; examined: number} {
  if (!Array.isArray(logs) || logs.length > MAX_LOGS) return {outcome:"INVALID_RESPONSE",matched:0,examined:0};
  if (logs.length === MAX_LOGS) return {outcome:"TRUNCATED_LOG_RESULTS",matched:0,examined:MAX_LOGS};
  let matches = 0;
  const indices = new Set<number>();
  for (const raw of logs) {
    const log = obj(raw);
    const logIndex = boundedInt(log?.logIndex);
    if (!log || typeof log.address !== "string" || !ADDRESS.test(log.address) ||
      typeof log.transactionHash !== "string" || !HASH.test(log.transactionHash) ||
      typeof log.data !== "string" || !DATA.test(log.data) ||
      !Array.isArray(log.topics) || log.topics.length !== 3 ||
      log.topics.some(topic => typeof topic !== "string" || !DATA.test(topic)) ||
      boundedInt(log.blockNumber) === null || logIndex === null) {
      return {outcome:"INVALID_RESPONSE",matched:0,examined:logs.length};
    }
    if (logIndex === null) return {outcome:"INVALID_RESPONSE",matched:0,examined:logs.length};
    if (indices.has(logIndex)) return {outcome:"INVALID_RESPONSE",matched:0,examined:logs.length};
    indices.add(logIndex);
    const topics = log.topics as string[];
    if (log.address.toLowerCase() !== sample.token ||
      topics[0].toLowerCase() !== TRANSFER_TOPIC ||
      topics[1].toLowerCase() !== padded(sample.from) ||
      topics[2].toLowerCase() !== padded(sample.to) ||
      log.transactionHash.toLowerCase() !== sample.transactionHash ||
      boundedInt(log.blockNumber) !== sample.block ||
      BigInt(log.data).toString() !== sample.value) continue;
    matches++;
  }
  return {outcome:matches === 1 ? "MATCHED_SINGLE_LOG" :
    matches > 1 ? "AMBIGUOUS_MATCH" : "NO_MATCH", matched:matches, examined:logs.length};
}
export async function probeEtherscanLogCorrelation(
  network: CorrelationNetwork, options: Options = {},
): Promise<CorrelationResult> {
  const settings = NETWORKS[network];
  const since = performance.now();
  const build = (outcome: CorrelationOutcome, stage: CorrelationResult["stage"], upstreamHttp: number | null,
    transferRows: 0 | 1 = 0, logRows = 0): CorrelationResult => ({
    network,chainId:settings.chainId,provider:"etherscan",operation:"tokentx+getLogs",
    outcome,stage,upstreamHttp,durationMs:Math.round(performance.now()-since),
    transferRows,logRows,uniqueMatch:outcome === "MATCHED_SINGLE_LOG",
  });
  const key = (options.apiKey ?? process.env.ETHERSCAN_API_KEY)?.trim();
  if (!key) return build("KEY_MISSING","configuration",null);
  const head = await requestJson(urlFor(settings.chainId,key,{module:"proxy",action:"eth_blockNumber"}),"evm.probe.logCorrelation.head",options);
  if (head.failure) return build(head.failure,"head",head.http);
  const number = boundedInt(head.data?.result);
  if (number === null) return build(apiOutcome(head.data!),"head",head.http);
  const startBlock = Math.max(0, number - WINDOW + 1);
  const tx = await requestJson(urlFor(settings.chainId,key,{
    module:"account",action:"tokentx",contractaddress:settings.token,
    startblock:String(startBlock),endblock:String(number),page:"1",offset:"1",sort:"desc",
  }),"evm.probe.logCorrelation.transfer",options);
  if (tx.failure) return build(tx.failure,"transfer",tx.http);
  const rows = tx.data?.result;
  if (tx.data?.status === "0" && tx.data?.message === "No transactions found" &&
    (rows === "" || (Array.isArray(rows) && rows.length === 0))) {
    return build("EMPTY_WINDOW","transfer",tx.http);
  }
  if (tx.data?.status !== "1") return build(apiOutcome(tx.data!),"transfer",tx.http);
  if (!Array.isArray(rows) || rows.length !== 1) return build("INVALID_RESPONSE","transfer",tx.http);
  const row = obj(rows[0]);
  const block = boundedInt(row?.blockNumber);
  if (!row || block === null || block < startBlock || block > number ||
      typeof row.hash !== "string" || !HASH.test(row.hash) ||
      typeof row.from !== "string" || !ADDRESS.test(row.from) ||
      typeof row.to !== "string" || !ADDRESS.test(row.to) ||
      typeof row.contractAddress !== "string" || row.contractAddress.toLowerCase() !== settings.token ||
      typeof row.value !== "string" || !UINT.test(row.value) || row.value.length > 100 ||
      boundedInt(row.timeStamp) === null) {
    return build("INVALID_RESPONSE","transfer",tx.http);
  }
  const witness: TransferWitness = {
    transactionHash:row.hash.toLowerCase(),from:row.from.toLowerCase(),to:row.to.toLowerCase(),
    token:settings.token,value:row.value,block,
  };
  const log = await requestJson(urlFor(settings.chainId,key,{
    module:"logs",action:"getLogs",address:settings.token,
    fromBlock:String(block),toBlock:String(block),
    topic0:TRANSFER_TOPIC,topic1:padded(witness.from),topic2:padded(witness.to),
    topic0_1_opr:"and",topic1_2_opr:"and",page:"1",offset:String(MAX_LOGS),
  }),"evm.probe.logCorrelation.logs",options);
  if (log.failure) return build(log.failure,"logs",log.http,1);
  if (log.data?.status === "0") return build(apiOutcome(log.data!),"logs",log.http,1);
  if (log.data?.status !== "1" || !Array.isArray(log.data.result)) return build("INVALID_RESPONSE","logs",log.http,1);
  const found = correlateTransferLog(witness,log.data.result);
  return build(found.outcome,"correlation",log.http,1,found.examined);
}
