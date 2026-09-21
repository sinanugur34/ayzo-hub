import assert from "node:assert/strict";
import test from "node:test";

import {
  GOOGLE_PLAY_PRODUCT_IDS,
  getGooglePlayIntervalForBasePlanId,
  getGooglePlayPlanForProductId,
} from "./googlePlayCatalog";

test(
  "locks Google Play subscription product ids",
  () => {
    assert.deepEqual(
      [...GOOGLE_PLAY_PRODUCT_IDS],
      [
        "ayzo_pro",
        "ayzo_advanced",
      ]
    );
  }
);

test(
  "maps Google Play products to AYZO plans",
  () => {
    assert.equal(
      getGooglePlayPlanForProductId(
        "ayzo_pro"
      ),
      "pro"
    );

    assert.equal(
      getGooglePlayPlanForProductId(
        "ayzo_advanced"
      ),
      "advanced"
    );

    assert.equal(
      getGooglePlayPlanForProductId(
        "unknown"
      ),
      null
    );
  }
);

test(
  "maps Google Play base plans to billing intervals",
  () => {
    assert.equal(
      getGooglePlayIntervalForBasePlanId(
        "monthly"
      ),
      "monthly"
    );

    assert.equal(
      getGooglePlayIntervalForBasePlanId(
        "annual"
      ),
      "annual"
    );

    assert.equal(
      getGooglePlayIntervalForBasePlanId(
        "trial"
      ),
      null
    );
  }
);
