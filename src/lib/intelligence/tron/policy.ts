import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type TronAnalysisPolicy = {
  historyLimit:
    number;

  canonicalSampleLimit:
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
    TronAnalysisPolicy
  > = {
    free: {
      historyLimit:
        5,

      canonicalSampleLimit:
        1,

      graphMaxNodes:
        8,

      graphMaxEdges:
        12,

      timelineMaxEvents:
        5,
    },

    pro: {
      historyLimit:
        10,

      canonicalSampleLimit:
        2,

      graphMaxNodes:
        14,

      graphMaxEdges:
        24,

      timelineMaxEvents:
        10,
    },

    advanced: {
      historyLimit:
        20,

      canonicalSampleLimit:
        3,

      graphMaxNodes:
        28,

      graphMaxEdges:
        48,

      timelineMaxEvents:
        20,
    },
  };

export function getTronAnalysisPolicy(
  plan:
    AnalysisDepthPlan
): TronAnalysisPolicy {
  return POLICIES[
    plan
  ];
}