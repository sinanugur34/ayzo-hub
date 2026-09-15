import assert from "node:assert/strict";
import test from "node:test";

import {
  getEvmDeepFundingPolicy,
} from "./deepFundingPolicy";

test("Free Deep Funding is disabled", () => {
  assert.deepEqual(
    getEvmDeepFundingPolicy("free"),
    { enabled: false }
  );
});

test("Pro Deep Funding is disabled", () => {
  assert.deepEqual(
    getEvmDeepFundingPolicy("pro"),
    { enabled: false }
  );
});

test("Advanced Deep Funding is bounded and enabled", () => {
  const policy =
    getEvmDeepFundingPolicy(
      "advanced"
    );

  assert.equal(
    policy.enabled,
    true
  );

  if (!policy.enabled) {
    throw new Error(
      "Expected Advanced policy."
    );
  }

  assert.equal(
    policy.maxHops,
    3
  );

  assert.equal(
    policy.maxNodes,
    10
  );

  assert.equal(
    policy.transactionPagesPerNode,
    2
  );

  assert.equal(
    policy.providerRequestBudget,
    12
  );
});
