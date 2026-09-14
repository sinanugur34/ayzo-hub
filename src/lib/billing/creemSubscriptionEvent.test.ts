import assert from "node:assert/strict";
import test from "node:test";

import {
  interpretCreemSubscriptionEvent,
} from "./creemSubscriptionEvent";

import type {
  CreemWebhookEvent,
} from "./creemWebhookPayload";

const USER_ID =
  "11111111-1111-4111-8111-111111111111";

const ENV_KEYS = {
  CREEM_PRO_MONTHLY_PRODUCT_ID:
    "prod_pro_month",
  CREEM_PRO_ANNUAL_PRODUCT_ID:
    "prod_pro_year",
  CREEM_ADVANCED_MONTHLY_PRODUCT_ID:
    "prod_advanced_month",
  CREEM_ADVANCED_ANNUAL_PRODUCT_ID:
    "prod_advanced_year",
};

for (
  const [
    key,
    value,
  ] of
  Object.entries(
    ENV_KEYS
  )
) {
  process.env[key] =
    value;
}

function event({
  eventType =
    "subscription.paid",
  productId =
    "prod_pro_month",
  price =
    1900,
  billingPeriod =
    "every-month",
  plan =
    "pro",
  interval =
    "monthly",
}: {
  eventType?: string;
  productId?: string;
  price?: number;
  billingPeriod?:
    string;
  plan?: string;
  interval?: string;
} = {}):
  CreemWebhookEvent {
  return {
    id:
      "evt_test",

    eventType,

    object: {
      id:
        "sub_test",

      status:
        "active",

      product: {
        id:
          productId,

        price,

        currency:
          "USD",

        billing_period:
          billingPeriod,
      },

      customer: {
        id:
          "cust_test",

        email:
          "test@example.com",
      },

      current_period_start_date:
        "2026-09-14T00:00:00.000Z",

      current_period_end_date:
        "2026-10-14T00:00:00.000Z",

      metadata: {
        ayzo_user_id:
          USER_ID,

        ayzo_plan:
          plan,

        ayzo_interval:
          interval,
      },
    },
  };
}

test(
  "subscription.paid grants verified Pro access",
  () => {
    const result =
      interpretCreemSubscriptionEvent(
        event()
      );

    assert.equal(
      result.action,
      "apply"
    );

    if (
      result.action !==
        "apply"
    ) {
      return;
    }

    assert.equal(
      result.planId,
      "pro"
    );

    assert.equal(
      result.status,
      "active"
    );

    assert.equal(
      result.lockedPriceUsdCents,
      1900
    );
  }
);

test(
  "Advanced annual product maps to Advanced annual",
  () => {
    const result =
      interpretCreemSubscriptionEvent(
        event({
          productId:
            "prod_advanced_year",
          price:
            66200,
          billingPeriod:
            "every-year",
          plan:
            "advanced",
          interval:
            "annual",
        })
      );

    assert.equal(
      result.action,
      "apply"
    );

    if (
      result.action ===
        "apply"
    ) {
      assert.equal(
        result.planId,
        "advanced"
      );

      assert.equal(
        result.billingInterval,
        "annual"
      );
    }
  }
);

test(
  "subscription.active does not grant access",
  () => {
    assert.deepEqual(
      interpretCreemSubscriptionEvent(
        event({
          eventType:
            "subscription.active",
        })
      ),
      {
        action:
          "ignore",
      }
    );
  }
);

test(
  "scheduled cancellation preserves access until period end",
  () => {
    const result =
      interpretCreemSubscriptionEvent(
        event({
          eventType:
            "subscription.scheduled_cancel",
        })
      );

    assert.equal(
      result.action,
      "apply"
    );

    if (
      result.action ===
        "apply"
    ) {
      assert.equal(
        result.status,
        "canceling"
      );

      assert.equal(
        result.cancelAtPeriodEnd,
        true
      );
    }
  }
);

test(
  "past due removes paid entitlement",
  () => {
    const result =
      interpretCreemSubscriptionEvent(
        event({
          eventType:
            "subscription.past_due",
        })
      );

    assert.equal(
      result.action,
      "apply"
    );

    if (
      result.action ===
        "apply"
    ) {
      assert.equal(
        result.status,
        "past_due"
      );
    }
  }
);

test(
  "canceled subscription becomes inactive",
  () => {
    const result =
      interpretCreemSubscriptionEvent(
        event({
          eventType:
            "subscription.canceled",
        })
      );

    assert.equal(
      result.action,
      "apply"
    );

    if (
      result.action ===
        "apply"
    ) {
      assert.equal(
        result.status,
        "inactive"
      );
    }
  }
);

test(
  "rejects Creem price contract tampering",
  () => {
    assert.throws(
      () =>
        interpretCreemSubscriptionEvent(
          event({
            price:
              1,
          })
        ),
      /CREEM_PRODUCT_CONTRACT_MISMATCH/
    );
  }
);

test(
  "rejects conflicting AYZO metadata",
  () => {
    assert.throws(
      () =>
        interpretCreemSubscriptionEvent(
          event({
            plan:
              "advanced",
          })
        ),
      /CREEM_METADATA_CONTRACT_MISMATCH/
    );
  }
);
