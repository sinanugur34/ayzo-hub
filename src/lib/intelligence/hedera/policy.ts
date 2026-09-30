import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type HederaAnalysisPolicy = {
  transactionLimit:
    number;

  tokenRelationshipLimit:
    number;

  nftLimit:
    number;

  tokenMetadataLimit:
    number;

  stakingRewardLimit:
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
    HederaAnalysisPolicy
  > = {
  free: {
    transactionLimit:
      16,

    tokenRelationshipLimit:
      16,

    nftLimit:
      12,

    tokenMetadataLimit:
      6,

    stakingRewardLimit:
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
    transactionLimit:
      48,

    tokenRelationshipLimit:
      48,

    nftLimit:
      32,

    tokenMetadataLimit:
      16,

    stakingRewardLimit:
      24,

    graphMaxNodes:
      16,

    graphMaxEdges:
      28,

    timelineMaxEvents:
      24,

    providerRequestBudget:
      18,
  },

  advanced: {
    transactionLimit:
      96,

    tokenRelationshipLimit:
      96,

    nftLimit:
      64,

    tokenMetadataLimit:
      32,

    stakingRewardLimit:
      48,

    graphMaxNodes:
      32,

    graphMaxEdges:
      56,

    timelineMaxEvents:
      48,

    providerRequestBudget:
      36,
  },
};

export function getHederaAnalysisPolicy(
  plan:
    AnalysisDepthPlan
) {
  return POLICIES[
    plan
  ];
}
