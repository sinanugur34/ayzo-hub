import {
  PLANS,
} from "@/lib/plans/registry";

import type {
  PlanId,
} from "@/lib/plans/types";

export type QuotaPlan =
  | "free"
  | "pro";

export type AnalysisQuotaPolicy = {
  plan:
    QuotaPlan;

  limit:
    number;

  windowSeconds:
    number;
};

export function getAnalysisQuotaPolicy(
  planId:
    PlanId
): AnalysisQuotaPolicy {
  /*
   * Advanced paid entitlement is
   * intentionally disabled today.
   * Unknown/non-Pro paid state must
   * safely fall back to Free.
   */
  const effectivePlan:
    QuotaPlan =
      planId ===
      "pro"
        ? "pro"
        : "free";

  const quota =
    PLANS[
      effectivePlan
    ].analysisQuota;

  if (
    quota.kind !==
    "fixed"
  ) {
    throw new Error(
      `Analysis quota is not configured for ${effectivePlan}.`
    );
  }

  return {
    plan:
      effectivePlan,

    limit:
      quota.count,

    windowSeconds:
      24 * 60 * 60,
  };
}
