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
      20,

    earliestHistoryLimit:
      20,

    trustLineLimit:
      25,

    accountObjectLimit:
      25,

    graphMaxNodes:
      14,

    graphMaxEdges:
      24,

    timelineMaxEvents:
      20,
  },

  advanced: {
    historyLimit:
      30,

    earliestHistoryLimit:
      30,

    trustLineLimit:
      50,

    accountObjectLimit:
      50,

    graphMaxNodes:
      28,

    graphMaxEdges:
      48,

    timelineMaxEvents:
      25,
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