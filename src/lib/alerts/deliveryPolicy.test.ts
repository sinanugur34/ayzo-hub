import assert from "node:assert/strict";
import test from "node:test";

import {
  isAlertDeliveryEnabled,
} from "./deliveryPolicy";

test(
  "delivery execution is enabled only by explicit true",
  () => {
    assert.equal(
      isAlertDeliveryEnabled(
        "true"
      ),
      true
    );

    assert.equal(
      isAlertDeliveryEnabled(
        " TRUE "
      ),
      true
    );
  }
);

test(
  "delivery execution fails closed for every non-true value",
  () => {
    for (
      const value of [
        undefined,
        "",
        "false",
        "1",
        "yes",
        "enabled",
      ]
    ) {
      assert.equal(
        isAlertDeliveryEnabled(
          value
        ),
        false
      );
    }
  }
);
