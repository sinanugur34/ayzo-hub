import assert from "node:assert/strict";
import test from "node:test";
import { EtherscanLogTransfersProvider } from "./etherscanLogTransfers";
const wallet="0x"+"1".repeat(40),token="0x"+"2".repeat(40),other="0x"+"3".repeat(40);
const transfer="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const topic=(s:string)=>"0x"+"0".repeat(24)+s.slice(2);
const row=(hash:string,logIndex?:string)=>({address:token,transactionHash:hash,blockNumber:"0x1387",
  topics:[transfer,topic(wallet),topic(other)],data:"0x"+"0".repeat(63)+"1",...logIndex?{logIndex}:{}});
const hash="0x"+"a".repeat(64);
const reply=(value:unknown)=>new Response(JSON.stringify(value),{status:200});
const ctx={networkId:"sonic" as const,name:"Sonic",chainId:146,nativeCurrency:"S"};
const req={network:ctx,address:wallet,tokenAddress:token,limit:100};
const cfg={apiKey:"TEST_ONLY",cursorSecret:"LOCAL_SECRET",preferCanonicalRpc:false,now:()=>1791480000000};
function testProvider(indexed:unknown[],rpc:unknown[],options?:{inbound?:unknown[];rpcInbound?:unknown[]}){
  const counters={etherscan:0,rpc:0};
  const p=new EtherscanLogTransfersProvider({...cfg,
    transport:async input=>{
      counters.etherscan++;
      const url=new URL(String(input));
      assert.equal(url.hostname,"api.etherscan.io");
      if(url.searchParams.get("action")==="eth_blockNumber")return reply({result:"0x1388"});
      if(url.searchParams.has("topic1"))return reply({status:"1",result:indexed});
      return reply(options?.inbound===undefined?{status:"0",message:"NOTOK",result:"No records found"}:
        {status:"1",result:options.inbound});
    },
    rpcTransport:async (input,init)=>{
      counters.rpc++;
      assert.equal(new URL(String(input)).hostname,"rpc.soniclabs.com");
      assert.equal(init?.method,"POST");
      const payload=JSON.parse(String(init?.body));
      assert.equal(payload.method,"eth_getLogs");
      assert.equal(payload.params[0].fromBlock,"0xb89"); // 2953
      assert.equal(payload.params[0].toBlock,"0x1388"); // 5000
      const outbound=payload.params[0].topics[1]!==null;
      return reply({jsonrpc:"2.0",id:1,result:outbound?rpc:(options?.rpcInbound??[])});
    },
  });
  return {p,counters};
}
test("Sonic missing logIndex is proven by canonical RPC and signed cursor remains",async()=>{
  const {p,counters}=testProvider([row(hash)],[row(hash,"0x9")]);
  const result=await p.getTokenTransfers(req);
  assert.equal(result.ok,true);
  if(!result.ok)return;
  assert.equal(result.data.transfers.length,1);
  assert.equal(result.data.transfers[0].transactionHash,hash);
  assert.equal(result.data.transfers[0].timestamp,null);
  assert.ok(result.data.nextCursor?.startsWith("etherscan-log:"));
  assert.equal(counters.etherscan,3);
  assert.equal(counters.rpc,2);
});
test("Sonic false-empty indexer direction rejects canonical nonempty RPC",async()=>{
  const mismatch=row("0x"+"b".repeat(64),"0x10");
  const {p}=testProvider([row(hash)],[row(hash,"0x9")],{rpcInbound:[mismatch]});
  assert.equal((await p.getTokenTransfers(req)).ok,false);
});
test("Sonic never guesses among duplicate identical transfer events",async()=>{
  const {p}=testProvider([row(hash),row(hash)],[row(hash,"0x9"),row(hash,"0xa")]);
  assert.equal((await p.getTokenTransfers(req)).ok,false);
});
test("Sonic altered indexer transfer, missing canonical log and malformed RPC fail closed",async()=>{
  const altered={...row(hash),data:"0x"+"0".repeat(63)+"2"};
  for(const [indexed,rpc] of [
    [[altered],[row(hash,"0x9")]],
    [[row(hash)],[]],
    [[row(hash)],[{...row(hash,"0x9"),logIndex:null}]],
  ] as const){
    const {p}=testProvider([...indexed],[...rpc]);
    assert.equal((await p.getTokenTransfers(req)).ok,false);
  }
});
test("Mantle stays on Etherscan with no Sonic RPC I/O",async()=>{
  let seenRpc=0;
  const p=new EtherscanLogTransfersProvider({...cfg,
    transport:async input=>{
      const u=new URL(String(input));
      if(u.searchParams.get("action")==="eth_blockNumber")return reply({result:"0x1388"});
      if(u.searchParams.has("topic1"))return reply({status:"1",result:[row(hash,"0x9")]});
      return reply({status:"0",message:"NOTOK",result:"No records found"});
    },
    rpcTransport:async()=>{seenRpc++;throw Error("Must not call Sonic RPC on Mantle");},
  });
  const mantle={networkId:"mantle" as const,name:"Mantle",chainId:5000,nativeCurrency:"MNT"};
  const result=await p.getTokenTransfers({...req,network:mantle});
  assert.equal(result.ok,true);
  if(result.ok)assert.equal(result.data.transfers.length,1);
  assert.equal(seenRpc,0);
});
test("Sonic explicit empty inbound remains valid when RPC agrees",async()=>{
  const {p}=testProvider([row(hash)],[row(hash,"0x9")],{
    inbound:[],rpcInbound:[],
  });
  // Positive baseline: explicit status=1 empty inbound is not a provider failure.
  assert.equal((await p.getTokenTransfers(req)).ok,true);
});
