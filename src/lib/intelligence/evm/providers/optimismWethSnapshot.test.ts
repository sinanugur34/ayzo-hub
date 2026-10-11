import assert from "node:assert/strict";
import test from "node:test";
import {
  blockscoutHoldersProvider,
  classifyIndexedSupplySnapshot,
} from "./indexedHolderAdapters";

const WETH = "0x4200000000000000000000000000000000000006";
const OPTIMISM = {networkId:"optimism" as const,name:"Optimism",chainId:10,nativeCurrency:"ETH"};
const ADDR = (n: number) => "0x" + n.toString(16).padStart(40,"0");
const INDEXED = "1000000000";
const ONCHAIN = "1000000010";
const uri = `https://explorer.optimism.io/api/v2/tokens/${WETH}`;
const holders = Array.from({length:100}, (_,i)=>({
  address:{hash: ADDR(i+1)},value:String(10000-i),
}));

function setEnvForMock() {
  const keys = ["VERCEL_ENV", "AYZO_INDEXED_HOLDER_CANARY", "AYZO_HOLDER_CURSOR_SIGNING_KEY", "ALCHEMY_API_KEY"] as const;
  const saved = keys.map(k=>[k,process.env[k]] as const);
  process.env.VERCEL_ENV="preview";
  process.env.AYZO_INDEXED_HOLDER_CANARY="1";
  process.env.AYZO_HOLDER_CURSOR_SIGNING_KEY="a".repeat(64);
  process.env.ALCHEMY_API_KEY="test-only-preview-credential";
  return () => {for(const [k,v] of saved){if(v===undefined) delete process.env[k];else process.env[k]=v;}};
}

async function runCase(onchain: string) {
  const restoreEnv=setEnvForMock();
  const oldFetch=globalThis.fetch;
  const calls: string[]=[];
  globalThis.fetch=async raw=>{
    const url=String(raw);
    calls.push(url);
    if(url==="https://opt-mainnet.g.alchemy.com/v2") {
      return Response.json({jsonrpc:"2.0",id:1,result:"0x"+BigInt(onchain).toString(16)});
    }
    if(url===uri) return Response.json({total_supply:INDEXED});
    if(url===`${uri}/holders`) return Response.json({items:holders.slice(0,50),
      next_page_params:{address_hash:ADDR(50),value:holders[49].value,items_count:50}});
    if(url.startsWith(`${uri}/holders?`)) return Response.json({items:holders.slice(50),
      next_page_params:{address_hash:ADDR(100),value:holders[99].value,items_count:50}});
    throw Error("Unexpected provider URL (only allowlisted mocks permitted)");
  };
  try {
    const result=await blockscoutHoldersProvider.getTokenHolders({network:OPTIMISM,address:WETH,limit:100,cursor:null});
    return {result,calls};
  } finally {globalThis.fetch=oldFetch;restoreEnv();}
}

test("pure classifier permits exact supplies on any token",()=>{
  assert.equal(classifyIndexedSupplySnapshot("optimism",WETH,"1000","0x3e8"),"verified");
  assert.equal(classifyIndexedSupplySnapshot("ethereum",WETH,"1000","0x3e8"),"verified");
});
test("only bounded upward Optimism WETH lag is eligible",()=>{
  assert.equal(classifyIndexedSupplySnapshot("optimism",WETH,INDEXED,"0x"+BigInt(ONCHAIN).toString(16)),"indexed_snapshot_only");
  assert.equal(classifyIndexedSupplySnapshot("optimism","0x"+"1".repeat(40),INDEXED,"0x"+BigInt(ONCHAIN).toString(16)),"reject");
  assert.equal(classifyIndexedSupplySnapshot("scroll",WETH,INDEXED,"0x"+BigInt(ONCHAIN).toString(16)),"reject");
  assert.equal(classifyIndexedSupplySnapshot("optimism",WETH,"1000","0x3e7"),"reject");
  assert.equal(classifyIndexedSupplySnapshot("optimism",WETH,"1000000000","0x"+(1001000000n).toString(16)),"reject");
  assert.equal(classifyIndexedSupplySnapshot("optimism",WETH,"garbage","0x3e8"),"reject");
});
test("Optimism WETH bounded lag returns 100 indexed addresses, no fake supply or percentage",async()=>{
  const {result,calls}=await runCase(ONCHAIN);
  assert.equal(result.ok,true);
  if(!result.ok)return;
  assert.equal(result.data.holders.length,100);
  assert.equal(result.data.totalSupply,null);
  assert.equal(result.data.supplyEvidence,"indexed_snapshot_only");
  assert.ok(result.data.holders.every(h=>h.percentage===null));
  assert.ok(result.data.nextCursor?.startsWith("blockscout:"));
  assert.equal(calls.length,6);
});
test("Optimism WETH exact supply retains verified percentages",async()=>{
  const {result,calls}=await runCase(INDEXED);
  assert.equal(result.ok,true);
  if(!result.ok)return;
  assert.equal(result.data.holders.length,100);
  assert.equal(result.data.totalSupply,INDEXED);
  assert.equal(result.data.supplyEvidence,"verified");
  assert.ok(result.data.holders.every(h=>typeof h.percentage==="number"));
  assert.equal(calls.length,4);
});
test("Optimism WETH excessive lag fails closed before requesting holders",async()=>{
  const {result,calls}=await runCase("1200000000");
  assert.equal(result.ok,false);
  assert.equal(calls.length,4);
  assert.ok(calls.every(c=>!c.includes("/holders")));
});
