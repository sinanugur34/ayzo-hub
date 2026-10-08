import assert from "node:assert/strict";
import test from "node:test";
import { isGoldRushExitCanaryAllowed } from "./goldRushExitCanary";
import { providerUsageFetch } from "./providerUsageHttpCore";

const gate = (flag: string | undefined, nodeEnv: string | undefined, vercelEnv?: string) =>
  isGoldRushExitCanaryAllowed({ flag, nodeEnv, vercelEnv });

test("zero-egress guard rejects missing and invalid flags", () => {
  for (const flag of [undefined, "0", "true", "yes", "01"]) {
    assert.equal(gate(flag, "production", "preview"), false);
  }
});
test("zero-egress guard works only in Preview or local development", () => {
  assert.equal(gate("1", "production", "preview"), true);
  assert.equal(gate("1", "development", undefined), true);
  assert.equal(gate("1", "production", "production"), false);
  assert.equal(gate("1", "development", "production"), false);
  assert.equal(gate("1", "production", undefined), false);
  assert.equal(gate("1", "test", undefined), false);
});

function withEnv(env: Record<string, string | undefined>, cb: () => Promise<void>) {
  const original = Object.fromEntries(Object.keys(env).map(k => [k, process.env[k]]));
  Object.entries(env).forEach(([k, v]) => { if (v === undefined) delete process.env[k]; else process.env[k] = v; });
  return cb().finally(() => Object.entries(original).forEach(([k, v]) => {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }));
}

test("Preview ON prevents GoldRush callback and is not a synthetic HTTP success", async () => {
  await withEnv({ AYZO_GOLDRUSH_EXIT_CANARY: "1", VERCEL_ENV: "preview" }, async () => {
    let calls = 0;
    await assert.rejects(() => providerUsageFetch(
      { provider: "goldrush", operation: "evm.transactions" },
      new URL("https://api.covalenthq.com/v1/1/address/0x0/"),
      async () => { calls++; return { ok: true, status: 200 }; },
    ), /GoldRush outbound HTTP blocked/);
    assert.equal(calls, 0);
  });
});

test("Preview ON blocks mislabelled requests by exact GoldRush host", async () => {
  await withEnv({ AYZO_GOLDRUSH_EXIT_CANARY: "1", VERCEL_ENV: "preview" }, async () => {
    let calls = 0;
    await assert.rejects(() => providerUsageFetch(
      { provider: "other-provider", operation: "test" },
      new URL("https://api.covalenthq.com/v1/"),
      async () => { calls++; return { ok: true, status: 200 }; },
    ), /blocked/);
    assert.equal(calls, 0);
  });
});

test("Preview ON does not block alternative hosts or lookalike domains", async () => {
  await withEnv({ AYZO_GOLDRUSH_EXIT_CANARY: "1", VERCEL_ENV: "preview" }, async () => {
    for (const host of ["api.blockscout.com", "covalenthq.com.evil.test"]) {
      let calls = 0;
      const response = await providerUsageFetch(
        { provider: "blockscout", operation: "test" },
        new URL(`https://${host}/foo`),
        async () => { calls++; return { ok: true, status: 200 }; },
      );
      assert.equal(response.status, 200);
      assert.equal(calls, 1);
    }
  });
});

test("Production ignores zero-egress Preview flag", async () => {
  await withEnv({ AYZO_GOLDRUSH_EXIT_CANARY: "1", VERCEL_ENV: "production" }, async () => {
    let calls = 0;
    const response = await providerUsageFetch(
      { provider: "goldrush", operation: "test" },
      new URL("https://api.covalenthq.com/v1/"),
      async () => { calls++; return { ok: true, status: 200 }; },
    );
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
  });
});
