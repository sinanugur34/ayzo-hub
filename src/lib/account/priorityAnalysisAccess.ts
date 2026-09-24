import "server-only";

import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

import {
  planHasPriorityAnalysis,
} from "@/lib/analysisPriorityPolicy";

export async function canUsePriorityAnalysis(
  expectedUserId: string
) {
  const result =
    await getServerEntitlement();

  return (
    result.userId ===
      expectedUserId &&
    result.billingAvailable &&
    planHasPriorityAnalysis(
      result.entitlement.planId
    )
  );
}
