import assert from "node:assert/strict";
import test from "node:test";
import {existsSync,readFileSync} from "node:fs";
import {providerUsageFetch} from "@/lib/providerUsageHttpCore";
const retired=[
 "src/lib/intelligence/bitcoin/providers/goldrush.ts",
 "src/lib/intelligence/evm/providers/goldrush.ts",
 "src/lib/intelligence/evm/providers/goldrushTransfers.ts",
 "src/lib/intelligence/evm/providers/goldrushTransactions.ts",
 "src/lib/intelligence/evm/providers/goldrushNetworks.ts",
];
test("all five executable GoldRush implementation files are physically absent",()=>{
 for(const p of retired) assert.equal(existsSync(p),false,p);
});
test("default provider selection has no retired implementation imports",()=>{
 for(const p of ["src/lib/intelligence/bitcoin/historyFallback.ts",
 "src/lib/intelligence/evm/providers/preferredHolders.ts",
 "src/lib/intelligence/evm/providers/preferredTransfers.ts",
 "src/lib/intelligence/evm/providers/transactionResilience.ts",
 "src/lib/intelligence/evm/providers/transactionProviderFallback.ts"]){
   const s=readFileSync(p,"utf8");assert.doesNotMatch(s,/from ["'][^"']*\/goldrush(?:Transfers|Transactions|Networks)?["']/i,p);
 }
});
test("egress always denies retired provider, independent of flags",async()=>{
 let called=0;
 await assert.rejects(()=>providerUsageFetch({provider:"goldrush",operation:"retirement.test"},
   "https://api.covalenthq.com/v1",async()=>{called++;return {ok:true,status:200};}),/AYZO_GOLDRUSH_RETIRED/);
 assert.equal(called,0);
});
test("egress denies mislabelled retired host",async()=>{
 let called=0;
 await assert.rejects(()=>providerUsageFetch({provider:"alchemy",operation:"retirement.test"},
  "https://api.covalenthq.com/v1",async()=>{called++;return {ok:true,status:200};}),/AYZO_GOLDRUSH_RETIRED/);
 assert.equal(called,0);
});
