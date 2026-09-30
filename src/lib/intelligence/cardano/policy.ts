import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type CardanoAnalysisPolicy = {
  historyLimit:
    number;

  earliestHistoryLimit:
    number;

  utxoLimit:
    number;

  assetLimit:
    number;

  canonicalSampleLimit:
    number;

  stakeEventLimit:
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
    CardanoAnalysisPolicy
  > = {
  free: {
    historyLimit:
      12,

    earliestHistoryLimit:
      4,

    utxoLimit:
      12,

    assetLimit:
      12,

    canonicalSampleLimit:
      2,

    stakeEventLimit:
      8,

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
    historyLimit:
      36,

    earliestHistoryLimit:
      12,

    utxoLimit:
      36,

    assetLimit:
      36,

    canonicalSampleLimit:
      4,

    stakeEventLimit:
      24,

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
    historyLimit:
      96,

    earliestHistoryLimit:
      24,

    utxoLimit:
      96,

    assetLimit:
      96,

    canonicalSampleLimit:
      8,

    stakeEventLimit:
      64,

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

export function getCardanoAnalysisPolicy(
  plan:
    AnalysisDepthPlan
) {
  return POLICIES[
    plan
  ];
}
