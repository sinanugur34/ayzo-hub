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

  /*
   * Free has an additional provider-protection
   * cap for repeated use of one canonical
   * network. Paid plans intentionally do not.
   */
  perNetworkLimit:
    number | null;

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
   * Free:     3 / 24h, max 2 / network / 24h
   * Pro:      25 / 24h, no per-network limit
   * Advanced: 90 / 24h, no per-network limit
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

    perNetworkLimit:
      quota.perNetworkCount,

    windowSeconds:
      24 * 60 * 60,
  };
}
