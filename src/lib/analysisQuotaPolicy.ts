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
   * Every AYZO tier owns its explicit
   * analysis allowance in the central
   * plan registry.
   *
   * Free:     3 / 24h
   * Pro:      25 / 24h
   * Advanced: 90 / 24h
   */
  const quota =
    PLANS[
      planId
    ].analysisQuota;

  if (
    quota.kind !==
    "fixed"
  ) {
    throw new Error(
      `Analysis quota is not configured for ${planId}.`
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
