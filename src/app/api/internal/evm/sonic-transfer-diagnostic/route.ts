import { isInternalApiRequest } from "@/lib/apiSecurity";
import { isGoldRushExitCanaryActive } from "@/lib/goldRushExitCanary";
import { providerUsageFetch } from "@/lib/providerUsageHttpCore";
import { readJsonObjectBody } from "@/lib/requestBody";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const token = "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38";
const topic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const addressRE = /^0x[0-9a-fA-F]{40}$/;
const maxBytes = 256 * 1024;
const uint = /^(?:0|[1-9]\d*)$/;

type Result = {direction: "incoming"|"outgoing"; category: string; http: number|null; count: number|null; durationMs: number; details: string[]};
async function inspect(direction: Result["direction"], wallet: string, head: number, key: string): Promise<Result> {
  const started = performance.now();
  let http: number|null = null;
  const details: string[] = [];
  const report = (category: string, count: number|null = null): Result => ({direction,category,http,count,details,durationMs:Math.round(performance.now()-started)});
  const url = new URL("https://api.etherscan.io/v2/api");
  const padded = "0x"+"0".repeat(24)+wallet.slice(2);
  const params: Record<string,string> = {
    apikey:key,chainid:"146",module:"logs",action:"getLogs",address:token,
    fromBlock:String(Math.max(0,head-2047)),toBlock:String(head),
    topic0:topic,page:"1",offset:"50",
    ...(direction==="outgoing" ? {topic1:padded,topic0_1_opr:"and"} : {topic2:padded,topic0_2_opr:"and"}),
  };
  for (const [k,v] of Object.entries(params)) url.searchParams.set(k,v);
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),5000);
  try {
    const response = await providerUsageFetch({provider:"etherscan",operation:"evm.probe.sonic.direction"},url,
      ()=>fetch(url,{method:"GET",cache:"no-store",redirect:"error",signal:controller.signal}));
    http=response.status;
    if (http===429) {await response.body?.cancel();return report("RATE_LIMITED");}
    if (!response.ok) {await response.body?.cancel();return report("HTTP_ERROR");}
    const len = response.headers.get("content-length");
    if (len && (!uint.test(len)||Number(len)>maxBytes)) {await response.body?.cancel();return report("TOO_LARGE");}
    if (!response.body) return report("NO_BODY");
    const reader=response.body.getReader(), chunks:Uint8Array[]=[];
    let bytes=0;
    while(true) {const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;
      if(bytes>maxBytes){await reader.cancel();return report("TOO_LARGE");}chunks.push(part.value);}
    const value:unknown=JSON.parse(new TextDecoder("utf8",{fatal:true}).decode(Buffer.concat(chunks)));
    if(!value||typeof value!=="object"||Array.isArray(value))return report("NON_OBJECT");
    const x=value as Record<string,unknown>;
    if(x.status==="0") {
      const parts=[x.message,x.result].filter(y=>typeof y==="string").join(" ").toLowerCase();
      if(/rate limit|too many requests/.test(parts))return report("RATE_LIMITED_API");
      if(/no records found|no logs found/.test(parts))return report("EMPTY_STATUS_0",Array.isArray(x.result)?x.result.length:0);
      if(/not supported|paid plan|upgrade|free api/.test(parts))return report("PLAN_RESTRICTED");
      return report("STATUS_0_OTHER");
    }
    if(x.status!=="1")return report("UNEXPECTED_STATUS");
    if(!Array.isArray(x.result))return report("RESULT_NOT_ARRAY");
    const rows=x.result;
    if(rows.length>=50)return report("AT_DIRECTION_CAP",rows.length);
    const expectTopic=(s:unknown)=>typeof s==="string"&&/^0x[0-9a-fA-F]{64}$/.test(s);
    for(const raw of rows){
      if(!raw||typeof raw!=="object"||Array.isArray(raw)){details.push("ROW_NOT_OBJECT");break;}
      const r=raw as Record<string,unknown>;
      if(r.removed===true)details.push("REMOVED_TRUE");
      if(r.address?.toString().toLowerCase()!==token)details.push("WRONG_TOKEN");
      if(typeof r.transactionHash!=="string"||!/^0x[0-9a-fA-F]{64}$/.test(r.transactionHash))details.push("INVALID_HASH");
      if(!Array.isArray(r.topics)||r.topics.length!==3||!r.topics.every(expectTopic))details.push("INVALID_TOPICS");
      if(typeof r.data!=="string"||!/^0x[0-9a-fA-F]{64}$/.test(r.data))details.push("INVALID_DATA");
      for(const n of ["blockNumber","logIndex"]){
        const y=r[n];if(typeof y!=="string"||!(/^(?:0|[1-9]\d*|0x[0-9a-fA-F]+)$/.test(y)))details.push("INVALID_"+n.toUpperCase());
      }
      if(r.timeStamp!==undefined&&r.timeStamp!==null&&
        (typeof r.timeStamp!=="string"||!(/^(?:0|[1-9]\d*|0x[0-9a-fA-F]+)$/.test(r.timeStamp))))details.push("INVALID_TIMESTAMP");
      if(details.length>8)break;
    }
    return report(details.length?"ROW_SCHEMA_REJECTED":"ROW_SCHEMA_BASIC_OK",rows.length);
  } catch {return report(controller.signal.aborted?"TIMEOUT":"NETWORK_OR_JSON_ERROR");}
  finally{clearTimeout(timer);}
}
export async function POST(request:Request):Promise<Response>{
  if(!isInternalApiRequest(request))return Response.json({ok:false,code:"FORBIDDEN"},{status:403});
  if(!isGoldRushExitCanaryActive())return Response.json({ok:false,code:"DISABLED"},{status:404});
  const parsed=await readJsonObjectBody(request);
  if(!parsed.ok)return parsed.response;
  const x=parsed.body;
  if(typeof x.wallet!=="string"||!addressRE.test(x.wallet)||
    typeof x.head!=="number"||!Number.isSafeInteger(x.head)||x.head<2048||x.head>1_000_000_000)
    return Response.json({ok:false,code:"INVALID_INPUT"},{status:400});
  const key=process.env.ETHERSCAN_API_KEY?.trim();
  if(!key)return Response.json({ok:false,code:"KEY_MISSING"},{status:502});
  const wallet=x.wallet.toLowerCase();
  const outgoing=await inspect("outgoing",wallet,x.head,key);
  const incoming=await inspect("incoming",wallet,x.head,key);
  return Response.json({ok:true,network:"sonic",windowBlocks:2048,outgoing,incoming},
    {headers:{"cache-control":"no-store"}});
}
