import assert from "node:assert/strict";
import test from "node:test";

import {
  getUpgradePlanVisibility,
} from "./visibility";

test(
  "Free sees only Pro and Advanced upgrades",
  () => {
    assert.deepEqual(
      getUpgradePlanVisibility(
        "free"
      ),
      {
        free: false,
        pro: true,
        advanced: true,
      }
    );
  }
);

test(
  "Pro sees only Advanced upgrade",
  () => {
    assert.deepEqual(
      getUpgradePlanVisibility(
        "pro"
      ),
      {
        free: false,
        pro: false,
        advanced: true,
      }
    );
  }
);

test(
  "Advanced sees no active or lower plans",
  () => {
    assert.deepEqual(
      getUpgradePlanVisibility(
        "advanced"
      ),
      {
        free: false,
        pro: false,
        advanced: false,
      }
    );
  }
);
