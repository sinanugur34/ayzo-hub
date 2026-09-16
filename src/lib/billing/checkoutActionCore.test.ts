import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveCheckoutAction,
} from "./checkoutActionCore";

test(
  "Free to Pro uses checkout",
  () => {
    assert.equal(
      resolveCheckoutAction({
        currentPlan:
          "free",
        targetPlan:
          "pro",
        confirmUpgrade:
          false,
      }),
      "checkout"
    );
  }
);

test(
  "Free to Advanced uses checkout",
  () => {
    assert.equal(
      resolveCheckoutAction({
        currentPlan:
          "free",
        targetPlan:
          "advanced",
        confirmUpgrade:
          false,
      }),
      "checkout"
    );
  }
);

test(
  "Pro to Pro is rejected as same plan",
  () => {
    assert.equal(
      resolveCheckoutAction({
        currentPlan:
          "pro",
        targetPlan:
          "pro",
        confirmUpgrade:
          false,
      }),
      "same-plan"
    );
  }
);

test(
  "Advanced to Advanced is rejected as same plan",
  () => {
    assert.equal(
      resolveCheckoutAction({
        currentPlan:
          "advanced",
        targetPlan:
          "advanced",
        confirmUpgrade:
          false,
      }),
      "same-plan"
    );
  }
);

test(
  "Advanced to Pro is a blocked downgrade",
  () => {
    assert.equal(
      resolveCheckoutAction({
        currentPlan:
          "advanced",
        targetPlan:
          "pro",
        confirmUpgrade:
          false,
      }),
      "downgrade-blocked"
    );
  }
);

test(
  "Pro to Advanced requires confirmation first",
  () => {
    assert.equal(
      resolveCheckoutAction({
        currentPlan:
          "pro",
        targetPlan:
          "advanced",
        confirmUpgrade:
          false,
      }),
      "upgrade-confirmation"
    );
  }
);

test(
  "Confirmed Pro to Advanced performs in-place upgrade",
  () => {
    assert.equal(
      resolveCheckoutAction({
        currentPlan:
          "pro",
        targetPlan:
          "advanced",
        confirmUpgrade:
          true,
      }),
      "upgrade"
    );
  }
);
