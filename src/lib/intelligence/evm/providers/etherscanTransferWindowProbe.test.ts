import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { probeEtherscanTransferWindow } from "./etherscanTransferWindowProbe";

const row = (token: string, logIndex?: string) => ({
  hash:"0x"+"a".repeat(64), from:"0x"+"1".repeat(40), to:"0x"+"2".repeat(40),
  contractAddress:token, value:"123456", blockNumber:"1998", timeStamp:"1700000000",
  ...(logIndex === undefined ? {} : {logIndex}),
});
const answer = (payload: unknown) => new Response(JSON.stringify(payload), {status:200});
const head = {jsonrpc:"2.0",id:1,result:"0x7d0"}; // 2000

test("fixed chain/token, 2048-block bounds and one-row offset", async () => {
  for (const [network, id, token] of [
    ["sonic",146,"0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38"],
    ["mantle",5000,"0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8"],
  ] as const) {
    const seen: URL[] = [];
    const result = await probeEtherscanTransferWindow(network, {
      apiKey:"UNIT_TEST_ONLY", transport:async (input) => {
        const url=new URL(String(input)); seen.push(url);
        assert.equal(url.origin,"https://api.etherscan.io");
        assert.equal(url.searchParams.get("chainid"),String(id));
        return answer(seen.length===1 ? head : {status:"1",message:"OK",result:[row(token,"1")]});
      },
    });
    assert.equal(result.outcome,"EVENT_WITH_LOG_INDEX");
    assert.equal(result.examinedRows,1);
    assert.equal(seen.length,2);
    assert.equal(seen[0].searchParams.get("action"),"eth_blockNumber");
    const u=seen[1].searchParams;
    assert.equal(u.get("action"),"tokentx");
    assert.equal(u.get("contractaddress"),token);
    assert.equal(u.get("startblock"),"0");
    assert.equal(u.get("endblock"),"2000");
    assert.equal(u.get("offset"),"1");
    assert.equal(u.get("page"),"1");
    assert.equal(u.get("sort"),"desc");
    assert.equal(JSON.stringify(result).includes("UNIT_TEST_ONLY"),false);
  }
});

test("missing log index is not marked as verified event identity", async () => {
  let n=0;
  const res=await probeEtherscanTransferWindow("sonic",{
    apiKey:"TEST",transport:async()=>answer(++n===1 ? head :
      {status:"1",result:[row("0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38")]})
  });
  assert.equal(res.outcome,"EVENT_MISSING_LOG_INDEX");
  assert.equal(res.eventHasLogIndex,false);
});

test("empty window is diagnostic only, not evidence of actual transfers", async () => {
  let n=0;
  const res=await probeEtherscanTransferWindow("mantle",{
    apiKey:"TEST",transport:async()=>answer(++n===1 ? head :
      {status:"0",message:"No transactions found",result:[]})
  });
  assert.equal(res.outcome,"EMPTY_WINDOW");
  assert.equal(res.examinedRows,0);
});

test("plan restriction, rate limit, invalid payload and timeout fail closed", async () => {
  let n=0;
  const plan=await probeEtherscanTransferWindow("sonic",{
    apiKey:"TEST",transport:async()=>answer(++n===1?head:
      {status:"0",message:"NOTOK",result:"Free API access is not supported for this chain"})
  });
  assert.equal(plan.outcome,"PLAN_RESTRICTED");
  const rate=await probeEtherscanTransferWindow("sonic",{
    apiKey:"TEST",transport:async()=>new Response("{}",{status:429})
  });
  assert.equal(rate.outcome,"RATE_LIMITED");
  n=0;
  const invalid=await probeEtherscanTransferWindow("mantle",{
    apiKey:"TEST",transport:async()=>answer(++n===1?head:
      {status:"1",result:[row("0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38","4")]})
  });
  assert.equal(invalid.outcome,"INVALID_RESPONSE");
  const timeout=await probeEtherscanTransferWindow("sonic",{
    apiKey:"TEST",timeoutMs:100,
    transport:async(_url,init)=>new Promise<Response>((_resolve,reject)=>{
      init?.signal?.addEventListener("abort",()=>reject(new Error("aborted")),{once:true});
    }),
  });
  assert.equal(timeout.outcome,"TIMEOUT");
});

test("diagnostic is internal-authenticated and disabled outside Preview canary", () => {
  const src=readFileSync("src/app/api/internal/evm/etherscan-transfer-window-probe/route.ts","utf8");
  assert.match(src,/isInternalApiRequest\(request\)/);
  assert.match(src,/isGoldRushExitCanaryActive\(\)/);
  assert.match(src,/readJsonObjectBody\(request\)/);
  assert.match(src,/Cache-Control/);
});
