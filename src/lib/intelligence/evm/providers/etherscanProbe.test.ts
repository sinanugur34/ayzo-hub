import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { classifyEtherscanProbeMessage, probeEtherscanNetwork } from "./etherscanProbe";

const make = (x: unknown, status = 200) => new Response(JSON.stringify(x), {
  status, headers: { "content-type": "application/json" },
});

test("eth_blockNumber proof accepts valid Etherscan proxy block", async () => {
  const seen: number[] = [];
  for (const [network, chainId] of [["ethereum", 1], ["sonic", 146], ["mantle", 5000]] as const) {
    const result = await probeEtherscanNetwork(network, {
      apiKey: "TEST_ONLY_NEVER_REAL",
      transport: async input => {
        const url = new URL(String(input));
        assert.equal(url.origin, "https://api.etherscan.io");
        assert.equal(url.searchParams.get("action"), "eth_blockNumber");
        seen.push(Number(url.searchParams.get("chainid")));
        return make({ jsonrpc: "2.0", id: 1, result: "0x13a" });
      },
    });
    assert.equal(result.outcome, "AVAILABLE");
    assert.equal(result.chainId, chainId);
    assert.equal("apikey" in result, false);
  }
  assert.deepEqual(seen, [1, 146, 5000]);
});

test("free tier chain rejection is explicit, not accepted as empty evidence", async () => {
  const result = await probeEtherscanNetwork("sonic", {
    apiKey: "TEST_KEY",
    transport: async () => make({ status: "0", message: "NOTOK", result: "Free API access is not supported for this chain" }),
  });
  assert.equal(result.outcome, "PLAN_RESTRICTED");
  assert.equal(result.httpStatus, 200);
});

test("request rate limit and missing key are classified without secrets", async () => {
  const limited = await probeEtherscanNetwork("mantle", {
    apiKey: "TEST_KEY", transport: async () => make({ message: "wait" }, 429),
  });
  assert.equal(limited.outcome, "RATE_LIMITED");
  const missing = await probeEtherscanNetwork("mantle", { apiKey: "" });
  assert.equal(missing.outcome, "KEY_MISSING");
  assert.equal(JSON.stringify(limited).includes("TEST_KEY"), false);
});

test("timeout is explicit and does not return a successful probe", async () => {
  const result = await probeEtherscanNetwork("sonic", {
    apiKey: "TEST_KEY", timeoutMs: 100,
    transport: async (_url, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }),
  });
  assert.equal(result.outcome, "TIMEOUT");
});

test("upstream text does not leak and malformed response cannot pass", async () => {
  const result = await probeEtherscanNetwork("mantle", {
    apiKey: "TEST_KEY",
    transport: async () => make({ status: "0", result: "secret-example-do-not-echo" }),
  });
  assert.equal(result.outcome, "INVALID_RESPONSE");
  assert.equal(JSON.stringify(result).includes("secret-example"), false);
  assert.equal(classifyEtherscanProbeMessage(null), "INVALID_RESPONSE");
});

test("diagnostic route requires internal authorization AND preview-only canary", () => {
  const source = readFileSync("src/app/api/internal/evm/etherscan-probe/route.ts", "utf8");
  assert.match(source, /isInternalApiRequest\(request\)/);
  assert.match(source, /isGoldRushExitCanaryActive\(\)/);
  assert.match(source, /readJsonObjectBody\(request\)/);
  assert.match(source, /Cache-Control/);
});
