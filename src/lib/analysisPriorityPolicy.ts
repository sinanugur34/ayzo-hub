import {
  planHasFeature,
} from "@/lib/plans/registry";

import type {
  PlanId,
} from "@/lib/plans/types";

export function planHasPriorityAnalysis(
  planId: PlanId
) {
  return planHasFeature(
    planId,
    "priorityAnalysis"
  );
}

function safeInteger(
  value: number,
  fallback: number,
  min: number
) {
  return (
    Number.isInteger(value) &&
    value >= min
  )
    ? value
    : fallback;
}

export function resolveAnalysisAdmissionPolicy({
  hardGlobalLimit,
  clientLimit,
  priorityReserve,
  priority,
}: {
  hardGlobalLimit: number;
  clientLimit: number;
  priorityReserve: number;
  priority: boolean;
}) {
  const hardLimit =
    safeInteger(
      hardGlobalLimit,
      50,
      1
    );

  const perClientLimit =
    safeInteger(
      clientLimit,
      2,
      1
    );

  const rawReserve =
    safeInteger(
      priorityReserve,
      5,
      0
    );

  const reservedSlots =
    Math.min(
      rawReserve,
      Math.max(
        0,
        hardLimit - 1
      )
    );

  return {
    priority,

    hardGlobalLimit:
      hardLimit,

    globalAdmissionLimit:
      priority
        ? hardLimit
        : Math.max(
            1,
            hardLimit -
              reservedSlots
          ),

    clientLimit:
      perClientLimit,

    reservedSlots,
  };
}
