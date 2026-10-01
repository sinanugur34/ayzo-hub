import assert from "node:assert/strict";
import test from "node:test";

import {
  getAnalysisQuotaPolicy,
} from "@/lib/analysisQuotaPolicy";

test(
  "Free receives 3 analyses per 24h with max 2 per network",
  () => {
    const policy =
      getAnalysisQuotaPolicy(
        "free"
      );

    assert.equal(
      policy.plan,
      "free"
    );

    assert.equal(
      policy.limit,
      3
    );

    assert.equal(
      policy.perNetworkLimit,
      2
    );

    assert.equal(
      policy.windowSeconds,
      86400
    );
  }
);

test(
  "Pro receives 25 analyses per 24h with no per-network cap",
  () => {
    const policy =
      getAnalysisQuotaPolicy(
        "pro"
      );

    assert.equal(
      policy.plan,
      "pro"
    );

    assert.equal(
      policy.limit,
      25
    );

    assert.equal(
      policy.perNetworkLimit,
      null
    );

    assert.equal(
      policy.windowSeconds,
      86400
    );
  }
);

test(
  "Advanced receives 90 analyses per 24h with no per-network cap",
  () => {
    const policy =
      getAnalysisQuotaPolicy(
        "advanced"
      );

    assert.equal(
      policy.plan,
      "advanced"
    );

    assert.equal(
      policy.limit,
      90
    );

    assert.equal(
      policy.perNetworkLimit,
      null
    );

    assert.equal(
      policy.windowSeconds,
      86400
    );
  }
);
