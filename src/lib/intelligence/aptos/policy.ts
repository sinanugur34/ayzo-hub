import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type AptosAnalysisPolicy = {
  transactionLimit:
    number;

  earliestTransactionLimit:
    number;

  fungibleAssetLimit:
    number;

  resourceLimit:
    number;

  objectLimit:
    number;

  eventLimit:
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
    AptosAnalysisPolicy
  > = {
  free: {
    transactionLimit:
      16,

    earliestTransactionLimit:
      6,

    fungibleAssetLimit:
      16,

    resourceLimit:
      16,

    objectLimit:
      12,

    eventLimit:
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

    earliestTransactionLimit:
      16,

    fungibleAssetLimit:
      48,

    resourceLimit:
      48,

    objectLimit:
      32,

    eventLimit:
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

    earliestTransactionLimit:
      32,

    fungibleAssetLimit:
      96,

    resourceLimit:
      96,

    objectLimit:
      64,

    eventLimit:
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

export function getAptosAnalysisPolicy(
  plan:
    AnalysisDepthPlan
) {
  return POLICIES[
    plan
  ];
}
