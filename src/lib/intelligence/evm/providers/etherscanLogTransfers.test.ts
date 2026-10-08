import assert from "node:assert/strict";
import test from "node:test";
import { EtherscanLogTransfersProvider, decodeEtherscanLogCursor } from "./etherscanLogTransfers";
const wallet="0x"+"1".repeat(40),token="0x"+"2".repeat(40),other="0x"+"3".repeat(40);
const sig="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const padded=(a:string)=>"0x"+"0".repeat(24)+a.slice(2);
const head={jsonrpc:"2.0",result:"0x1388"}; // 5000
const log=(from:string,to:string,idx="0x4",block="0x1387")=>({
  address:token,transactionHash:"0x"+"a".repeat(64),blockNumber:block,logIndex:idx,
  topics:[sig,padded(from),padded(to)],data:"0x"+BigInt(123).toString(16).padStart(64,"0"),
  timeStamp:"0x6553f100",
});
const body=(v:unknown)=>new Response(JSON.stringify(v),{status:200});
const context={networkId:"sonic" as const,name:"Sonic",chainId:146,nativeCurrency:"S"};
const req={network:context,address:wallet,tokenAddress:token,limit:100};
const opts={apiKey:"TEST_KEY",cursorSecret:"LOCAL_SIGN_ONLY",preferCanonicalRpc:false,now:()=>1791480000000};
function provider(outgoing:unknown[],incoming:unknown[]) {
  const requests:URL[]=[];
  const p=new EtherscanLogTransfersProvider({...opts,transport:async input=>{
    const u=new URL(String(input)); requests.push(u);
    assert.equal(u.origin,"https://api.etherscan.io");
    assert.equal(u.searchParams.get("chainid"),"146");
    if (u.searchParams.get("action")==="eth_blockNumber") return body(head);
    assert.equal(u.searchParams.get("action"),"getLogs");
    assert.equal(u.searchParams.get("fromBlock"),"2953");
    assert.equal(u.searchParams.get("toBlock"),"5000");
    assert.equal(u.searchParams.get("offset"),"50");
    assert.equal(u.searchParams.get("address"),token);
    assert.equal(u.searchParams.get("topic0"),sig);
    if(u.searchParams.has("topic1")) {
      assert.equal(u.searchParams.get("topic1"),padded(wallet));
      return body({status:"1",result:outgoing});
    }
    assert.equal(u.searchParams.get("topic2"),padded(wallet));
    return body({status:"1",result:incoming});
  }});
  return {p,requests};
}
test("real event identity, exact dual direction filters, deduplicate self-transfers and continuation",async()=>{
  const {p,requests}=provider([log(wallet,wallet)],[log(wallet,wallet)]);
  const result=await p.getTokenTransfers(req);
  assert.equal(result.ok,true);
  if(!result.ok) return;
  assert.equal(result.data.transfers.length,1);
  assert.equal(result.data.transfers[0].value,"123");
  assert.equal(result.data.transfers[0].timestamp,"2023-11-14T22:13:20.000Z");
  assert.equal(requests.length,3);
  assert.equal(result.data.nextCursor?.startsWith("etherscan-log:"),true);
  assert.equal(decodeEtherscanLogCursor(result.data.nextCursor ?? "",opts.cursorSecret,{
    chain:146,wallet,token,now:opts.now()})?.end,2952);
});
test("never invent timestamp when absent; sorted log index",async()=>{
  const a={...log(wallet,other,"0x1")};delete (a as {timeStamp?:string}).timeStamp;
  const b={...log(other,wallet,"0x2")};delete (b as {timeStamp?:string}).timeStamp;
  const {p}=provider([a],[b]);
  const result=await p.getTokenTransfers(req);
  assert.equal(result.ok,true);
  if(result.ok){assert.equal(result.data.transfers.length,2);assert.equal(result.data.transfers[0].timestamp,null);}
});
test("full direction page fails closed, never silently truncate",async()=>{
  const full=Array.from({length:50},(_,n)=>log(wallet,other,"0x"+n.toString(16)));
  const {p}=provider(full,[]);
  assert.equal((await p.getTokenTransfers(req)).ok,false);
});
test("malformed topics, out-of-window logs and missing logIndex fail closed",async()=>{
  for(const sample of [
    {...log(wallet,other),topics:[sig,padded(wallet)]},
    {...log(wallet,other),blockNumber:"0x1"},
    {...log(wallet,other),logIndex:null},
  ]){
    const {p}=provider([sample],[]);
    assert.equal((await p.getTokenTransfers(req)).ok,false);
  }
});
test("empty bounded window returns an explicit older-window cursor, not a fabricated complete history",async()=>{
  const {p}=provider([],[]);
  const result=await p.getTokenTransfers(req);
  assert.equal(result.ok,true);
  if(result.ok){assert.equal(result.data.transfers.length,0);assert.equal(typeof result.data.nextCursor,"string");}
});
test("tampered, expired, wrong wallet and wrong chain cursors rejected without upstream calls",async()=>{
  const {p}=provider([],[]);
  const first=await p.getTokenTransfers(req);
  assert.equal(first.ok,true);if(!first.ok) return;
  const cursor=first.data.nextCursor ?? "";
  const bad=cursor.slice(0,-1)+(cursor.endsWith("a")?"b":"a");
  assert.equal((await p.getTokenTransfers({...req,cursor:bad})).ok,false);
  assert.equal((await p.getTokenTransfers({...req,cursor,address:other})).ok,false);
  const mantle=new EtherscanLogTransfersProvider({...opts});
  assert.equal((await mantle.getTokenTransfers({...req,network:{networkId:"mantle",chainId:5000,name:"Mantle",nativeCurrency:"MNT"},cursor})).ok,false);
  assert.equal(decodeEtherscanLogCursor(cursor,opts.cursorSecret,{chain:146,wallet,token,now:opts.now()+86400001}),null);
});
test("signed continuation reads the older window without refetching chain head",async()=>{
  const seen:URL[]=[];
  const p=new EtherscanLogTransfersProvider({...opts,transport:async input=>{
    const u=new URL(String(input));seen.push(u);
    if(u.searchParams.get("action")==="eth_blockNumber") return body(head);
    return body({status:"1",result:[]});
  }});
  const first=await p.getTokenTransfers(req);
  assert.equal(first.ok,true);if(!first.ok)return;
  const second=await p.getTokenTransfers({...req,cursor:first.data.nextCursor});
  assert.equal(second.ok,true);
  assert.equal(seen.filter(x=>x.searchParams.get("action")==="eth_blockNumber").length,1);
  assert.equal(seen.filter(x=>x.searchParams.get("toBlock")==="2952").length,2);
  assert.equal(seen.filter(x=>x.searchParams.get("fromBlock")==="905").length,2);
});
test("Etherscan status=0 empty responses are exact and error-first",async()=>{
  const variants = [
    {status:"0",message:"No records found",result:[]},
    {status:"0",message:"No records found",result:""},
    {status:"0",message:"NOTOK",result:"No records found"},
    {status:"0",message:"NOTOK",result:"No logs found"},
  ];
  for (const response of variants) {
    const p=new EtherscanLogTransfersProvider({...opts,transport:async input=>{
      const u=new URL(String(input));
      return body(u.searchParams.get("action")==="eth_blockNumber"?head:response);
    }});
    const result=await p.getTokenTransfers(req);
    assert.equal(result.ok,true,JSON.stringify(response));
    if(result.ok){assert.equal(result.data.transfers.length,0);assert.equal(typeof result.data.nextCursor,"string");}
  }
  for (const response of [
    {status:"0",message:"NOTOK",result:[]},
    {status:"0",message:"NOTOK",result:""},
    {status:"0",message:"NOTOK",result:"Invalid API Key"},
    {status:"0",message:"No records found",result:"rate limit exceeded"},
    {status:"0",message:"NOTOK",result:"No records found — rate limit exceeded"},
  ]) {
    const p=new EtherscanLogTransfersProvider({...opts,transport:async input=>{
      const u=new URL(String(input));
      return body(u.searchParams.get("action")==="eth_blockNumber"?head:response);
    }});
    assert.equal((await p.getTokenTransfers(req)).ok,false,JSON.stringify(response));
  }
});
test("wrong network, invalid address and missing key fail closed",async()=>{
  const p=new EtherscanLogTransfersProvider({...opts,apiKey:""});
  assert.equal((await p.getTokenTransfers(req)).ok,false);
  assert.equal((await p.getTokenTransfers({...req,address:"bad"})).ok,false);
  assert.equal((await p.getTokenTransfers({...req,network:{networkId:"sonic",chainId:1,name:"wrong",nativeCurrency:"S"}})).ok,false);
});
