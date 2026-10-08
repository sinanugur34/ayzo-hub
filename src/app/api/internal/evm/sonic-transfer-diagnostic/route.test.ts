import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const src=readFileSync("src/app/api/internal/evm/sonic-transfer-diagnostic/route.ts","utf8");
test("Sonic diagnostic is internal-authenticated and preview gated",()=>{
 assert.match(src,/isInternalApiRequest\(request\)/);
 assert.match(src,/isGoldRushExitCanaryActive\(\)/);
 assert.match(src,/readJsonObjectBody\(request\)/);
});
test("Sonic diagnostic has fixed endpoint, token, capped bytes and timeout",()=>{
 assert.match(src,/https:\/\/api\.etherscan\.io\/v2\/api/);
 assert.match(src,/0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38/);
 assert.match(src,/256 \* 1024/);
 assert.match(src,/setTimeout\(\(\)=>controller\.abort\(\),5000\)/);
 assert.match(src,/providerUsageFetch/);
});
test("Sonic diagnostic returns only aggregate category, never URL or upstream body",()=>{
 assert.match(src,/direction,category,http,count,details,durationMs/);
 assert.doesNotMatch(src,/console\.log/);
});
