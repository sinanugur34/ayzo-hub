import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type EvmDeepFundingPolicy =
  | {
      enabled: false;
    }
  | {
      enabled: true;
      maxHops: number;
      maxNodes: number;
      transactionPagesPerNode: number;
      providerRequestBudget: number;
    };

const DISABLED:
  EvmDeepFundingPolicy = {
  enabled: false,
};

/*
 * Advanced-only V1.
 *
 * Intentionally bounded to protect latency,
 * provider usage and evidence readability.
 */
const ADVANCED:
  EvmDeepFundingPolicy = {
  enabled: true,
  maxHops: 3,
  maxNodes: 10,
  transactionPagesPerNode: 2,
  providerRequestBudget: 12,
};

export function getEvmDeepFundingPolicy(
  plan: AnalysisDepthPlan
): EvmDeepFundingPolicy {
  return plan === "advanced"
    ? ADVANCED
    : DISABLED;
}
