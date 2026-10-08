import { createHmac, timingSafeEqual } from "node:crypto";
import { providerUsageFetch } from "@/lib/providerUsageHttpCore";
import type { ProviderCapability } from "@/lib/providers/types";
import type { EvmTokenTransfersRequest, EvmTransfersProvider } from "../provider";
import type { EvmNetworkContext, EvmProviderErrorCode, EvmProviderResult, EvmTransfer, EvmTransfersPage } from "../types";

const NETWORKS: Readonly<Record<string, number>> = { sonic: 146, mantle: 5000 };
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;
const TOPIC = /^0x[0-9a-fA-F]{64}$/;
const UINT = /^(?:0|[1-9][0-9]*)$/;
const HEX = /^0x[0-9a-fA-F]+$/;
const WINDOW = 2048;
const PER_DIRECTION = 50;
const MAX_BYTES = 256 * 1024;
const TIMEOUT_MS = 5000;
const CURSOR_PREFIX = "etherscan-log:";
const TTL_MS = 24 * 60 * 60 * 1000;
const CAPS = ["tokenTransfers"] as const satisfies readonly ProviderCapability[];
type Obj = Record<string, unknown>;
type Direction = "outgoing" | "incoming";
export type LogTransferOptions = {
  apiKey?: string;
  cursorSecret?: string;
  transport?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
};
type Cursor = {v: 1; chain: number; subject: string; head: number; end: number; expires: number};
const obj = (v: unknown): Obj | null => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Obj : null;
const address = (v: unknown): string | null => typeof v === "string" && ADDRESS.test(v) ? v.toLowerCase() : null;
const uint = (v: unknown): number | null => {
  if (typeof v !== "string" || v.length > 64 || !(UINT.test(v) || HEX.test(v))) return null;
  try {
    const n = BigInt(v);
    return n >= 0n && n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : null;
  } catch { return null; }
};
const padded = (a: string) => "0x" + "0".repeat(24) + a.slice(2);
const failure = (code: EvmProviderErrorCode, ms: number | null): EvmProviderResult<EvmTransfersPage> => ({
  ok: false, providerId: "etherscan", latencyMs: ms, code,
  error: `Preview-only Etherscan log transfers unavailable (${code}).`,
});
function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
function subjectBinding(chain: number, wallet: string, token: string, secret: string): string {
  // The opaque cursor must not expose wallet or token identifiers, even encoded.
  return sign(`subject:v1:${chain}:${wallet}:${token}`, secret);
}
export function encodeEtherscanLogCursor(state: Cursor, secret: string): string {
  const payload = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
  return `${CURSOR_PREFIX}${payload}.${sign(payload, secret)}`;
}
export function decodeEtherscanLogCursor(raw: string, secret: string, expected: {
  chain: number; wallet: string; token: string; now: number;
}): Cursor | null {
  if (!raw.startsWith(CURSOR_PREFIX) || raw.length > 1000) return null;
  const match = /^etherscan-log:([A-Za-z0-9_-]{12,750})\.([A-Za-z0-9_-]{43})$/.exec(raw);
  if (!match) return null;
  const digest = sign(match[1], secret);
  const a = Buffer.from(digest), b = Buffer.from(match[2]);
  if (a.length !== b.length || !timingSafeEqual(a,b)) return null;
  try {
    const value = obj(JSON.parse(Buffer.from(match[1], "base64url").toString("utf8")));
    if (!value || value.v !== 1 || value.chain !== expected.chain ||
        value.subject !== subjectBinding(expected.chain,expected.wallet,expected.token,secret) ||
        typeof value.head!=="number" || !Number.isSafeInteger(value.head) ||
        typeof value.end!=="number" || !Number.isSafeInteger(value.end) ||
        typeof value.expires!=="number" || !Number.isSafeInteger(value.expires)) return null;
    const head = value.head as number, end = value.end as number, expires = value.expires as number;
    if (head < 0 || end < 0 || end >= head ||
        expires <= expected.now || expires > expected.now + TTL_MS ||
        !Number.isSafeInteger(expected.now)) return null;
    return {v:1,chain:expected.chain,subject:subjectBinding(expected.chain,expected.wallet,expected.token,secret),head,end,expires};
  } catch { return null; }
}

