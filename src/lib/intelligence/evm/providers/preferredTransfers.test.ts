import assert from "node:assert/strict";
import test from "node:test";
import { getPreferredEvmTokenTransfers } from "./preferredTransfers";
import type { EvmTransfersProvider } from "../provider";
const network={networkId:"ethereum" as const,chainId:1,name:"Ethereum",nativeCurrency:"ETH"};
const request={network,address:"0x1111111111111111111111111111111111111111",
 tokenAddress:"0x2222222222222222222222222222222222222222",cursor:null};
let calls=0;
const alchemy:EvmTransfersProvider={id:"alchemy",capabilities:["tokenTransfers"],supportsNetwork:()=>true,
 supportsCapability:x=>x==="tokenTransfers",async getTokenTransfers(){calls++;
 return {ok:true as const,providerId:"alchemy" as const,latencyMs:1,
 data:{transfers:[],nextCursor:null}};}};
test("Alchemy remains the first transfer provider",async()=>{
 calls=0;const x=await getPreferredEvmTokenTransfers(request,{alchemy});
 assert.equal(x.ok,true);assert.equal(calls,1);
});
test("retired numeric transfer cursor never reaches other providers",async()=>{
 calls=0;const x=await getPreferredEvmTokenTransfers({...request,cursor:"1"},{alchemy});
 assert.equal(x.ok,false);assert.equal(calls,0);
});
test("retired wallet transfer cursor fails closed",async()=>{
 calls=0;const x=await getPreferredEvmTokenTransfers({...request,cursor:"wallet:0:10"},{alchemy});
 assert.equal(x.ok,false);assert.equal(calls,0);
});
test("retired event cursor fails closed",async()=>{
 calls=0;const x=await getPreferredEvmTokenTransfers({...request,cursor:"events:123:0"},{alchemy});
 assert.equal(x.ok,false);assert.equal(calls,0);
});
test("non-enabled EAPI networks do not silently select retired providers",async()=>{
 calls=0;const mantle={networkId:"mantle" as const,chainId:5000,name:"Mantle",nativeCurrency:"MNT"};
 const x=await getPreferredEvmTokenTransfers({...request,network:mantle},{alchemy});
 assert.equal(x.ok,false);assert.equal(calls,0);
});
