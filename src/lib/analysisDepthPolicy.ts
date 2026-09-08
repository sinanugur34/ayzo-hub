export type AnalysisDepthPlan =
  | "free"
  | "pro";

export type AnalysisDepthPolicy = {
  rootTransactionPages: number;
  rootTransferPages: number;
  expansionWalletLimit: number;
  expansionTransactionPages: number;
  graphMaxHops: number;
  graphMaxNodes: number;
  graphMaxEdges: number;
};

const FREE_POLICY:
  AnalysisDepthPolicy = {
    rootTransactionPages: 1,
    rootTransferPages: 1,
    expansionWalletLimit: 2,
    expansionTransactionPages: 1,
    graphMaxHops: 2,
    graphMaxNodes: 8,
    graphMaxEdges: 12,
  };

const PRO_POLICY:
  AnalysisDepthPolicy = {
    rootTransactionPages: 2,
    rootTransferPages: 2,
    expansionWalletLimit: 4,
    expansionTransactionPages: 2,
    graphMaxHops: 2,
    graphMaxNodes: 14,
    graphMaxEdges: 24,
  };

export function getAnalysisDepthPolicy(
  plan: AnalysisDepthPlan
): AnalysisDepthPolicy {
  return plan === "pro"
    ? PRO_POLICY
    : FREE_POLICY;
}
