import "server-only";

import {
  FREE_ENTITLEMENT,
  resolveAccountEntitlement,
  type AccountEntitlement,
  type SubscriptionEntitlementRow,
} from "@/lib/billing/entitlement-core";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

export type ServerEntitlementResult = {
  entitlement:
    AccountEntitlement;

  billingAvailable:
    boolean;
};

function isSubscriptionEntitlementRow(
  value: unknown
): value is SubscriptionEntitlementRow {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return false;
  }

  const row =
    value as Record<
      string,
      unknown
    >;

  const validPlan =
    row.plan_id ===
      "pro" ||
    row.plan_id ===
      "advanced";

  const validInterval =
    row.billing_interval ===
      "monthly" ||
    row.billing_interval ===
      "annual";

  const validStatus =
    row.status ===
      "pending" ||
    row.status ===
      "active" ||
    row.status ===
      "canceling" ||
    row.status ===
      "past_due" ||
    row.status ===
      "inactive";

  const validPrice =
    typeof row.locked_price_usd_cents ===
      "number" &&
    Number.isFinite(
      row.locked_price_usd_cents
    ) &&
    row.locked_price_usd_cents >=
      0;

  const validPeriodEnd =
    row.current_period_end ===
      null ||
    typeof row.current_period_end ===
      "string";

  return (
    validPlan &&
    validInterval &&
    validStatus &&
    validPrice &&
    validPeriodEnd &&
    typeof row.cancel_at_period_end ===
      "boolean" &&
    typeof row.founding_customer ===
      "boolean"
  );
}

export async function getServerEntitlement():
  Promise<ServerEntitlementResult> {
  const {
    supabase,
    userId,
  } =
    await getAuthenticatedAccountContext();

  if (!userId) {
    return {
      entitlement: {
        ...FREE_ENTITLEMENT,
      },

      billingAvailable:
        true,
    };
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "subscriptions"
      )
      .select(
        "plan_id,billing_interval,status,locked_price_usd_cents,current_period_end,cancel_at_period_end,founding_customer"
      )
      .eq(
        "user_id",
        userId
      );

  if (error) {
    return {
      entitlement: {
        ...FREE_ENTITLEMENT,
      },

      billingAvailable:
        false,
    };
  }

  const rows =
    Array.isArray(data)
      ? data.filter(
          isSubscriptionEntitlementRow
        )
      : [];

  return {
    entitlement:
      resolveAccountEntitlement(
        rows
      ),

    billingAvailable:
      true,
  };
}
