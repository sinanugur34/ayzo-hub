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
  "Pro receives 30 analyses per 24h",
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
      30
    );

    assert.equal(
      policy.windowSeconds,
      86400
    );
  }
);

test(
  "Advanced safely falls back to Free quota while disabled",
  () => {
    const policy =
      getAnalysisQuotaPolicy(
        "advanced"
      );

    assert.equal(
      policy.plan,
      "free"
    );

    assert.equal(
      policy.limit,
      3
    );
  }
);
