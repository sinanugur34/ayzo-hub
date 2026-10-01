import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type XrplAnalysisPolicy = {
  historyLimit:
    number;

  earliestHistoryLimit:
    number;

  trustLineLimit:
    number;

  accountObjectLimit:
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
    XrplAnalysisPolicy
  > = {
  free: {
    historyLimit:
      10,

    earliestHistoryLimit:
      10,

    trustLineLimit:
      10,

    accountObjectLimit:
      10,

    graphMaxNodes:
      8,

    graphMaxEdges:
      12,

    timelineMaxEvents:
      10,
  },

  pro: {
    historyLimit:
      30,

    earliestHistoryLimit:
      24,

    trustLineLimit:
      32,

    accountObjectLimit:
      32,

    graphMaxNodes:
      16,

    graphMaxEdges:
      28,

    timelineMaxEvents:
      24,
  },

  advanced: {
    historyLimit:
      72,

    earliestHistoryLimit:
      48,

    trustLineLimit:
      80,

    accountObjectLimit:
      80,

    graphMaxNodes:
      32,

    graphMaxEdges:
      64,

    timelineMaxEvents:
      48,
  },
};

export function getXrplAnalysisPolicy(
  plan:
    AnalysisDepthPlan
): XrplAnalysisPolicy {
  return POLICIES[
    plan
  ];
}
