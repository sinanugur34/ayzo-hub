import assert from "node:assert/strict";
import test from "node:test";
import { getPreferredEvmHolderProviderId, getPreferredEvmTokenHolders } from "./preferredHolders";
import type { EvmTokenHoldersProvider } from "../provider";
const base = { networkId: "base" as const, chainId:8453, name:"Base",nativeCurrency:"ETH" };
const sonic = { networkId: "sonic" as const, chainId:146, name:"Sonic",nativeCurrency:"S" };
const ethereum = { networkId: "ethereum" as const, chainId:1, name:"Ethereum",nativeCurrency:"ETH" };
const address = "0x1111111111111111111111111111111111111111";
const count={calls:0};
const ankr: EvmTokenHoldersProvider = {
  id:"ankr",capabilities:["tokenHolders"],supportsNetwork:()=>true,
  supportsCapability:x=>x==="tokenHolders",
  async getTokenHolders(){count.calls++;return {ok:true as const,providerId:"ankr" as const,
    latencyMs:1,data:{holders:[],totalCount:0,totalSupply:"100",nextCursor:null}};}
};
test("six holder networks choose Ankr",()=>{
 for(const n of ["base","bnb","arbitrum","polygon","avalanche","linea"] as const)
   assert.equal(getPreferredEvmHolderProviderId(n),"ankr");
});
test("unsupported holders never point at a retired primary",()=>{
 assert.equal(getPreferredEvmHolderProviderId("sonic"),"unavailable");
 assert.equal(getPreferredEvmHolderProviderId("monad"),"unavailable");
 assert.equal(getPreferredEvmHolderProviderId("ethereum"),"blockscout");
});
test("Ankr continues without any retired fallback",async()=>{
 count.calls=0;
 const x=await getPreferredEvmTokenHolders({network:base,address,cursor:null,limit:100},{ankr});
 assert.equal(x.ok,true);assert.equal(count.calls,1);
});
test("Sonic fails closed when there is no certified holder source",async()=>{
 count.calls=0;
 const x=await getPreferredEvmTokenHolders({network:sonic,address,cursor:null,limit:100},{ankr});
 assert.equal(x.ok,false);assert.equal(count.calls,0);
});
test("Ethereum primary is unavailable outside preview-only canary",async()=>{
 const old=process.env.VERCEL_ENV;process.env.VERCEL_ENV="production";
 try {const x=await getPreferredEvmTokenHolders({network:ethereum,address,cursor:null,limit:100},{ankr});
   assert.equal(x.ok,false);}finally{if(old===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=old;}
});
test("Legacy numeric holder cursor never crosses providers",async()=>{
 count.calls=0;
 const x=await getPreferredEvmTokenHolders({network:base,address,cursor:"2",limit:100},{ankr});
 assert.equal(x.ok,false);assert.equal(count.calls,0);
});
