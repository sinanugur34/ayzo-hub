import {
  PLANS,
} from "@/lib/plans/registry";

import type {
  PlanId,
} from "@/lib/plans/types";

export type QuotaPlan =
  | "free"
  | "pro"
  | "advanced";

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
   * Advanced inherits the current
   * Pro quota contract until a
   * dedicated Advanced quota is
   * explicitly configured.
   *
   * Keep the requested plan identity
   * so downstream API/UI layers do
   * not misclassify Advanced as Pro
   * or Free.
   */
  const quotaSourcePlan:
    "free" | "pro" =
      planId === "free"
        ? "free"
        : "pro";

  const quota =
    PLANS[
      quotaSourcePlan
    ].analysisQuota;

  if (
    quota.kind !==
    "fixed"
  ) {
    throw new Error(
      `Analysis quota is not configured for ${quotaSourcePlan}.`
    );
  }

  return {
    plan:
      planId,

    limit:
      quota.count,

    windowSeconds:
      24 * 60 * 60,
  };
}
