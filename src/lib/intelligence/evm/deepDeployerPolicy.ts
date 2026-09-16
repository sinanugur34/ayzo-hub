import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type EvmDeepDeployerPolicy =
  | {
      enabled: false;
    }
  | {
      enabled: true;

      /**
       * Maximum GoldRush transaction-history
       * pages inspected for the verified deployer.
       *
       * This is intentionally bounded.
       */
      maxPages: number;

      /**
       * Maximum top-level contract-creation
       * candidates verified through receipts.
       *
       * Internal CREATE and CREATE2 are not
       * covered by this policy.
       */
      receiptCheckLimit: number;
    };

const DISABLED:
  EvmDeepDeployerPolicy = {
  enabled: false,
};

/**
 * Advanced-only V1.
 *
 * Limits intentionally match the already
 * established internal developer-history
 * safety envelope:
 *
 * - up to 5 transaction-history pages
 * - up to 12 receipt verifications
 *
 * This feature remains bounded and does not
 * imply exhaustive deployer history.
 */
const ADVANCED:
  EvmDeepDeployerPolicy = {
  enabled: true,

  maxPages: 5,

  receiptCheckLimit: 12,
};

export function getEvmDeepDeployerPolicy(
  plan: AnalysisDepthPlan
): EvmDeepDeployerPolicy {
  return plan === "advanced"
    ? ADVANCED
    : DISABLED;
}
