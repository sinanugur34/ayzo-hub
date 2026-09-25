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
};

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
    },

    pro: {
      walletLimit: 7,
      relationshipSignatureLimit: 50,
      relationshipSharedTxDetailLimit: 25,
      fundingTransactionLimitPerWallet: 12,
      fundingRecentTransferLimitPerWallet: 5,
      fundingSharedSourceTransferLimit: 10,
    },

    advanced: {
      walletLimit: 10,
      relationshipSignatureLimit: 50,
      relationshipSharedTxDetailLimit: 25,
      fundingTransactionLimitPerWallet: 12,
      fundingRecentTransferLimitPerWallet: 5,
      fundingSharedSourceTransferLimit: 10,
    },
  };

export function getSolanaAnalysisPolicy(
  plan: AnalysisDepthPlan
): SolanaAnalysisPolicy {
  return POLICIES[plan];
}