type Api = {json: Obj | null; code: EvmProviderErrorCode | null};
async function api(url: URL, operation: string, options: LogTransferOptions, signal?: AbortSignal): Promise<Api> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) return {json:null, code:"TIMEOUT"};
  signal?.addEventListener("abort", abort, {once:true});
  const timer = setTimeout(abort, Math.min(TIMEOUT_MS, Math.max(100, options.timeoutMs ?? TIMEOUT_MS)));
  try {
    const response = await providerUsageFetch({provider:"etherscan",operation},url,
      () => (options.transport ?? fetch)(url, {method:"GET",cache:"no-store",redirect:"error",signal:controller.signal}));
    if (response.status === 429) {await response.body?.cancel();return {json:null,code:"RATE_LIMITED"};}
    if (!response.ok) {await response.body?.cancel();return {json:null,code:"UPSTREAM_ERROR"};}
    const size = response.headers.get("content-length");
    if (size && (!UINT.test(size) || Number(size)>MAX_BYTES)) {
      await response.body?.cancel();return {json:null,code:"UPSTREAM_ERROR"};
    }
    const reader = response.body?.getReader();
    if (!reader) return {json:null,code:"UPSTREAM_ERROR"};
    const chunks:Uint8Array[]=[];let bytes=0;
    while (true) {
      const part=await reader.read();
      if (part.done) break;
      bytes+=part.value.byteLength;
      if (bytes>MAX_BYTES) {await reader.cancel();return {json:null,code:"UPSTREAM_ERROR"};}
      chunks.push(part.value);
    }
    const parsed:unknown=JSON.parse(new TextDecoder("utf8",{fatal:true}).decode(Buffer.concat(chunks)));
    const value=obj(parsed);
    return value ? {json:value,code:null} : {json:null,code:"UPSTREAM_ERROR"};
  } catch {return {json:null,code:controller.signal.aborted?"TIMEOUT":"UPSTREAM_ERROR"};}
  finally {clearTimeout(timer);signal?.removeEventListener("abort",abort);}
}
function urlFor(chain:number,key:string,params:Record<string,string>): URL {
  const url=new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid",String(chain));url.searchParams.set("apikey",key);
  for (const [k,v] of Object.entries(params)) url.searchParams.set(k,v);
  return url;
}
function parseLog(raw:unknown,dir:Direction,wallet:string,token:string,
  low:number,high:number): {id:string;transfer:EvmTransfer;block:number;index:number}|null {
  const row=obj(raw), topics=row?.topics;
  if (!row || row.removed===true || address(row.address)!==token ||
      typeof row.transactionHash!=="string" || !HASH.test(row.transactionHash) ||
      !Array.isArray(topics) || topics.length!==3 ||
      topics.some(v=>typeof v!=="string" || !TOPIC.test(v)) ||
      typeof row.data!=="string" || !TOPIC.test(row.data)) return null;
  const t=topics as string[];
  if (t[0].toLowerCase()!==TRANSFER ||
      !t[1].toLowerCase().startsWith("0x"+"0".repeat(24)) ||
      !t[2].toLowerCase().startsWith("0x"+"0".repeat(24))) return null;
  const from="0x"+t[1].slice(-40).toLowerCase(),to="0x"+t[2].slice(-40).toLowerCase();
  if (dir==="incoming" ? to!==wallet : from!==wallet) return null;
  const block=uint(row.blockNumber),index=uint(row.logIndex);
  if (block===null || block<low || block>high || index===null) return null;
  let amount:string;
  try {amount=BigInt(row.data).toString(10);} catch {return null;}
  let timestamp:string|null=null;
  if (row.timeStamp!==undefined && row.timeStamp!==null) {
    const secs=uint(row.timeStamp);
    if (secs===null || !Number.isSafeInteger(secs*1000) ||
        !Number.isFinite(new Date(secs*1000).getTime())) return null;
    timestamp=new Date(secs*1000).toISOString();
  }
  const transactionHash=row.transactionHash.toLowerCase();
  return {id:`${transactionHash}:${index}`,block,index,
    transfer:{transactionHash,blockNumber:block,timestamp,from,to,tokenAddress:token,value:amount}};
}
function logs(json:Obj,dir:Direction,wallet:string,token:string,low:number,high:number):
  {data:ReturnType<typeof parseLog>[];code:EvmProviderErrorCode|null} {
  if (json.status==="0") {
    const message=json.message;
    const result=json.result;
    const raw=[result,message].filter(v=>typeof v==="string").join(" ").toLowerCase();
    // Etherscan V2 may use message=NOTOK and result="No records found".
    // Never interpret empty arrays or a generic NOTOK as proof of no records.
    // Known empty signals must be exact; error indicators always win.
    if (/rate limit|too many requests|max rate/.test(raw)) return {data:[],code:"RATE_LIMITED"};
    const exactEmpty=(v:unknown)=>v==="No records found" || v==="No logs found";
    const messageEmpty=exactEmpty(message);
    const resultEmpty=exactEmpty(result);
    const emptyData=(Array.isArray(result) && result.length===0) || result==="";
    if ((messageEmpty && (emptyData || resultEmpty)) ||
        (message==="NOTOK" && resultEmpty)) return {data:[],code:null};
    return {data:[],code:"UPSTREAM_ERROR"};
  }
  if (json.status!=="1" || !Array.isArray(json.result) || json.result.length>=PER_DIRECTION) {
    // A full page may hide additional results. Fail closed, never silently truncate.
    return {data:[],code:"UPSTREAM_ERROR"};
  }
  const parsed=json.result.map(v=>parseLog(v,dir,wallet,token,low,high));
  if (parsed.some(v=>v===null)) return {data:[],code:"UPSTREAM_ERROR"};
  return {data:parsed,code:null};
}

