import assert from "node:assert/strict";
import test from "node:test";

import {
  interpretFastSpringSubscriptionEvent,
} from "@/lib/billing/fastspringSubscriptionEvent";

import type {
  FastSpringWebhookEvent,
} from "@/lib/billing/fastspringWebhookPayload";

const contract = {
  monthlyProductPath:
    "ayzo-pro-founding-monthly",

  annualProductPath:
    "ayzo-pro-founding-annual",

  monthlyPriceCents:
    1900,

  annualPriceCents:
    19380,
};

function event(
  type:
    string,
  overrides:
    Record<
      string,
      unknown
    > = {}
): FastSpringWebhookEvent {
  return {
    id:
      `evt-${type}`,

    type,

    live:
      false,

    created:
      1788510000000,

    data: {
      id:
        "sub-ayzo-test",

      subscription:
        "sub-ayzo-test",

      product: {
        product:
          "ayzo-pro-founding-monthly",
      },

      begin:
        1788510000000,

      next:
        1791102000000,

      tags: {
        ayzoUserId:
          "123e4567-e89b-42d3-a456-426614174000",

        ayzoPlan:
          "pro",

        ayzoBillingInterval:
          "monthly",

        ayzoExpectedPriceCents:
          "1900",

        ayzoContractVersion:
          "founding-v1",
      },

      ...overrides,
    },
  };
}

test(
  "activated creates active Pro mutation",
  () => {
    const result =
      interpretFastSpringSubscriptionEvent(
        event(
          "subscription.activated"
        ),
        contract
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
      result.mutation
        .status,
      "active"
    );

    assert.equal(
      result.mutation
        .lockedPriceUsdCents,
      1900
    );
  }
);

test(
  "canceled preserves access until deactivation",
  () => {
    const result =
      interpretFastSpringSubscriptionEvent(
        event(
          "subscription.canceled",
          {
            deactivationDate:
              1791102000000,
          }
        ),
        contract
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
      result.mutation
        .status,
      "canceling"
    );

    assert.equal(
      result.mutation
        .cancelAtPeriodEnd,
      true
    );
  }
);

test(
  "deactivated removes paid status",
  () => {
    const result =
      interpretFastSpringSubscriptionEvent(
        event(
          "subscription.deactivated",
          {
            deactivationDate:
              1791102000000,
          }
        ),
        contract
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
      result.mutation
        .status,
      "inactive"
    );
  }
);

test(
  "rejects unknown products",
  () => {
    const result =
      interpretFastSpringSubscriptionEvent(
        event(
          "subscription.activated",
          {
            product: {
              product:
                "not-ayzo-pro",
            },
          }
        ),
        contract
      );

    assert.equal(
      result.action,
      "ignore"
    );
  }
);

test(
  "rejects tampered price contract",
  () => {
    const result =
      interpretFastSpringSubscriptionEvent(
        event(
          "subscription.activated",
          {
            tags: {
              ayzoUserId:
                "123e4567-e89b-42d3-a456-426614174000",

              ayzoPlan:
                "pro",

              ayzoBillingInterval:
                "monthly",

              ayzoExpectedPriceCents:
                "1",

              ayzoContractVersion:
                "founding-v1",
            },
          }
        ),
        contract
      );

    assert.equal(
      result.action,
      "ignore"
    );
  }
);

test(
  "does not grant Pro without bounded period",
  () => {
    const result =
      interpretFastSpringSubscriptionEvent(
        event(
          "subscription.activated",
          {
            next:
              null,
          }
        ),
        contract
      );

    assert.equal(
      result.action,
      "ignore"
    );
  }
);
