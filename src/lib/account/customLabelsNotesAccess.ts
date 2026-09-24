import "server-only";

import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

import {
  planHasFeature,
} from "@/lib/plans/registry";

export async function canUseCustomLabelsNotes(
  expectedUserId: string
) {
  const result =
    await getServerEntitlement();

  return (
    result.userId ===
      expectedUserId &&
    result.billingAvailable &&
    planHasFeature(
      result.entitlement.planId,
      "customLabelsNotes"
    )
  );
}