export class EtherscanLogTransfersProvider implements EvmTransfersProvider {
  readonly id="etherscan" as const;
  readonly capabilities=CAPS;
  constructor(private readonly options:LogTransferOptions={}) {}
  supportsNetwork(network:EvmNetworkContext):boolean {
    return NETWORKS[network.networkId]===network.chainId;
  }
  supportsCapability(capability:ProviderCapability):boolean {return capability==="tokenTransfers";}
  async getTokenTransfers(request:EvmTokenTransfersRequest):Promise<EvmProviderResult<EvmTransfersPage>> {
    const started=performance.now();
    const elapsed=()=>Math.max(0,Math.round(performance.now()-started));
    if (!this.supportsNetwork(request.network)) return failure("UNSUPPORTED_NETWORK",null);
    const wallet=address(request.address),token=address(request.tokenAddress);
    if (!wallet) return failure("INVALID_ADDRESS",null);
    if (!token) return failure("INVALID_TOKEN_ADDRESS",null);
    if (request.limit!==undefined && request.limit!==100) return failure("UPSTREAM_ERROR",null);
    const key=(this.options.apiKey??process.env.ETHERSCAN_API_KEY)?.trim();
    const secret=(this.options.cursorSecret??process.env.AYZO_INTERNAL_API_KEY)?.trim();
    if (!key || !secret) return failure("UPSTREAM_ERROR",null);
    const now=(this.options.now??Date.now)();
    if (!Number.isSafeInteger(now)) return failure("UPSTREAM_ERROR",null);
    let head:number,end:number;
    if (request.cursor) {
      const cursor=decodeEtherscanLogCursor(request.cursor,secret,{
        chain:request.network.chainId,wallet,token,now});
      if (!cursor) return failure("UPSTREAM_ERROR",null);
      head=cursor.head;end=cursor.end;
    } else {
      const response=await api(urlFor(request.network.chainId,key,{module:"proxy",action:"eth_blockNumber"}),
        "evm.transfers.logs.head",this.options,request.signal);
      if (response.code) return failure(response.code,elapsed());
      const raw=response.json?.result;
      if (typeof raw!=="string" || !/^0x[0-9a-fA-F]{1,16}$/.test(raw)) return failure("UPSTREAM_ERROR",elapsed());
      const parsed=uint(raw);
      if (parsed===null) return failure("UPSTREAM_ERROR",elapsed());
      head=parsed;end=parsed;
    }
    const low=Math.max(0,end-WINDOW+1);
    const directionRequest=(dir:Direction)=>api(urlFor(request.network.chainId,key,{
      module:"logs",action:"getLogs",address:token,fromBlock:String(low),toBlock:String(end),
      topic0:TRANSFER,...(dir==="outgoing"?{topic1:padded(wallet),topic0_1_opr:"and"}:{topic2:padded(wallet),topic0_2_opr:"and"}),
      page:"1",offset:String(PER_DIRECTION),
    }),`evm.transfers.logs.${dir}`,this.options,request.signal);
    const [outgoing,incoming]=await Promise.all([directionRequest("outgoing"),directionRequest("incoming")]);
    if (outgoing.code || incoming.code) return failure(outgoing.code??incoming.code??"UPSTREAM_ERROR",elapsed());
    if (!outgoing.json || !incoming.json) return failure("UPSTREAM_ERROR",elapsed());
    const o=logs(outgoing.json,"outgoing",wallet,token,low,end);
    const i=logs(incoming.json,"incoming",wallet,token,low,end);
    if (o.code || i.code) return failure(o.code??i.code??"UPSTREAM_ERROR",elapsed());
    const merged=new Map<string,NonNullable<ReturnType<typeof parseLog>>>();
    for (const row of [...o.data,...i.data]) {
      if (!row) return failure("UPSTREAM_ERROR",elapsed());
      const existing=merged.get(row.id);
      if (existing) {
        if (JSON.stringify(existing.transfer)!==JSON.stringify(row.transfer)) return failure("UPSTREAM_ERROR",elapsed());
      } else merged.set(row.id,row);
    }
    const transfers=[...merged.values()]
      .sort((a,b)=>b.block-a.block || b.index-a.index || a.id.localeCompare(b.id))
      .map(x=>x.transfer);
    if (transfers.length>100) return failure("UPSTREAM_ERROR",elapsed());
    const nextCursor=low===0?null:encodeEtherscanLogCursor({v:1,chain:request.network.chainId,
      subject:subjectBinding(request.network.chainId,wallet,token,secret),head,end:low-1,expires:now+TTL_MS},secret);
    return {ok:true,providerId:this.id,latencyMs:elapsed(),data:{transfers,nextCursor}};
  }
}
export const etherscanLogTransfersProvider=new EtherscanLogTransfersProvider();
