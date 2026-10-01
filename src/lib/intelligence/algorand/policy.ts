import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type AlgorandAnalysisPolicy = {
  transactionLimit: number;
  earliestTransactionLimit: number;
  assetLimit: number;
  createdAssetLimit: number;
  applicationLimit: number;
  innerTransactionLimit: number;
  graphMaxNodes: number;
  graphMaxEdges: number;
  timelineMaxEvents: number;
  providerRequestBudget: number;
};

const POLICIES:
  Record<
    AnalysisDepthPlan,
    AlgorandAnalysisPolicy
  > = {
  free: {
    transactionLimit: 20,
    earliestTransactionLimit: 8,
    assetLimit: 24,
    createdAssetLimit: 12,
    applicationLimit: 16,
    innerTransactionLimit: 20,
    graphMaxNodes: 24,
    graphMaxEdges: 40,
    timelineMaxEvents: 28,
    providerRequestBudget: 14,
  },

  pro: {
    transactionLimit: 80,
    earliestTransactionLimit: 24,
    assetLimit: 96,
    createdAssetLimit: 48,
    applicationLimit: 64,
    innerTransactionLimit: 80,
    graphMaxNodes: 80,
    graphMaxEdges: 160,
    timelineMaxEvents: 120,
    providerRequestBudget: 40,
  },

  advanced: {
    transactionLimit: 240,
    earliestTransactionLimit: 72,
    assetLimit: 256,
    createdAssetLimit: 128,
    applicationLimit: 180,
    innerTransactionLimit: 240,
    graphMaxNodes: 220,
    graphMaxEdges: 440,
    timelineMaxEvents: 320,
    providerRequestBudget: 96,
  },
};

export function getAlgorandAnalysisPolicy(
  plan: AnalysisDepthPlan
): AlgorandAnalysisPolicy {
  return POLICIES[plan];
}
