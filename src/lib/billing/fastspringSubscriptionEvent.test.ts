import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizeFastSpringExistingSubscriptionPeriod,
  interpretFastSpringSubscriptionEvent,
  normalizeFastSpringExistingSubscriptionEvent,
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
  "deactivated preserves existing period when provider end predates start",
  () => {
    const result =
      canonicalizeFastSpringExistingSubscriptionPeriod({
        eventType:
          "subscription.deactivated",

        incomingStart:
          "2026-09-06T20:27:51.299Z",

        incomingEnd:
          "2026-09-06T00:00:00.000Z",

        existingStart:
          "2026-09-06T20:27:51.299Z",

        existingEnd:
          "2026-10-06T00:00:00.000Z",
      });

    assert.deepEqual(
      result,
      {
        currentPeriodStart:
          "2026-09-06T20:27:51.299Z",

        currentPeriodEnd:
          "2026-10-06T00:00:00.000Z",
      }
    );
  }
);

test(
  "deactivated accepts a valid provider terminal period",
  () => {
    const result =
      canonicalizeFastSpringExistingSubscriptionPeriod({
        eventType:
          "subscription.deactivated",

        incomingStart:
          "2026-09-06T20:27:51.299Z",

        incomingEnd:
          "2026-09-07T20:27:51.299Z",

        existingStart:
          "2026-09-06T20:27:51.299Z",

        existingEnd:
          "2026-10-06T00:00:00.000Z",
      });

    assert.deepEqual(
      result,
      {
        currentPeriodStart:
          "2026-09-06T20:27:51.299Z",

        currentPeriodEnd:
          "2026-09-07T20:27:51.299Z",
      }
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


test(
  "charge completed restores existing subscription metadata",
  () => {
    const input =
      event(
        "subscription.charge.completed",
        {
          tags:
            undefined,
        }
      );

    const normalized =
      normalizeFastSpringExistingSubscriptionEvent({
        event:
          input,

        existing: {
          userId:
            "123e4567-e89b-42d3-a456-426614174000",

          billingInterval:
            "monthly",

          lockedPriceUsdCents:
            1900,

          monthlyProductPath:
            "ayzo-pro-founding-monthly",

          annualProductPath:
            "ayzo-pro-founding-annual",
        },
      });

    const result =
      interpretFastSpringSubscriptionEvent(
        normalized,
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
      result.mutation.status,
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
  "uncanceled restores active Pro from existing subscription metadata",
  () => {
    const normalized =
      normalizeFastSpringExistingSubscriptionEvent({
        event:
          event(
            "subscription.uncanceled",
            {
              tags:
                undefined,

              product:
                undefined,
            }
          ),

        existing: {
          userId:
            "123e4567-e89b-42d3-a456-426614174000",

          billingInterval:
            "monthly",

          lockedPriceUsdCents:
            1900,

          monthlyProductPath:
            "ayzo-pro-founding-monthly",

          annualProductPath:
            "ayzo-pro-founding-annual",
        },
      });

    const result =
      interpretFastSpringSubscriptionEvent(
        normalized,
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
      result.mutation.status,
      "active"
    );

    assert.equal(
      result.mutation
        .cancelAtPeriodEnd,
      false
    );
  }
);

test(
  "existing subscription rejects conflicting AYZO ownership metadata",
  () => {
    assert.throws(
      () =>
        normalizeFastSpringExistingSubscriptionEvent({
          event:
            event(
              "subscription.charge.completed",
              {
                tags: {
                  ayzoUserId:
                    "223e4567-e89b-42d3-a456-426614174000",

                  ayzoPlan:
                    "pro",

                  ayzoBillingInterval:
                    "monthly",

                  ayzoExpectedPriceCents:
                    "1900",

                  ayzoContractVersion:
                    "founding-v1",
                },
              }
            ),

          existing: {
            userId:
              "123e4567-e89b-42d3-a456-426614174000",

            billingInterval:
              "monthly",

            lockedPriceUsdCents:
              1900,

            monthlyProductPath:
              "ayzo-pro-founding-monthly",

            annualProductPath:
              "ayzo-pro-founding-annual",
          },
        }),
      /lifecycle tag conflict/
    );
  }
);

test(
  "existing subscription rejects conflicting FastSpring product metadata",
  () => {
    assert.throws(
      () =>
        normalizeFastSpringExistingSubscriptionEvent({
          event:
            event(
              "subscription.charge.completed",
              {
                product: {
                  product:
                    "wrong-product",
                },
              }
            ),

          existing: {
            userId:
              "123e4567-e89b-42d3-a456-426614174000",

            billingInterval:
              "monthly",

            lockedPriceUsdCents:
              1900,

            monthlyProductPath:
              "ayzo-pro-founding-monthly",

            annualProductPath:
              "ayzo-pro-founding-annual",
          },
        }),
      /lifecycle product conflict/
    );
  }
);
