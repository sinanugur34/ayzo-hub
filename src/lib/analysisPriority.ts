import "server-only";

import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

import {
  planHasPriorityAnalysis,
} from "@/lib/analysisPriorityPolicy";

export async function getWebAnalysisPriority() {
  try {
    const result =
      await getServerEntitlement();

    return (
      result.billingAvailable &&
      planHasPriorityAnalysis(
        result.entitlement.planId
      )
    );
  } catch {
    /*
     * Priority must fail closed.
     * An entitlement lookup failure
     * must not grant reserved capacity.
     */
    return false;
  }
}
