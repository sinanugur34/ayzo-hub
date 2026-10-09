import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "./route";

const endpoint = "https://example.invalid/api/internal/evm/ethereum-holder-stage-diagnostic";
function makeRequest(body: unknown, key?: string) {
  return new Request(endpoint, {method:"POST",headers:{"content-type":"application/json", ...(key?{"x-ayzo-internal-key":key}:{})},body:JSON.stringify(body)});
}
test("Ethereum holder stage diagnostic refuses unauthenticated access without network",async()=>{
  const fetchOld=globalThis.fetch; let calls=0;
  globalThis.fetch=(async()=>{calls++;throw Error("network forbidden");}) as typeof fetch;
  try {const r=await POST(makeRequest({}));assert.equal(r.status,403);assert.equal((await r.json()).category,"BLOCKED");assert.equal(calls,0);}
  finally{globalThis.fetch=fetchOld;}
});
test("Ethereum holder stage diagnostic refuses production and arbitrary input before network",async()=>{
  const names=["AYZO_INTERNAL_API_KEY","VERCEL_ENV","AYZO_GOLDRUSH_EXIT_CANARY","AYZO_INDEXED_HOLDER_CANARY"] as const;
  const original=Object.fromEntries(names.map(k=>[k,process.env[k]]));
  const key="integration-test-long-internal-key-for-closed-probe";
  const oldFetch=globalThis.fetch;let calls=0;
  globalThis.fetch=(async()=>{calls++;throw Error("network forbidden");}) as typeof fetch;
  try{
    process.env.AYZO_INTERNAL_API_KEY=key;
    process.env.VERCEL_ENV="production";
    process.env.AYZO_GOLDRUSH_EXIT_CANARY="1";
    process.env.AYZO_INDEXED_HOLDER_CANARY="1";
    assert.equal((await POST(makeRequest({},key))).status,404);
    process.env.VERCEL_ENV="preview";
    assert.equal((await POST(makeRequest({token:"bad"},key))).status,400);
    process.env.AYZO_INDEXED_HOLDER_CANARY="0";
    assert.equal((await POST(makeRequest({},key))).status,404);
    assert.equal(calls,0);
  } finally {
    globalThis.fetch=oldFetch;
    for(const n of names){const v=original[n];if(v===undefined)delete process.env[n];else process.env[n]=v;}
  }
});
