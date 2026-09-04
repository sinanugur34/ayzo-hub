import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveAccountEntitlement,
  type SubscriptionEntitlementRow,
} from "@/lib/billing/entitlement-core";

const NOW =
  new Date(
    "2026-09-04T12:00:00Z"
  );

function row(
  overrides:
    Partial<SubscriptionEntitlementRow> = {}
): SubscriptionEntitlementRow {
  return {
    plan_id:
      "pro",

    billing_interval:
      "monthly",

    status:
      "active",

    locked_price_usd_cents:
      1900,

    current_period_end:
      "2026-10-04T12:00:00Z",

    cancel_at_period_end:
      false,

    founding_customer:
      true,

    ...overrides,
  };
}

test(
  "free without subscription",
  () => {
    assert.equal(
      resolveAccountEntitlement(
        [],
        NOW
      ).planId,
      "free"
    );
  }
);

test(
  "valid active Pro grants Pro",
  () => {
    assert.equal(
      resolveAccountEntitlement(
        [row()],
        NOW
      ).planId,
      "pro"
    );
  }
);

test(
  "canceling Pro keeps access until period end",
  () => {
    const result =
      resolveAccountEntitlement(
        [
          row({
            status:
              "canceling",
            cancel_at_period_end:
              true,
          }),
        ],
        NOW
      );

    assert.equal(
      result.planId,
      "pro"
    );

    assert.equal(
      result.cancelAtPeriodEnd,
      true
    );
  }
);

test(
  "expired Pro falls back to Free",
  () => {
    assert.equal(
      resolveAccountEntitlement(
        [
          row({
            current_period_end:
              "2026-09-01T00:00:00Z",
          }),
        ],
        NOW
      ).planId,
      "free"
    );
  }
);

test(
  "past due does not grant Pro",
  () => {
    assert.equal(
      resolveAccountEntitlement(
        [
          row({
            status:
              "past_due",
          }),
        ],
        NOW
      ).planId,
      "free"
    );
  }
);

test(
  "missing period end does not grant Pro",
  () => {
    assert.equal(
      resolveAccountEntitlement(
        [
          row({
            current_period_end:
              null,
          }),
        ],
        NOW
      ).planId,
      "free"
    );
  }
);

test(
  "Advanced cannot grant paid entitlement yet",
  () => {
    assert.equal(
      resolveAccountEntitlement(
        [
          row({
            plan_id:
              "advanced",
          }),
        ],
        NOW
      ).planId,
      "free"
    );
  }
);
