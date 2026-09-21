import assert from "node:assert/strict";
import test from "node:test";

import {
  readMobileQuotaStatus,
} from "./mobileQuota";

test(
  "reads valid mobile quota metadata",
  () => {
    assert.deepEqual(
      readMobileQuotaStatus({
        limit: 3,
        remaining: 0,
        resetAt: 1_800_000_000_000,
      }),
      {
        limit: 3,
        remaining: 0,
        resetAt: 1_800_000_000_000,
      }
    );
  }
);

test(
  "accepts unavailable quota counters",
  () => {
    assert.deepEqual(
      readMobileQuotaStatus({
        limit: 25,
        remaining: null,
        resetAt: null,
      }),
      {
        limit: 25,
        remaining: null,
        resetAt: null,
      }
    );
  }
);

test(
  "rejects malformed quota metadata",
  () => {
    assert.equal(
      readMobileQuotaStatus({
        limit: -1,
        remaining: 0,
        resetAt: null,
      }),
      null
    );

    assert.equal(
      readMobileQuotaStatus({
        limit: 3,
        remaining: "0",
        resetAt: null,
      }),
      null
    );
  }
);
