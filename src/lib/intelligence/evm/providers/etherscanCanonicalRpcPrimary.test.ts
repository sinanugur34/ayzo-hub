import assert from "node:assert/strict";
import test from "node:test";
import { EtherscanLogTransfersProvider } from "./etherscanLogTransfers";
const wallet="0x"+"1".repeat(40),token="0x"+"2".repeat(40),other="0x"+"3".repeat(40);
const signature="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const padded=(a:string)=>"0x"+"0".repeat(24)+a.slice(2);
const tx="0x"+"a".repeat(64);
const event=(dir:"incoming"|"outgoing",index="0x9")=>({
  address:token,transactionHash:tx,blockNumber:"0x1387",logIndex:index,
  topics:[signature,padded(dir==="incoming"?other:wallet),padded(dir==="incoming"?wallet:other)],
  data:"0x"+"0".repeat(63)+"1",removed:false,
});
const response=(x:unknown)=>new Response(JSON.stringify(x),{status:200});
const FIXED_TIME=1791480000000;
function make(network:"sonic"|"mantle",options?:{
  rpcOutgoing?:unknown[];rpcIncoming?:unknown[];
  malformed?:boolean;
}){
  const requests:{method:string;url:string;toBlock?:number;direction?:string}[]=[];
  const rpcHost=network==="sonic"?"rpc.soniclabs.com":"rpc.mantle.xyz";
  const p=new EtherscanLogTransfersProvider({
    apiKey:"TEST_KEY_NO_SECRETS",cursorSecret:"TEST_CURSOR_SECRET",preferCanonicalRpc:true,
    now:()=>FIXED_TIME,transport:async input=>{
      const url=new URL(String(input));
      assert.equal(url.hostname,"api.etherscan.io");
      assert.equal(url.searchParams.get("action"),"eth_blockNumber");
      requests.push({method:"head",url:url.hostname});
      return response({jsonrpc:"2.0",result:"0x1388"});
    },rpcTransport:async (input,init)=>{
      const u=new URL(String(input));assert.equal(u.hostname,rpcHost);
      assert.equal(init?.method,"POST");
      const body=JSON.parse(String(init?.body));
      assert.equal(body.method,"eth_getLogs");
      const x=body.params[0],direction=x.topics[1]===null?"incoming":"outgoing";
      assert.equal(x.address,token);
      assert.equal(x.topics[0],signature);
      assert.equal(x.topics[direction==="outgoing"?1:2],padded(wallet));
      const toBlock=Number(BigInt(x.toBlock));
      requests.push({method:"logs",url:u.hostname,toBlock,direction});
      if(options?.malformed)return response({jsonrpc:"2.0",id:1,error:{code:-32603,message:"unavailable"}});
      const rows=toBlock===5000?
        (direction==="outgoing"?(options?.rpcOutgoing??[event("outgoing")]):(options?.rpcIncoming??[])):[];
      return response({jsonrpc:"2.0",id:1,result:rows});
    },
  });
  return {p,requests,request:{
    network:{networkId:network,name:network,chainId:network==="sonic"?146:5000,nativeCurrency:"NATIVE"},
    address:wallet,tokenAddress:token,limit:100,
  }};
}
test("both Sonic and Mantle use canonical RPC logs rather than unreliable indexed event rows",async()=>{
  for(const network of ["sonic","mantle"] as const){
    const {p,requests,request}=make(network);
    const first=await p.getTokenTransfers(request);
    assert.equal(first.ok,true);
    if(!first.ok)continue;
    assert.equal(first.data.transfers.length,1);
    assert.equal(first.data.transfers[0].transactionHash,tx);
    assert.equal(first.data.transfers[0].timestamp,null);
    assert.equal(first.data.nextCursor?.startsWith("etherscan-log:"),true);
    assert.equal(requests.filter(r=>r.method==="head").length,1);
    assert.equal(requests.filter(r=>r.method==="logs").length,2);
    const second=await p.getTokenTransfers({...request,cursor:first.data.nextCursor});
    assert.equal(second.ok,true);
    if(second.ok){
      assert.equal(second.data.transfers.length,0);
      assert.equal(second.data.nextCursor?.startsWith("etherscan-log:"),true);
    }
    assert.equal(requests.filter(r=>r.method==="head").length,1);
    assert.equal(requests.filter(r=>r.method==="logs"&&r.toBlock===2952).length,2);
  }
});
test("canonical RPC with missing logIndex, malformed response or a full direction fails closed",async()=>{
  for(const cfg of [
    {rpcOutgoing:[{...event("outgoing"),logIndex:null}]},
    {malformed:true},
    {rpcOutgoing:Array.from({length:50},(_,n)=>event("outgoing","0x"+n.toString(16)))},
  ]){
    const {p,request}=make("sonic",cfg);
    assert.equal((await p.getTokenTransfers(request)).ok,false);
  }
});
test("canonical self transfers deduplicate by real transaction hash and log index",async()=>{
  const self={...event("outgoing"),topics:[signature,padded(wallet),padded(wallet)]};
  const {p,request}=make("mantle",{rpcOutgoing:[self],rpcIncoming:[self]});
  const result=await p.getTokenTransfers(request);
  assert.equal(result.ok,true);
  if(result.ok)assert.equal(result.data.transfers.length,1);
});
test("cross-wallet continuation stays rejected without new RPC requests",async()=>{
  const {p,request,requests}=make("sonic");
  const page=await p.getTokenTransfers(request);
  assert.equal(page.ok,true);if(!page.ok)return;
  const n=requests.length;
  const result=await p.getTokenTransfers({...request,address:other,cursor:page.data.nextCursor});
  assert.equal(result.ok,false);
  assert.equal(requests.length,n);
});
