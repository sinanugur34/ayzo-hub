import assert from "node:assert/strict";
import test from "node:test";

import {
  GOOGLE_PLAY_PRODUCT_IDS,
  GOOGLE_PLAY_SUBSCRIPTIONS,
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
  "locks live Google Play base plan ids",
  () => {
    assert.equal(
      GOOGLE_PLAY_SUBSCRIPTIONS.pro.basePlans.monthly,
      "monthly-v2"
    );

    assert.equal(
      GOOGLE_PLAY_SUBSCRIPTIONS.pro.basePlans.annual,
      "annual"
    );

    assert.equal(
      GOOGLE_PLAY_SUBSCRIPTIONS.advanced.basePlans.monthly,
      "monthly"
    );

    assert.equal(
      GOOGLE_PLAY_SUBSCRIPTIONS.advanced.basePlans.annual,
      "annual"
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
        "monthly-v2"
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
