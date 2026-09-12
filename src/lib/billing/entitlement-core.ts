import type {
  BillingInterval,
  PlanId,
} from "@/lib/plans/types";

export type SubscriptionStatus =
  | "pending"
  | "active"
  | "canceling"
  | "past_due"
  | "inactive";

export type SubscriptionEntitlementRow = {
  plan_id: "pro" | "advanced";
  billing_interval:
    BillingInterval;
  status:
    SubscriptionStatus;
  locked_price_usd_cents:
    number;
  current_period_end:
    string | null;
  cancel_at_period_end:
    boolean;
  founding_customer:
    boolean;
};

export type AccountEntitlement = {
  planId:
    PlanId;

  source:
    | "free-default"
    | "subscription";

  billingInterval:
    BillingInterval | null;

  subscriptionStatus:
    SubscriptionStatus | null;

  currentPeriodEnd:
    string | null;

  cancelAtPeriodEnd:
    boolean;

  foundingCustomer:
    boolean;

  lockedPriceUsdCents:
    number | null;
};

export const FREE_ENTITLEMENT:
  AccountEntitlement = {
    planId:
      "free",

    source:
      "free-default",

    billingInterval:
      null,

    subscriptionStatus:
      null,

    currentPeriodEnd:
      null,

    cancelAtPeriodEnd:
      false,

    foundingCustomer:
      false,

    lockedPriceUsdCents:
      null,
  };

function validPeriodEnd(
  value: string | null,
  nowMs: number
) {
  if (!value) {
    return false;
  }

  const end =
    Date.parse(value);

  return (
    Number.isFinite(end) &&
    end > nowMs
  );
}

export function resolveAccountEntitlement(
  rows:
    readonly SubscriptionEntitlementRow[],
  now:
    Date = new Date()
): AccountEntitlement {
  const nowMs =
    now.getTime();

  /*
   * Checkout availability and
   * entitlement resolution are
   * intentionally separate.
   *
   * A verified Pro or Advanced
   * subscription record may grant
   * access. Plan checkout remains
   * controlled independently by
   * the plan/billing launch policy.
   */
  const candidates =
    rows
      .filter(
        row =>
          (
            row.status ===
              "active" ||
            row.status ===
              "canceling"
          ) &&
          validPeriodEnd(
            row.current_period_end,
            nowMs
          )
      )
      .sort(
        (
          left,
          right
        ) => {
          const planPriority =
            Number(
              right.plan_id ===
                "advanced"
            ) -
            Number(
              left.plan_id ===
                "advanced"
            );

          if (
            planPriority !==
            0
          ) {
            return planPriority;
          }

          return (
            Date.parse(
              right.current_period_end ??
                ""
            ) -
            Date.parse(
              left.current_period_end ??
                ""
            )
          );
        }
      );

  const subscription =
    candidates[0];

  if (!subscription) {
    return {
      ...FREE_ENTITLEMENT,
    };
  }

  return {
    planId:
      subscription.plan_id,

    source:
      "subscription",

    billingInterval:
      subscription
        .billing_interval,

    subscriptionStatus:
      subscription.status,

    currentPeriodEnd:
      subscription
        .current_period_end,

    cancelAtPeriodEnd:
      subscription
        .cancel_at_period_end,

    foundingCustomer:
      subscription
        .founding_customer,

    lockedPriceUsdCents:
      subscription
        .locked_price_usd_cents,
  };
}
