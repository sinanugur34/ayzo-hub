import assert from "node:assert/strict";
import test from "node:test";

import {
  ADVANCED_TEMPORAL_WINDOW_MS,
  getEvmCoordinationPolicy,
} from "./coordinationPolicy";

test(
  "Free does not receive temporal coordination correlation",
  () => {
    assert.deepEqual(
      getEvmCoordinationPolicy(
        "free"
      ),
      {
        includesTemporalCorrelation:
          false,

        temporalWindowMs:
          null,
      }
    );
  }
);

test(
  "Pro does not receive temporal coordination correlation",
  () => {
    assert.deepEqual(
      getEvmCoordinationPolicy(
        "pro"
      ),
      {
        includesTemporalCorrelation:
          false,

        temporalWindowMs:
          null,
      }
    );
  }
);

test(
  "Advanced receives bounded temporal coordination correlation",
  () => {
    const policy =
      getEvmCoordinationPolicy(
        "advanced"
      );

    assert.equal(
      policy
        .includesTemporalCorrelation,
      true
    );

    assert.equal(
      policy.temporalWindowMs,
      ADVANCED_TEMPORAL_WINDOW_MS
    );

    assert.equal(
      policy.temporalWindowMs,
      900_000
    );
  }
);
