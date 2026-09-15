import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type EvmRecursiveGraphPolicy =
  | {
      enabled: false;
    }
  | {
      enabled: true;

      maxHops: number;
      maxNodes: number;
      maxEdges: number;

      maxNeighborsPerNode:
        number;

      transactionPagesPerNode:
        number;

      providerRequestBudget:
        number;
    };

const DISABLED:
  EvmRecursiveGraphPolicy = {
  enabled: false,
};

/*
 * Advanced-only provider-backed recursive
 * graph discovery.
 *
 * The traversal is intentionally bounded.
 * It is not an exhaustive blockchain crawl.
 *
 * Provider budget is logical. When injected
 * through the unified transaction cache,
 * already-cached address/cursor pages do not
 * create duplicate physical provider calls.
 */
const ADVANCED:
  EvmRecursiveGraphPolicy = {
  enabled: true,

  maxHops: 4,
  maxNodes: 28,
  maxEdges: 48,

  maxNeighborsPerNode: 4,

  transactionPagesPerNode: 2,

  providerRequestBudget: 16,
};

export function getEvmRecursiveGraphPolicy(
  plan: AnalysisDepthPlan
): EvmRecursiveGraphPolicy {
  return plan ===
    "advanced"
    ? ADVANCED
    : DISABLED;
}
