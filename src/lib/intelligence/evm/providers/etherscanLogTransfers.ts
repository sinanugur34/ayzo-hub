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
// Initial 2048-block slice can be too dense. Shrink only the newest suffix,
// then issue a signed cursor for precisely the untouched older blocks.
// 2048 -> 512 -> 128 -> 32 -> 8 -> 2 -> 1 = at most 7 attempts (14 RPC calls).
const MAX_CANONICAL_ATTEMPTS = 7;
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
  rpcTransport?: typeof fetch;
  preferCanonicalRpc?: boolean;
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
type TransferSource = "etherscan" | "sonic-rpc" | "mantle-rpc";
const failure = (code: EvmProviderErrorCode, ms: number | null,
  source:TransferSource="etherscan"): EvmProviderResult<EvmTransfersPage> => ({
  ok: false, providerId: source, latencyMs: ms, code,
  error: `Preview-only transfer source unavailable (${code}).`,
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


/* RPC cross-check only when Sonic's indexed log lacks its real logIndex.
   Never synthesize an index or accept a partial set: compare every record
   against the full canonical RPC result for BOTH directions in this window. */
type SonicRepair = {json: Obj | null; code: EvmProviderErrorCode | null; oversized?: boolean};
function eventFingerprint(raw: unknown): string | null {
  const r=obj(raw), ts=r?.topics;
  if(!r || r.removed===true || address(r.address)===null ||
     typeof r.transactionHash!=="string" || !HASH.test(r.transactionHash) ||
     !Array.isArray(ts) || ts.length!==3 ||
     ts.some(t=>typeof t!=="string" || !TOPIC.test(t)) ||
     typeof r.data!=="string" || !TOPIC.test(r.data)) return null;
  const block=uint(r.blockNumber);
  if(block===null) return null;
  return JSON.stringify([block,r.transactionHash.toLowerCase(),
    (r.address as string).toLowerCase(),
    (ts as string[]).map(t=>t.toLowerCase()),r.data.toLowerCase()]);
}
function needsSonicRepair(x: Obj): boolean {
  return x.status==="1" && Array.isArray(x.result) &&
    x.result.some(v=>{
      const r=obj(v);
      return r && (r.logIndex===undefined || r.logIndex===null || r.logIndex==="");
    });
}
async function sonicRpcLogs(dir:Direction,wallet:string,token:string,low:number,high:number,
  options:LogTransferOptions,signal?:AbortSignal,network:"sonic"|"mantle"="sonic"):Promise<SonicRepair>{
  const controller=new AbortController();
  if(signal?.aborted)return {json:null,code:"TIMEOUT"};
  const abort=()=>controller.abort();
  signal?.addEventListener("abort",abort,{once:true});
  const timer=setTimeout(abort,Math.min(TIMEOUT_MS,Math.max(100,options.timeoutMs??TIMEOUT_MS)));
  const url=new URL(network==="sonic"?"https://rpc.soniclabs.com/":"https://rpc.mantle.xyz/");
  const body=JSON.stringify({jsonrpc:"2.0",id:1,method:"eth_getLogs",params:[{
    address:token,fromBlock:`0x${low.toString(16)}`,toBlock:`0x${high.toString(16)}`,
    topics:dir==="outgoing"?[TRANSFER,padded(wallet)]:[TRANSFER,null,padded(wallet)],
  }]});
  try{
    const response=await providerUsageFetch({provider:`${network}-rpc`,operation:`evm.transfers.logs.canonical.${network}.${dir}`},url,
      ()=>(options.rpcTransport??options.transport??fetch)(url,{
        method:"POST",headers:{"content-type":"application/json"},body,
        cache:"no-store",redirect:"error",signal:controller.signal,
      }));
    if(response.status===429){await response.body?.cancel();return {json:null,code:"RATE_LIMITED"};}
    if(!response.ok){await response.body?.cancel();return {json:null,code:"UPSTREAM_ERROR"};}
    const len=response.headers.get("content-length");
    if(len&&(!UINT.test(len)||Number(len)>MAX_BYTES)){
      await response.body?.cancel();return {json:null,code:"UPSTREAM_ERROR",oversized:UINT.test(len)};
    }
    const reader=response.body?.getReader();
    if(!reader)return {json:null,code:"UPSTREAM_ERROR"};
    const chunks:Uint8Array[]=[];let bytes=0;
    while(true){
      const part=await reader.read();if(part.done)break;
      bytes+=part.value.byteLength;
      if(bytes>MAX_BYTES){await reader.cancel();return {json:null,code:"UPSTREAM_ERROR",oversized:true};}
      chunks.push(part.value);
    }
    const responseObj:unknown=JSON.parse(new TextDecoder("utf8",{fatal:true}).decode(Buffer.concat(chunks)));
    const payload=obj(responseObj);
    if(!payload || payload.jsonrpc!=="2.0" || payload.id!==1 ||
       payload.error!==undefined || !Array.isArray(payload.result))return {json:null,code:"UPSTREAM_ERROR"};
    return {json:payload,code:null};
  }catch{return {json:null,code:controller.signal.aborted?"TIMEOUT":"UPSTREAM_ERROR"};}
  finally{clearTimeout(timer);signal?.removeEventListener("abort",abort);}
}
function normalizeSonicFromRpc(indexed:Obj,canonical:Obj,dir:Direction,
  wallet:string,token:string,low:number,high:number): Obj | null {
  // Never turn an indexed API failure into an empty set merely because RPC is empty.
  if(indexed.status==="0" && logs(indexed,dir,wallet,token,low,high).code)return null;
  const original=indexed.status==="1"&&Array.isArray(indexed.result)?indexed.result:
    indexed.status==="0"?[]:null;
  const rpcRows=canonical.result;
  if(!Array.isArray(original)||!Array.isArray(rpcRows) ||
     original.length>=PER_DIRECTION || rpcRows.length>=PER_DIRECTION ||
     original.length!==rpcRows.length)return null;
  const index=new Map<string,Obj>();
  for(const raw of rpcRows){
    const r=obj(raw), key=eventFingerprint(raw);
    if(!r||!key || index.has(key) || uint(r.logIndex)===null)return null;
    // Canonical RPC rows must pass the same strict token/wallet/window rules.
    if(!parseLog(r,dir,wallet,token,low,high))return null;
    index.set(key,r);
  }
  const result:Obj[]=[];
  for(const raw of original){
    const r=obj(raw),key=eventFingerprint(raw);
    if(!r||!key)return null;
    const authoritative=index.get(key);
    if(!authoritative)return null;
    const rpcIndex=uint(authoritative.logIndex),provided=uint(r.logIndex);
    if(rpcIndex===null)return null;
    // Invalid nonempty index is never repaired: only an absent index is.
    if(r.logIndex!==undefined && r.logIndex!==null && r.logIndex!=="" &&
       provided!==rpcIndex)return null;
    result.push({...r,logIndex:authoritative.logIndex});
    index.delete(key);
  }
  if(index.size!==0)return null;
  return {status:"1",result};
}


/* Preview-only canonical event reader for Sonic/Mantle.
   An indexer can omit logIndex or silently disagree with RPC. Neither an empty
   indexer page nor malformed indexed evidence is authoritative. The returned
   page is built only from complete, direction-filtered RPC eth_getLogs arrays.
   A full direction (>=50) or any malformed record FAILS CLOSED downstream. */
type RpcScalar = {value:number|null;code:EvmProviderErrorCode|null};
async function canonicalRpcScalar(network:"sonic"|"mantle",method:"eth_blockNumber"|"eth_chainId",
  options:LogTransferOptions,signal?:AbortSignal):Promise<RpcScalar>{
  const controller=new AbortController();
  if(signal?.aborted)return {value:null,code:"TIMEOUT"};
  const abort=()=>controller.abort();
  signal?.addEventListener("abort",abort,{once:true});
  const timer=setTimeout(abort,Math.min(TIMEOUT_MS,Math.max(100,options.timeoutMs??TIMEOUT_MS)));
  const url=new URL(network==="sonic"?"https://rpc.soniclabs.com/":"https://rpc.mantle.xyz/");
  const payload=JSON.stringify({jsonrpc:"2.0",id:1,method,params:[]});
  try{
    const r=await providerUsageFetch({provider:`${network}-rpc`,operation:`evm.transfers.rpc.${method}`},url,
      ()=>(options.rpcTransport??options.transport??fetch)(url,{
        method:"POST",headers:{"content-type":"application/json"},body:payload,
        cache:"no-store",redirect:"error",signal:controller.signal,
      }));
    if(r.status===429){await r.body?.cancel();return {value:null,code:"RATE_LIMITED"};}
    if(!r.ok){await r.body?.cancel();return {value:null,code:"UPSTREAM_ERROR"};}
    const len=r.headers.get("content-length");
    if(len&&(!UINT.test(len)||Number(len)>MAX_BYTES)){
      await r.body?.cancel();return {value:null,code:"UPSTREAM_ERROR"};
    }
    const reader=r.body?.getReader();
    if(!reader)return {value:null,code:"UPSTREAM_ERROR"};
    const chunks:Uint8Array[]=[];let bytes=0;
    while(true){
      const part=await reader.read();if(part.done)break;
      bytes+=part.value.byteLength;
      if(bytes>MAX_BYTES){await reader.cancel();return {value:null,code:"UPSTREAM_ERROR"};}
      chunks.push(part.value);
    }
    const raw:unknown=JSON.parse(new TextDecoder("utf8",{fatal:true}).decode(Buffer.concat(chunks)));
    const body=obj(raw);
    if(!body||body.jsonrpc!=="2.0"||body.id!==1||body.error!==undefined||
       typeof body.result!=="string"||!/^0x[0-9a-fA-F]{1,16}$/.test(body.result))
      return {value:null,code:"UPSTREAM_ERROR"};
    const value=uint(body.result);
    return value===null?{value:null,code:"UPSTREAM_ERROR"}:{value,code:null};
  }catch{return {value:null,code:controller.signal.aborted?"TIMEOUT":"UPSTREAM_ERROR"};}
  finally{clearTimeout(timer);signal?.removeEventListener("abort",abort);}
}

async function canonicalRpcPage(network:"sonic"|"mantle",wallet:string,token:string,
  low:number,high:number,options:LogTransferOptions,signal?:AbortSignal):
  Promise<{out:Obj|null;in:Obj|null;code:EvmProviderErrorCode|null; saturated:boolean}>{
  const [outgoing,incoming]=await Promise.all([
    sonicRpcLogs("outgoing",wallet,token,low,high,options,signal,network),
    sonicRpcLogs("incoming",wallet,token,low,high,options,signal,network),
  ]);
  // A response-size breach and a complete 50-row cap indicate this exact
  // window is too wide. NEVER treat arbitrary HTTP/RPC failures as density.
  // Never conceal an independent provider failure behind another direction's size cap.
  const fatal=(outgoing.code&&!outgoing.oversized?outgoing.code:null)??
    (incoming.code&&!incoming.oversized?incoming.code:null);
  if(fatal)return {out:null,in:null,code:fatal,saturated:false};
  if(outgoing.oversized||incoming.oversized)
    return {out:null,in:null,code:"UPSTREAM_ERROR",saturated:true};
  const code=outgoing.code??incoming.code;
  if(code)return {out:null,in:null,code,saturated:false};
  const a=outgoing.json?.result,b=incoming.json?.result;
  if(!Array.isArray(a)||!Array.isArray(b))
    return {out:null,in:null,code:"UPSTREAM_ERROR",saturated:false};
  if(a.length>=PER_DIRECTION||b.length>=PER_DIRECTION)
    return {out:null,in:null,code:"UPSTREAM_ERROR",saturated:true};
  return {out:{status:"1",result:a},in:{status:"1",result:b},code:null,saturated:false};
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
    const canonical=this.options.preferCanonicalRpc!==false;
    const source:TransferSource=canonical && request.network.networkId==="sonic"?"sonic-rpc":
      canonical && request.network.networkId==="mantle"?"mantle-rpc":"etherscan";
    const fail=(code:EvmProviderErrorCode,ms:number|null)=>failure(code,ms,source);
    if (!this.supportsNetwork(request.network)) return fail("UNSUPPORTED_NETWORK",null);
    const wallet=address(request.address),token=address(request.tokenAddress);
    if (!wallet) return fail("INVALID_ADDRESS",null);
    if (!token) return fail("INVALID_TOKEN_ADDRESS",null);
    if (request.limit!==undefined && request.limit!==100) return fail("UPSTREAM_ERROR",null);
    const key=(this.options.apiKey??process.env.ETHERSCAN_API_KEY)?.trim()??"";
    const secret=(this.options.cursorSecret??process.env.AYZO_INTERNAL_API_KEY)?.trim();
    if (!secret || (!canonical && !key)) return fail("UPSTREAM_ERROR",null);
    const now=(this.options.now??Date.now)();
    if (!Number.isSafeInteger(now)) return fail("UPSTREAM_ERROR",null);
    let head:number,end:number;
    if (request.cursor) {
      const cursor=decodeEtherscanLogCursor(request.cursor,secret,{
        chain:request.network.chainId,wallet,token,now});
      if (!cursor) return fail("UPSTREAM_ERROR",null);
      head=cursor.head;end=cursor.end;
    } else if(canonical) {
      const network=request.network.networkId;
      if(network!=="sonic"&&network!=="mantle")return fail("UNSUPPORTED_NETWORK",elapsed());
      // Pin the initial head to the canonical RPC, not an unrelated indexer.
      const [identity,latest]=await Promise.all([
        canonicalRpcScalar(network,"eth_chainId",this.options,request.signal),
        canonicalRpcScalar(network,"eth_blockNumber",this.options,request.signal),
      ]);
      if(identity.code||latest.code)return fail(identity.code??latest.code??"UPSTREAM_ERROR",elapsed());
      if(identity.value!==request.network.chainId||latest.value===null)
        return fail("UPSTREAM_ERROR",elapsed());
      head=latest.value;end=latest.value;
    } else {
      const response=await api(urlFor(request.network.chainId,key,{module:"proxy",action:"eth_blockNumber"}),
        "evm.transfers.logs.head",this.options,request.signal);
      if (response.code) return fail(response.code,elapsed());
      const raw=response.json?.result;
      if (typeof raw!=="string" || !/^0x[0-9a-fA-F]{1,16}$/.test(raw)) return fail("UPSTREAM_ERROR",elapsed());
      const parsed=uint(raw);
      if (parsed===null) return fail("UPSTREAM_ERROR",elapsed());
      head=parsed;end=parsed;
    }
    if(canonical && request.cursor){
      const network=request.network.networkId;
      if(network!=="sonic"&&network!=="mantle")return fail("UNSUPPORTED_NETWORK",elapsed());
      // Validate the chain for continuation, without refreshing immutable head.
      const identity=await canonicalRpcScalar(network,"eth_chainId",this.options,request.signal);
      if(identity.code)return fail(identity.code,elapsed());
      if(identity.value!==request.network.chainId)return fail("UPSTREAM_ERROR",elapsed());
    }
    let low=Math.max(0,end-WINDOW+1);
    let oJson:Obj|null=null,iJson:Obj|null=null;
    // Production never reaches this experimental adapter (Preview exit canary).
    // Explicit false is available for backward-compatibility regression tests.
    if(this.options.preferCanonicalRpc!==false){
      const network=request.network.networkId;
      if(network!=="sonic" && network!=="mantle")return fail("UNSUPPORTED_NETWORK",elapsed());
      // An initial wide window may contain more than the safe 50-per-direction
      // result cap. Query progressively narrower, contiguous newest suffixes.
      // A cursor always points to low-1, so no block is skipped or duplicated.
      let accepted=false;
      for(let attempt=0;attempt<MAX_CANONICAL_ATTEMPTS;attempt++){
        const canonical=await canonicalRpcPage(network,wallet,token,low,end,this.options,request.signal);
        if(canonical.saturated){
          const width=end-low+1;
          if(width<=1 || attempt+1===MAX_CANONICAL_ATTEMPTS)
            return fail("UPSTREAM_ERROR",elapsed());
          const narrower=Math.max(1,Math.ceil(width/4));
          const nextLow=end-narrower+1;
          if(nextLow<=low)return fail("UPSTREAM_ERROR",elapsed());
          low=nextLow;
          continue;
        }
        if(canonical.code||!canonical.out||!canonical.in)
          return fail(canonical.code??"UPSTREAM_ERROR",elapsed());
        oJson=canonical.out;iJson=canonical.in;
        accepted=true;
        break;
      }
      if(!accepted)return fail("UPSTREAM_ERROR",elapsed());
    } else {
    const directionRequest=(dir:Direction)=>api(urlFor(request.network.chainId,key,{
      module:"logs",action:"getLogs",address:token,fromBlock:String(low),toBlock:String(end),
      topic0:TRANSFER,...(dir==="outgoing"?{topic1:padded(wallet),topic0_1_opr:"and"}:{topic2:padded(wallet),topic0_2_opr:"and"}),
      page:"1",offset:String(PER_DIRECTION),
    }),`evm.transfers.logs.${dir}`,this.options,request.signal);
    const [outgoing,incoming]=await Promise.all([directionRequest("outgoing"),directionRequest("incoming")]);
    if (outgoing.code || incoming.code) return fail(outgoing.code??incoming.code??"UPSTREAM_ERROR",elapsed());
    if (!outgoing.json || !incoming.json) return fail("UPSTREAM_ERROR",elapsed());
    oJson=outgoing.json; iJson=incoming.json;
    if(request.network.networkId==="sonic" &&
       (needsSonicRepair(oJson)||needsSonicRepair(iJson))){
      // Both directions: absence in Etherscan must also agree with canonical RPC.
      const [oRpc,iRpc]=await Promise.all([
        sonicRpcLogs("outgoing",wallet,token,low,end,this.options,request.signal),
        sonicRpcLogs("incoming",wallet,token,low,end,this.options,request.signal),
      ]);
      if(oRpc.code||iRpc.code)return fail(oRpc.code??iRpc.code??"UPSTREAM_ERROR",elapsed());
      if(!oRpc.json||!iRpc.json)return fail("UPSTREAM_ERROR",elapsed());
      const repairedOut=normalizeSonicFromRpc(oJson,oRpc.json,"outgoing",wallet,token,low,end);
      const repairedIn=normalizeSonicFromRpc(iJson,iRpc.json,"incoming",wallet,token,low,end);
      if(!repairedOut||!repairedIn)return fail("UPSTREAM_ERROR",elapsed());
      oJson=repairedOut;iJson=repairedIn;
    }
    } // End legacy indexed-only regression branch.
    if(!oJson||!iJson)return fail("UPSTREAM_ERROR",elapsed());
    const o=logs(oJson,"outgoing",wallet,token,low,end);
    const i=logs(iJson,"incoming",wallet,token,low,end);
    if (o.code || i.code) return fail(o.code??i.code??"UPSTREAM_ERROR",elapsed());
    const merged=new Map<string,NonNullable<ReturnType<typeof parseLog>>>();
    for (const row of [...o.data,...i.data]) {
      if (!row) return fail("UPSTREAM_ERROR",elapsed());
      const existing=merged.get(row.id);
      if (existing) {
        if (JSON.stringify(existing.transfer)!==JSON.stringify(row.transfer)) return fail("UPSTREAM_ERROR",elapsed());
      } else merged.set(row.id,row);
    }
    const transfers=[...merged.values()]
      .sort((a,b)=>b.block-a.block || b.index-a.index || a.id.localeCompare(b.id))
      .map(x=>x.transfer);
    if (transfers.length>100) return fail("UPSTREAM_ERROR",elapsed());
    const nextCursor=low===0?null:encodeEtherscanLogCursor({v:1,chain:request.network.chainId,
      subject:subjectBinding(request.network.chainId,wallet,token,secret),head,end:low-1,expires:now+TTL_MS},secret);
    return {ok:true,providerId:source,latencyMs:elapsed(),data:{transfers,nextCursor}};
  }
}
export const etherscanLogTransfersProvider=new EtherscanLogTransfersProvider();
