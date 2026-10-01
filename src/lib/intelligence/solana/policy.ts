import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type SolanaAnalysisPolicy = {
  walletLimit: number;

  relationshipSignatureLimit: number;

  relationshipSharedTxDetailLimit: number;

  fundingTransactionLimitPerWallet: number;

  fundingRecentTransferLimitPerWallet: number;

  fundingSharedSourceTransferLimit: number;

  graphMaxNodes: number;

  graphMaxEdges: number;

  timelineMaxEvents: number;
};

/*
 * Solana plan-depth contract
 *
 * FREE
 * - preserves the existing product depth
 *
 * PRO
 * - materially expands wallet, relationship
 *   and funding evidence
 *
 * ADVANCED
 * - deepest bounded Solana investigation
 *   without turning the engine into an
 *   unbounded RPC crawler
 *
 * Every provider-facing limit remains explicit.
 */
const POLICIES:
  Record<
    AnalysisDepthPlan,
    SolanaAnalysisPolicy
  > = {
    free: {
      walletLimit: 5,

      relationshipSignatureLimit: 50,

      relationshipSharedTxDetailLimit: 25,

      fundingTransactionLimitPerWallet: 12,

      fundingRecentTransferLimitPerWallet: 5,

      fundingSharedSourceTransferLimit: 10,

      graphMaxNodes: 8,

      graphMaxEdges: 12,

      timelineMaxEvents: 8,
    },

    pro: {
      walletLimit: 8,

      relationshipSignatureLimit: 80,

      relationshipSharedTxDetailLimit: 35,

      fundingTransactionLimitPerWallet: 20,

      fundingRecentTransferLimitPerWallet: 8,

      fundingSharedSourceTransferLimit: 16,

      graphMaxNodes: 14,

      graphMaxEdges: 24,

      timelineMaxEvents: 16,
    },

    advanced: {
      walletLimit: 12,

      relationshipSignatureLimit: 120,

      relationshipSharedTxDetailLimit: 50,

      fundingTransactionLimitPerWallet: 32,

      fundingRecentTransferLimitPerWallet: 12,

      fundingSharedSourceTransferLimit: 24,

      graphMaxNodes: 24,

      graphMaxEdges: 40,

      timelineMaxEvents: 24,
    },
  };

export function getSolanaAnalysisPolicy(
  plan: AnalysisDepthPlan
): SolanaAnalysisPolicy {
  return POLICIES[plan];
}
