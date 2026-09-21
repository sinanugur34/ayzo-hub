import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  FREE_ENTITLEMENT,
  resolveAccountEntitlement,
  type AccountEntitlement,
  type SubscriptionEntitlementRow,
} from "@/lib/billing/entitlement-core";

function isSubscriptionRow(
  value: unknown
): value is SubscriptionEntitlementRow {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const row =
    value as Record<
      string,
      unknown
    >;

  return (
    (
      row.plan_id === "pro" ||
      row.plan_id === "advanced"
    ) &&
    (
      row.billing_interval === "monthly" ||
      row.billing_interval === "annual"
    ) &&
    (
      row.status === "pending" ||
      row.status === "active" ||
      row.status === "canceling" ||
      row.status === "past_due" ||
      row.status === "inactive"
    ) &&
    typeof row.locked_price_usd_cents === "number" &&
    Number.isFinite(
      row.locked_price_usd_cents
    ) &&
    (
      row.current_period_end === null ||
      typeof row.current_period_end === "string"
    ) &&
    typeof row.cancel_at_period_end === "boolean" &&
    typeof row.founding_customer === "boolean"
  );
}

export async function getMobileEntitlement(
  userId: string
): Promise<{
  entitlement: AccountEntitlement;
  billingAvailable: boolean;
}> {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin
    .from("subscriptions")
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
      billingAvailable: false,
    };
  }

  const rows =
    Array.isArray(data)
      ? data.filter(
          isSubscriptionRow
        )
      : [];

  return {
    entitlement:
      resolveAccountEntitlement(
        rows
      ),
    billingAvailable: true,
  };
}
