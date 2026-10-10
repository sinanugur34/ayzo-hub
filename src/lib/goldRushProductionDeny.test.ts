import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { providerUsageFetch } from "./providerUsageHttpCore";

// These tests use a synthetic callback; no real HTTP/RPC calls occur.
async function withPolicy(
  mode: string | undefined,
  fn: () => Promise<void>
) {
  const envKeys = ["AYZO_GOLDRUSH_EGRESS_MODE", "AYZO_GOLDRUSH_EXIT_CANARY", "VERCEL_ENV"] as const;
  const old = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  try {
    process.env.VERCEL_ENV = "production";
    delete process.env.AYZO_GOLDRUSH_EXIT_CANARY;
    if (mode === undefined) delete process.env.AYZO_GOLDRUSH_EGRESS_MODE;
    else process.env.AYZO_GOLDRUSH_EGRESS_MODE = mode;
    await fn();
  } finally {
    for (const key of envKeys) {
      const previous = old[key];
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
  }
}

async function synthetic(
  provider: string,
  url: string,
  expectation: "blocked" | "allowed"
) {
  let calls = 0;
  const perform = () => providerUsageFetch(
    { provider, operation: "ayzo.zero-egress.synthetic" },
    new URL(url),
    async () => {
      calls += 1;
      return { ok: true, status: 200 };
    }
  );
  if (expectation === "blocked") {
    await assert.rejects(perform, /AYZO_GOLDRUSH_RETIRED/);
    assert.equal(calls, 0, "blocked egress must not invoke transport callback");
  } else {
    const response = await perform();
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
  }
}

test("production deny blocks correctly labelled GoldRush HTTP", async () => {
  await withPolicy("deny", () => synthetic(
    "goldrush", "https://api.covalenthq.com/v1/", "blocked"
  ));
});

test("production deny blocks mislabelled GoldRush host", async () => {
  await withPolicy("deny", () => synthetic(
    "unknown-provider", "https://api.covalenthq.com/v1/", "blocked"
  ));
});

test("production deny blocks subdomains and exact root host", async () => {
  await withPolicy("deny", async () => {
    await synthetic("other", "https://covalenthq.com/test", "blocked");
    await synthetic("other", "https://sub.api.covalenthq.com/v1/", "blocked");
  });
});

test("production deny does not block legitimate other providers", async () => {
  await withPolicy("deny", async () => {
    await synthetic("alchemy", "https://solana-mainnet.g.alchemy.com/v2/test", "allowed");
    await synthetic("blockscout", "https://api.blockscout.com/api/", "allowed");
  });
});

test("production deny does not confuse lookalike domains", async () => {
  await withPolicy("deny", () => synthetic(
    "other", "https://api.covalenthq.com.attacker.test/v1/", "allowed"
  ));
});

test("default mode permanently blocks retired egress", async () => {
  await withPolicy(undefined, () => synthetic(
    "goldrush", "https://api.covalenthq.com/v1/", "blocked"
  ));
});

test("retired HTTP adapters no longer exist and deny boundary remains", () => {
  const core = readFileSync("src/lib/providerUsageHttpCore.ts", "utf8");
  assert.match(core, /AYZO_GOLDRUSH_RETIRED/);
  for (const file of [
    "src/lib/intelligence/bitcoin/providers/goldrush.ts",
    "src/lib/intelligence/evm/providers/goldrush.ts",
    "src/lib/intelligence/evm/providers/goldrushTransactions.ts",
    "src/lib/intelligence/evm/providers/goldrushTransfers.ts",
  ]) {
    assert.throws(() => readFileSync(file, "utf8"), { code: "ENOENT" });
  }
});
