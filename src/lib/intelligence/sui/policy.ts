import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type SuiAnalysisPolicy = {
  historyLimit:
    number;

  earliestHistoryLimit:
    number;

  balanceLimit:
    number;

  objectLimit:
    number;

  graphMaxNodes:
    number;

  graphMaxEdges:
    number;

  timelineMaxEvents:
    number;
};

const POLICIES:
  Record<
    AnalysisDepthPlan,
    SuiAnalysisPolicy
  > = {
  free: {
    historyLimit:
      8,

    earliestHistoryLimit:
      4,

    balanceLimit:
      8,

    objectLimit:
      8,

    graphMaxNodes:
      8,

    graphMaxEdges:
      12,

    timelineMaxEvents:
      8,
  },

  pro: {
    historyLimit:
      16,

    earliestHistoryLimit:
      8,

    balanceLimit:
      16,

    objectLimit:
      16,

    graphMaxNodes:
      14,

    graphMaxEdges:
      24,

    timelineMaxEvents:
      16,
  },

  advanced: {
    historyLimit:
      32,

    earliestHistoryLimit:
      16,

    balanceLimit:
      32,

    objectLimit:
      32,

    graphMaxNodes:
      28,

    graphMaxEdges:
      48,

    timelineMaxEvents:
      32,
  },
};

export function getSuiAnalysisPolicy(
  plan:
    AnalysisDepthPlan
): SuiAnalysisPolicy {
  return POLICIES[
    plan
  ];
}
