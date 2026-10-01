import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type NearAnalysisPolicy = {
  transactionLimit:
    number;

  receiptLimit:
    number;

  accessKeyLimit:
    number;

  fungibleTokenLimit:
    number;

  actionLimit:
    number;

  graphMaxNodes:
    number;

  graphMaxEdges:
    number;

  timelineMaxEvents:
    number;

  providerRequestBudget:
    number;
};

const POLICIES:
  Record<
    AnalysisDepthPlan,
    NearAnalysisPolicy
  > = {
  free: {
    transactionLimit:
      16,

    receiptLimit:
      24,

    accessKeyLimit:
      16,

    fungibleTokenLimit:
      16,

    actionLimit:
      32,

    graphMaxNodes:
      8,

    graphMaxEdges:
      12,

    timelineMaxEvents:
      12,

    providerRequestBudget:
      8,
  },

  pro: {
    transactionLimit:
      48,

    receiptLimit:
      72,

    accessKeyLimit:
      48,

    fungibleTokenLimit:
      48,

    actionLimit:
      96,

    graphMaxNodes:
      16,

    graphMaxEdges:
      28,

    timelineMaxEvents:
      24,

    providerRequestBudget:
      16,
  },

  advanced: {
    transactionLimit:
      96,

    receiptLimit:
      144,

    accessKeyLimit:
      96,

    fungibleTokenLimit:
      96,

    actionLimit:
      192,

    graphMaxNodes:
      32,

    graphMaxEdges:
      56,

    timelineMaxEvents:
      48,

    providerRequestBudget:
      32,
  },
};

export function getNearAnalysisPolicy(
  plan:
    AnalysisDepthPlan
) {
  return POLICIES[
    plan
  ];
}
