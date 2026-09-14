import assert from "node:assert/strict";
import test from "node:test";

import {
  getAnalysisQuotaPolicy,
} from "@/lib/analysisQuotaPolicy";

test(
  "Free receives 3 analyses per 24h",
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
      policy.windowSeconds,
      86400
    );
  }
);

test(
  "Pro receives 25 analyses per 24h",
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
      policy.windowSeconds,
      86400
    );
  }
);

test(
  "Advanced receives 90 analyses per 24h",
  () => {
    const advanced =
      getAnalysisQuotaPolicy(
        "advanced"
      );

    assert.equal(
      advanced.plan,
      "advanced"
    );

    assert.equal(
      advanced.limit,
      90
    );

    assert.equal(
      advanced.windowSeconds,
      86400
    );
  }
);
