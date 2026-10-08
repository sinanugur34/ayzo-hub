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
    now:()=>FIXED_TIME,transport:async()=>{throw Error("Unexpected Etherscan request");},
    rpcTransport:async (input,init)=>{
      const u=new URL(String(input));assert.equal(u.hostname,rpcHost);
      assert.equal(init?.method,"POST");
      const body=JSON.parse(String(init?.body));
      if(body.method==="eth_chainId"){
        requests.push({method:"identity",url:u.hostname});
        return response({jsonrpc:"2.0",id:1,result:network==="sonic"?"0x92":"0x1388"});
      }
      if(body.method==="eth_blockNumber"){
        requests.push({method:"head",url:u.hostname});
        return response({jsonrpc:"2.0",id:1,result:"0x1388"});
      }
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

// Phase 7.5: adaptive canonical window acceptance (never skip older blocks).
test("adaptive canonical window acceptance shrinks dense Sonic/Mantle pages and preserves signed continuation",async()=>{
  for(const network of ["sonic","mantle"] as const){
    const ranges:{lo:number;hi:number;direction:string}[]=[];
    const {p,request}=(()=>{
      const chain=network==="sonic"?146:5000;
      const rpcHost=network==="sonic"?"rpc.soniclabs.com":"rpc.mantle.xyz";
      const p=new EtherscanLogTransfersProvider({
        apiKey:"TEST",cursorSecret:"TEST_SECRET",preferCanonicalRpc:true,
        now:()=>FIXED_TIME,
        transport:async()=>response({jsonrpc:"2.0",result:"0x1388"}),
        rpcTransport:async(input,init)=>{
          assert.equal(new URL(String(input)).hostname,rpcHost);
          const body=JSON.parse(String(init?.body));
          if(body.method==="eth_chainId")return response({jsonrpc:"2.0",id:1,result:network==="sonic"?"0x92":"0x1388"});
          if(body.method==="eth_blockNumber")return response({jsonrpc:"2.0",id:1,result:"0x1388"});
          const q=body.params[0];
          const lo=Number(BigInt(q.fromBlock)),hi=Number(BigInt(q.toBlock));
          const direction=q.topics[1]===null?"incoming":"outgoing";
          ranges.push({lo,hi,direction});
          // Full 2048-block window is too dense and must not be returned.
          if(hi===5000 && lo===2953){
            return response({jsonrpc:"2.0",id:1,result:direction==="outgoing"
              ?Array.from({length:50},(_,n)=>event("outgoing","0x"+n.toString(16))) : []});
          }
          return response({jsonrpc:"2.0",id:1,result:hi===5000 && direction==="outgoing"
            ?[event("outgoing")]:[]});
        },
      });
      return {p,request:{network:{networkId:network,name:network,chainId:chain,nativeCurrency:"S"},
        address:wallet,tokenAddress:token,limit:100}};
    })();
    const first=await p.getTokenTransfers(request);
    assert.equal(first.ok,true,network);
    if(!first.ok)continue;
    assert.equal(first.data.transfers.length,1);
    assert.equal(first.data.nextCursor?.startsWith("etherscan-log:"),true);
    assert.equal(ranges.length,4); // exactly 2 requests for each of two widths
    assert.deepEqual(ranges.slice(0,2).map(r=>r.lo),[2953,2953]);
    assert.deepEqual(ranges.slice(2,4).map(r=>r.lo),[4489,4489]);
    ranges.length=0;
    const second=await p.getTokenTransfers({...request,cursor:first.data.nextCursor});
    assert.equal(second.ok,true);
    assert.equal(ranges.length,2);
    assert.deepEqual(ranges.map(r=>r.hi),[4488,4488]);
    assert.deepEqual(ranges.map(r=>r.lo),[2441,2441]);
  }
});

test("adaptive canonical saturation at a single block fails closed within bounded attempts",async()=>{
  let rpcCalls=0;
  const p=new EtherscanLogTransfersProvider({
    apiKey:"TEST",cursorSecret:"TEST_SECRET",preferCanonicalRpc:true,
    now:()=>FIXED_TIME,
    transport:async()=>response({jsonrpc:"2.0",result:"0x1388"}),
    rpcTransport:async(_input,init)=>{
      const body=JSON.parse(String(init?.body));
      if(body.method==="eth_chainId")return response({jsonrpc:"2.0",id:1,result:"0x92"});
      if(body.method==="eth_blockNumber")return response({jsonrpc:"2.0",id:1,result:"0x1388"});
      rpcCalls++;
      const direction=body.params[0].topics[1]===null?"incoming":"outgoing";
      return response({jsonrpc:"2.0",id:1,result:direction==="outgoing"
        ?Array.from({length:50},(_,n)=>event("outgoing","0x"+n.toString(16))) : []});
    },
  });
  const result=await p.getTokenTransfers({network:{networkId:"sonic",name:"Sonic",chainId:146,nativeCurrency:"S"},
    address:wallet,tokenAddress:token,limit:100});
  assert.equal(result.ok,false);
  assert.equal(rpcCalls,14); // 7 widths x 2 directions: no unbounded retry
});

test("adaptive canonical oversize response shrinks; arbitrary RPC failure never retried",async()=>{
  for(const kind of ["oversize","error"] as const){
    let requests=0;
    const p=new EtherscanLogTransfersProvider({
      apiKey:"TEST",cursorSecret:"TEST_SECRET",preferCanonicalRpc:true,
      now:()=>FIXED_TIME,
      transport:async()=>response({jsonrpc:"2.0",result:"0x1388"}),
      rpcTransport:async (_input,init)=>{
        const body=JSON.parse(String(init?.body));
        if(body.method==="eth_chainId")return response({jsonrpc:"2.0",id:1,result:"0x92"});
        if(body.method==="eth_blockNumber")return response({jsonrpc:"2.0",id:1,result:"0x1388"});
        requests++;
        const first=Number(BigInt(body.params[0].fromBlock))===2953;
        if(first && kind==="oversize")return new Response("",{status:200,headers:{"content-length":"300000"}});
        if(first && kind==="error")return response({jsonrpc:"2.0",id:1,error:{code:-32603}});
        return response({jsonrpc:"2.0",id:1,result:[]});
      },
    });
    const got=await p.getTokenTransfers({network:{networkId:"sonic",name:"Sonic",chainId:146,nativeCurrency:"S"},
      address:wallet,tokenAddress:token,limit:100});
    assert.equal(got.ok,kind==="oversize");
    assert.equal(requests,kind==="oversize"?4:2);
  }
});

test("canonical transfer head is keyless and branded by real RPC source on both networks",async()=>{
  for(const network of ["sonic","mantle"] as const){
    const chain=network==="sonic"?146:5000;
    const seen:string[]=[];
    let indexedCalls=0;
    const p=new EtherscanLogTransfersProvider({
      apiKey:"",cursorSecret:"LOCAL_TEST_SECRET",preferCanonicalRpc:true,now:()=>FIXED_TIME,
      transport:async()=>{indexedCalls++;throw Error("Indexer must not be touched");},
      rpcTransport:async(input,init)=>{
        assert.equal(new URL(String(input)).hostname,network==="sonic"?"rpc.soniclabs.com":"rpc.mantle.xyz");
        const body=JSON.parse(String(init?.body));
        seen.push(body.method);
        if(body.method==="eth_chainId")return response({jsonrpc:"2.0",id:1,result:network==="sonic"?"0x92":"0x1388"});
        if(body.method==="eth_blockNumber")return response({jsonrpc:"2.0",id:1,result:"0x1388"});
        assert.equal(body.method,"eth_getLogs");
        return response({jsonrpc:"2.0",id:1,result:[]});
      },
    });
    const request={network:{networkId:network,name:network,chainId:chain,nativeCurrency:"S"},
      address:wallet,tokenAddress:token,limit:100};
    const first=await p.getTokenTransfers(request);
    assert.equal(first.ok,true,network);
    assert.equal(first.providerId,`${network}-rpc`);
    if(!first.ok)continue;
    assert.deepEqual(seen.slice(0,2).sort(),["eth_blockNumber","eth_chainId"]);
    assert.equal(seen.filter(x=>x==="eth_getLogs").length,2);
    const second=await p.getTokenTransfers({...request,cursor:first.data.nextCursor});
    assert.equal(second.ok,true);
    assert.equal(second.providerId,`${network}-rpc`);
    assert.equal(seen.filter(x=>x==="eth_blockNumber").length,1);
    assert.equal(seen.filter(x=>x==="eth_chainId").length,2);
    assert.equal(seen.filter(x=>x==="eth_getLogs").length,4);
    assert.equal(indexedCalls,0);
  }
});

test("canonical wrong-chain and malformed head never produce transfer evidence",async()=>{
  for(const kind of ["wrong_chain","bad_head","rpc_error"] as const){
    let logCalls=0;
    const p=new EtherscanLogTransfersProvider({
      apiKey:"",cursorSecret:"SECRET",preferCanonicalRpc:true,now:()=>FIXED_TIME,
      transport:async()=>{throw Error("Etherscan disabled");},
      rpcTransport:async(_input,init)=>{
        const body=JSON.parse(String(init?.body));
        if(body.method==="eth_getLogs"){
          logCalls++;
          return response({jsonrpc:"2.0",id:1,result:[]});
        }
        if(kind==="rpc_error")return response({jsonrpc:"2.0",id:1,error:{code:-32603}});
        if(body.method==="eth_chainId")return response({jsonrpc:"2.0",id:1,result:kind==="wrong_chain"?"0x1":"0x92"});
        return response({jsonrpc:"2.0",id:1,result:kind==="bad_head"?"bad":"0x1388"});
      },
    });
    const result=await p.getTokenTransfers({network:{networkId:"sonic",name:"Sonic",chainId:146,nativeCurrency:"S"},
      address:wallet,tokenAddress:token,limit:100});
    assert.equal(result.ok,false);
    assert.equal(result.providerId,"sonic-rpc");
    assert.equal(logCalls,0);
  }
});
