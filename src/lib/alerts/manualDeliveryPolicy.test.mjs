import assert from "node:assert/strict";
import test from "node:test";
import {
  createRequire,
} from "node:module";

const require =
  createRequire(
    import.meta.url
  );

const {
  MANUAL_ALERT_DELIVERY_CLAIM_LIMIT,
  isValidManualAlertDeliveryClaimLimit,
} =
  require(
    "./manualDeliveryPolicy.ts"
  );

test(
  "manual delivery claim limit is exactly one",
  () => {
    assert.equal(
      MANUAL_ALERT_DELIVERY_CLAIM_LIMIT,
      1
    );
  }
);

test(
  "manual delivery accepts only exact numeric one",
  () => {
    assert.equal(
      isValidManualAlertDeliveryClaimLimit(
        1
      ),
      true
    );

    for (
      const value of [
        undefined,
        null,
        0,
        2,
        10,
        "1",
        true,
        {},
        [],
      ]
    ) {
      assert.equal(
        isValidManualAlertDeliveryClaimLimit(
          value
        ),
        false
      );
    }
  }
);
