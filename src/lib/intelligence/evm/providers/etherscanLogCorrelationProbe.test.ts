import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { correlateTransferLog, probeEtherscanLogCorrelation } from "./etherscanLogCorrelationProbe";

const TOKEN = {sonic:"0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38",mantle:"0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8"} as const;
const from="0x"+"1".repeat(40),to="0x"+"2".repeat(40),txHash="0x"+"a".repeat(64);
const topic=(address:string)=>"0x"+"0".repeat(24)+address.slice(2);
const sig="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const tx=(token:string)=>({status:"1",message:"OK",result:[{hash:txHash,from,to,contractAddress:token,value:"12345",blockNumber:"1998",timeStamp:"1700000000"}]});
const log=(token:string,index="0x3")=>({address:token,transactionHash:txHash,blockNumber:"0x7ce",logIndex:index,
  topics:[sig,topic(from),topic(to)],data:"0x"+BigInt(12345).toString(16).padStart(64,"0")});
const answer=(v:unknown)=>new Response(JSON.stringify(v),{status:200});
const head={jsonrpc:"2.0",id:1,result:"0x7d0"};

test("Sonic and Mantle exact 3-step reconciliation and strict filters",async()=>{
  for(const [network,chain] of [["sonic",146],["mantle",5000]] as const){
    const urls:URL[]=[];
    const result=await probeEtherscanLogCorrelation(network,{
      apiKey:"TEST_NOT_SECRET",transport:async input=>{
        const u=new URL(String(input));urls.push(u);
        assert.equal(u.origin,"https://api.etherscan.io");
        assert.equal(u.searchParams.get("chainid"),String(chain));
        return answer(urls.length===1?head:urls.length===2?tx(TOKEN[network]):{status:"1",result:[log(TOKEN[network])]});
      },
    });
    assert.equal(result.outcome,"MATCHED_SINGLE_LOG");
    assert.equal(result.uniqueMatch,true);
    assert.equal(urls.length,3);
    assert.equal(urls[1].searchParams.get("offset"),"1");
    assert.equal(urls[1].searchParams.get("startblock"),"0");
    const params=urls[2].searchParams;
    assert.equal(params.get("module"),"logs");
    assert.equal(params.get("action"),"getLogs");
    assert.equal(params.get("fromBlock"),"1998");
    assert.equal(params.get("toBlock"),"1998");
    assert.equal(params.get("topic0"),sig);
    assert.equal(params.get("topic1"),topic(from));
    assert.equal(params.get("topic2"),topic(to));
    assert.equal(params.get("topic0_1_opr"),"and");
    assert.equal(params.get("topic1_2_opr"),"and");
    assert.equal(JSON.stringify(result).includes("TEST_NOT_SECRET"),false);
    assert.equal(JSON.stringify(result).includes(txHash),false);
  }
});
test("duplicate transfer evidence cannot become unique event identity",()=>{
  const sample={transactionHash:txHash,token:TOKEN.sonic,from,to,value:"12345",block:1998};
  const outcome=correlateTransferLog(sample,[log(TOKEN.sonic,"0x3"),log(TOKEN.sonic,"0x4")]);
  assert.equal(outcome.outcome,"AMBIGUOUS_MATCH");
  assert.equal(outcome.matched,2);
});
test("no matching hash and missing logIndex cannot pass",()=>{
  const sample={transactionHash:txHash,token:TOKEN.sonic,from,to,value:"12345",block:1998};
  assert.equal(correlateTransferLog(sample,[{...log(TOKEN.sonic),transactionHash:"0x"+"b".repeat(64)}]).outcome,"NO_MATCH");
  const missing: Record<string, unknown> = {...log(TOKEN.sonic)};
  delete missing.logIndex;
  assert.equal(correlateTransferLog(sample,[missing]).outcome,"INVALID_RESPONSE");
});
test("exactly full log page is treated as truncated and not certified",()=>{
  const sample={transactionHash:txHash,token:TOKEN.sonic,from,to,value:"12345",block:1998};
  assert.equal(correlateTransferLog(sample,Array.from({length:50},(_,i)=>log(TOKEN.sonic,"0x"+i.toString(16)))).outcome,"TRUNCATED_LOG_RESULTS");
});
test("chain eligibility, empty window and rate limiting fail closed",async()=>{
  let n=0;
  const plan=await probeEtherscanLogCorrelation("sonic",{apiKey:"TEST",transport:async()=>answer(++n===1?head:
    {status:"0",message:"NOTOK",result:"Free API access is not supported for this chain"})});
  assert.equal(plan.outcome,"PLAN_RESTRICTED");
  n=0;
  const empty=await probeEtherscanLogCorrelation("sonic",{apiKey:"TEST",transport:async()=>answer(++n===1?head:
    {status:"0",message:"No transactions found",result:[]})});
  assert.equal(empty.outcome,"EMPTY_WINDOW");
  const limited=await probeEtherscanLogCorrelation("mantle",{apiKey:"TEST",transport:async()=>new Response("{}",{status:429})});
  assert.equal(limited.outcome,"RATE_LIMITED");
});
test("route is internal-authenticated and Preview-only",()=>{
  const route=readFileSync("src/app/api/internal/evm/etherscan-log-correlation-probe/route.ts","utf8");
  assert.match(route,/isInternalApiRequest\(request\)/);
  assert.match(route,/isGoldRushExitCanaryActive\(\)/);
  assert.match(route,/readJsonObjectBody\(request\)/);
});
