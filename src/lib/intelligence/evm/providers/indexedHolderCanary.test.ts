import assert from "node:assert/strict";
import test from "node:test";
import { isIndexedHolderCanaryAllowed as allowed } from "./indexedHolderCanary";

test("indexed holders are strictly opt-in", () => {
  assert.equal(allowed({ nodeEnv: "development" }), false);
  assert.equal(allowed({ flag: "0", nodeEnv: "development" }), false);
  assert.equal(allowed({ flag: "true", vercelEnv: "preview" }), false);
});

test("canary is allowed only on local development and Vercel Preview", () => {
  assert.equal(allowed({ flag: "1", nodeEnv: "development" }), true);
  assert.equal(allowed({ flag: "1", nodeEnv: "production", vercelEnv: "preview" }), true);
});

test("Production, testing and undeclared environments fail closed", () => {
  for (const env of [
    { flag: "1", nodeEnv: "production", vercelEnv: "production" },
    { flag: "1", nodeEnv: "development", vercelEnv: "production" },
    { flag: "1", nodeEnv: "test" },
    { flag: "1", nodeEnv: "production" },
    { flag: "1", nodeEnv: "development", vercelEnv: "development" },
  ]) assert.equal(allowed(env), false);
});
