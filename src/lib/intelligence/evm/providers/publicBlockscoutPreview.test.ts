import assert from "node:assert/strict";
import test from "node:test";
import { blockscoutHoldersProvider } from "./indexedHolderAdapters";

const TOKEN = "0x" + "a".repeat(40);
const OTHER = "0x" + "b".repeat(40);
const ADDR = (n: number) => "0x" + n.toString(16).padStart(40, "0");
const contexts = [
  { networkId: "optimism" as const, chainId: 10, name: "Optimism", nativeCurrency: "ETH", host: "explorer.optimism.io", rpc: "opt-mainnet.g.alchemy.com" },
  { networkId: "scroll" as const, chainId: 534352, name: "Scroll", nativeCurrency: "ETH", host: "scrollscan.com", rpc: "scroll-mainnet.g.alchemy.com" },
];
const resp = (body: unknown, status=200) => Response.json(body,{status});
const rows = (start:number) => Array.from({length:50},(_,i)=>({address:{hash:ADDR(start+i)},value:String(1000-start-i)}));
const marker=(start:number)=>({address_hash:ADDR(start+49),value:String(1000-start-49),items_count:50});
const call = (network:typeof contexts[number], cursor:string|null=null, token=TOKEN) =>
 blockscoutHoldersProvider.getTokenHolders({network,address:token,limit:100,cursor});

async function mock<T>(network:typeof contexts[number], mode:"ok"|"drift"|"rpc-error"|"holder-error", task:(calls:string[])=>Promise<T>):Promise<T> {
  const prevFetch=globalThis.fetch;
  const keys=["VERCEL_ENV","AYZO_INDEXED_HOLDER_CANARY","AYZO_HOLDER_CURSOR_SIGNING_KEY","ALCHEMY_API_KEY","AYZO_GOLDRUSH_EXIT_CANARY"] as const;
  const prev=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  process.env.VERCEL_ENV="preview";
  process.env.AYZO_INDEXED_HOLDER_CANARY="1";
  process.env.AYZO_HOLDER_CURSOR_SIGNING_KEY="a".repeat(64);
  process.env.ALCHEMY_API_KEY="unit-test-only-alchemy-credential";
  delete process.env.AYZO_GOLDRUSH_EXIT_CANARY;
  const calls:string[]=[];
  globalThis.fetch=(async input=>{
    const url=new URL(String(input)); calls.push(url.href);
    assert.equal(url.protocol,"https:");
    if(url.hostname===network.rpc){
      assert.equal(url.pathname,"/v2");
      if(mode==="rpc-error") return resp({jsonrpc:"2.0",id:1,error:{code:-32000,message:"RPC unavailable"}});
      return resp({jsonrpc:"2.0",id:1,result:mode==="drift"?"0x1":"0xf4240"});
    }
    assert.equal(url.hostname,network.host);
    assert.equal(url.searchParams.has("apikey"),false);
    assert.ok(url.pathname.startsWith(`/api/v2/tokens/${TOKEN}`));
    if(url.pathname===`/api/v2/tokens/${TOKEN}`) return resp({total_supply:"1000000"});
    assert.equal(url.pathname,`/api/v2/tokens/${TOKEN}/holders`);
    if(mode==="holder-error") return resp({message:"unavailable"},503);
    const after=url.searchParams.get("address_hash");
    if(after===ADDR(50)) return resp({items:rows(51),next_page_params:marker(51)});
    if(after===ADDR(100)) return resp({items:rows(101),next_page_params:null});
    return resp({items:rows(1),next_page_params:marker(1)});
  }) as typeof fetch;
  try{return await task(calls)} finally {
    globalThis.fetch=prevFetch;
    for(const k of keys) {if(prev[k]===undefined) delete process.env[k]; else process.env[k]=prev[k];}
  }
}

for(const context of contexts){
  test(`${context.networkId}: matching on-chain supply yields 100 holders + signed cursor`,async()=>{
    await mock(context,"ok",async calls=>{
      const r=await call(context);
      assert.equal(r.ok,true);
      if(!r.ok)return;
      assert.equal(r.data.holders.length,100);
      assert.equal(r.data.totalSupply,"1000000");
      assert.ok(r.data.nextCursor?.startsWith("blockscout:"));
      assert.equal(calls.length,4); // metadata, eth_call, two holder pages
      const cursor=r.data.nextCursor;
      if(!cursor)return;
      const count=calls.length;
      const changed=cursor.slice(0,25)+(cursor[25]==="A"?"B":"A")+cursor.slice(26);
      for(const entry of [
        {ctx:context,token:TOKEN,cursor:changed},
        {ctx:context,token:OTHER,cursor},
        {ctx:contexts.find(x=>x.networkId!==context.networkId)!,token:TOKEN,cursor},
      ]) assert.equal((await call(entry.ctx,entry.cursor,entry.token)).ok,false);
      assert.equal(calls.length,count,"invalid cursor must not issue RPC or holder HTTP");
      const continued=await call(context,cursor);
      assert.equal(continued.ok,true);
      if(continued.ok)assert.equal(continued.data.holders.length,50);
    });
  });
  for(const mode of ["drift","rpc-error"] as const){
    test(`${context.networkId}: ${mode} fails closed BEFORE holder requests`,async()=>{
      await mock(context,mode,async calls=>{
        const r=await call(context);
        assert.equal(r.ok,false);
        assert.equal(calls.filter(x=>x.includes("/holders")).length,0);
        assert.equal(calls.filter(x=>new URL(x).hostname===context.rpc).length,mode==="drift"?2:1);
        assert.equal(calls.length,mode==="drift"?4:2);
      });
    });
  }
  test(`${context.networkId}: no production or missing-secret egress`,async()=>{
    await mock(context,"ok",async calls=>{
      process.env.VERCEL_ENV="production";
      process.env.AYZO_GOLDRUSH_EXIT_CANARY="1";
      assert.equal((await call(context)).ok,false);
      process.env.VERCEL_ENV="preview";
      delete process.env.AYZO_HOLDER_CURSOR_SIGNING_KEY;
      assert.equal((await call(context)).ok,false);
      assert.equal(calls.length,0);
    });
  });
  test(`${context.networkId}: failed second holder page cannot fabricate Top100`,async()=>{
    await mock(context,"holder-error",async calls=>{
      const r=await call(context);
      assert.equal(r.ok,false);
      assert.equal(calls.filter(x=>x.includes("/holders")).length,1);
    });
  });
}
