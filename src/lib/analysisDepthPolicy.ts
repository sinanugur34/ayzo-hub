export type AnalysisDepthPlan =
  | "free"
  | "pro"
  | "advanced";

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

/*
 * Advanced is intentionally deeper, not merely wider.
 *
 * V1 remains bounded to protect:
 * - provider request budgets
 * - latency
 * - deterministic result size
 * - evidence readability
 *
 * We do not infer ownership or identity from graph proximity.
 */
const ADVANCED_POLICY:
  AnalysisDepthPolicy = {
    rootTransactionPages: 3,
    rootTransferPages: 3,
    expansionWalletLimit: 8,
    expansionTransactionPages: 3,
    graphMaxHops: 4,
    graphMaxNodes: 28,
    graphMaxEdges: 48,
  };

export function getAnalysisDepthPolicy(
  plan: AnalysisDepthPlan
): AnalysisDepthPolicy {
  if (plan === "free") {
    return FREE_POLICY;
  }

  if (plan === "advanced") {
    return ADVANCED_POLICY;
  }

  return PRO_POLICY;
}
