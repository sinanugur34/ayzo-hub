import assert from "node:assert/strict";
import test from "node:test";

import {
  interpretGooglePlaySubscription,
} from "./googlePlaySubscriptionCore";

const NOW =
  new Date(
    "2026-09-21T20:00:00Z"
  );

test(
  "verifies active Pro monthly Play subscription",
  () => {
    const result =
      interpretGooglePlaySubscription(
        {
          startTime:
            "2026-09-21T19:00:00Z",

          subscriptionState:
            "SUBSCRIPTION_STATE_ACTIVE",

          acknowledgementState:
            "ACKNOWLEDGEMENT_STATE_PENDING",

          lineItems: [
            {
              productId:
                "ayzo_pro",

              expiryTime:
                "2026-10-21T19:00:00Z",

              autoRenewingPlan: {
                autoRenewEnabled:
                  true,
              },

              offerDetails: {
                basePlanId:
                  "monthly-v2",
              },
            },
          ],
        },
        NOW
      );

    assert.equal(
      result?.planId,
      "pro"
    );

    assert.equal(
      result?.billingInterval,
      "monthly"
    );

    assert.equal(
      result?.status,
      "active"
    );

    assert.equal(
      result?.shouldAcknowledge,
      true
    );

    assert.equal(
      result?.lockedPriceUsdCents,
      1900
    );
  }
);

test(
  "keeps canceled subscription until expiry",
  () => {
    const result =
      interpretGooglePlaySubscription(
        {
          startTime:
            "2026-01-01T00:00:00Z",

          subscriptionState:
            "SUBSCRIPTION_STATE_CANCELED",

          acknowledgementState:
            "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",

          lineItems: [
            {
              productId:
                "ayzo_advanced",

              expiryTime:
                "2027-01-01T00:00:00Z",

              autoRenewingPlan: {
                autoRenewEnabled:
                  false,
              },

              offerDetails: {
                basePlanId:
                  "annual",
              },
            },
          ],
        },
        NOW
      );

    assert.equal(
      result?.planId,
      "advanced"
    );

    assert.equal(
      result?.status,
      "canceling"
    );

    assert.equal(
      result?.cancelAtPeriodEnd,
      true
    );
  }
);

test(
  "maps on-hold subscription to past due",
  () => {
    const result =
      interpretGooglePlaySubscription(
        {
          subscriptionState:
            "SUBSCRIPTION_STATE_ON_HOLD",

          acknowledgementState:
            "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",

          lineItems: [
            {
              productId:
                "ayzo_pro",

              expiryTime:
                "2026-10-01T00:00:00Z",

              offerDetails: {
                basePlanId:
                  "monthly-v2",
              },
            },
          ],
        },
        NOW
      );

    assert.equal(
      result?.status,
      "past_due"
    );
  }
);

test(
  "rejects unknown Play product contract",
  () => {
    const result =
      interpretGooglePlaySubscription(
        {
          subscriptionState:
            "SUBSCRIPTION_STATE_ACTIVE",

          lineItems: [
            {
              productId:
                "fake_product",

              expiryTime:
                "2026-10-01T00:00:00Z",

              offerDetails: {
                basePlanId:
                  "monthly",
              },
            },
          ],
        },
        NOW
      );

    assert.equal(
      result,
      null
    );
  }
);
