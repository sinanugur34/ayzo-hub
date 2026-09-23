import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  buildAdminSignupInsights,
  type AdminSignupInsightRow,
} from "@/lib/adminSignupInsightsCore";

export async function getAdminSignupInsights() {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin.rpc(
      "ayzo_admin_signup_insights"
    );

  if (
    error ||
    !Array.isArray(
      data
    )
  ) {
    throw new Error(
      "AYZO_ADMIN_SIGNUP_INSIGHTS_UNAVAILABLE"
    );
  }

  return buildAdminSignupInsights(
    data as
      AdminSignupInsightRow[]
  );
}
