import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  buildAdminBillingInsights,
  type AdminBillingInsightRow,
} from "@/lib/adminBillingInsightsCore";

export async function getAdminBillingInsights() {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin.rpc(
      "ayzo_admin_billing_insights"
    );

  if (
    error ||
    !Array.isArray(
      data
    )
  ) {
    throw new Error(
      "AYZO_ADMIN_BILLING_INSIGHTS_UNAVAILABLE"
    );
  }

  return buildAdminBillingInsights(
    data as
      AdminBillingInsightRow[]
  );
}
