import type {
  PlanId,
} from "./types";

export type UpgradePlanVisibility =
  Record<
    PlanId,
    boolean
  >;

const PLAN_RANK:
  Record<
    PlanId,
    number
  > = {
    free: 0,
    pro: 1,
    advanced: 2,
  };

export function getUpgradePlanVisibility(
  activePlan:
    PlanId
): UpgradePlanVisibility {
  const activeRank =
    PLAN_RANK[
      activePlan
    ];

  return {
    free:
      PLAN_RANK.free >
      activeRank,

    pro:
      PLAN_RANK.pro >
      activeRank,

    advanced:
      PLAN_RANK.advanced >
      activeRank,
  };
}
