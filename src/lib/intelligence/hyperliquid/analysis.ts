import type {
  HyperliquidEvidence,
} from "./types";

export type HyperliquidDerivedAnalysis = {
  hyperCore: {
    openPositionCount:
      number;

    longPositionCount:
      number;

    shortPositionCount:
      number;

    positiveSpotBalanceCount:
      number;

    recentFillCount:
      number;

    fundingPaymentCount:
      number;

    nonZeroFundingPaymentCount:
      number;
  };

  hyperEvm: {
    hasNativeBalance:
      boolean;

    hasPriorTransactions:
      boolean;

    isContract:
      boolean;
  };
};

function nonZeroDecimal(
  value:
    string | null
) {
  if (!value) {
    return false;
  }

  const numeric =
    Number(
      value
    );

  return (
    Number.isFinite(
      numeric
    ) &&
    numeric !==
      0
  );
}

function nonZeroHex(
  value:
    string
) {
  try {
    return (
      BigInt(
        value
      ) >
      0n
    );
  } catch {
    return false;
  }
}

export function buildHyperliquidDerivedAnalysis(
  evidence:
    HyperliquidEvidence
): HyperliquidDerivedAnalysis {
  const positions =
    evidence
      .hyperCore
      .positions
      .filter(
        position =>
          nonZeroDecimal(
            position.size
          )
      );

  return {
    hyperCore: {
      openPositionCount:
        positions.length,

      longPositionCount:
        positions.filter(
          position =>
            Number(
              position.size
            ) >
            0
        ).length,

      shortPositionCount:
        positions.filter(
          position =>
            Number(
              position.size
            ) <
            0
        ).length,

      positiveSpotBalanceCount:
        evidence
          .hyperCore
          .spotBalances
          .filter(
            balance =>
              nonZeroDecimal(
                balance.total
              )
          )
          .length,

      recentFillCount:
        evidence
          .hyperCore
          .fills
          .length,

      fundingPaymentCount:
        evidence
          .hyperCore
          .fundingPayments
          .length,

      nonZeroFundingPaymentCount:
        evidence
          .hyperCore
          .fundingPayments
          .filter(
            payment =>
              nonZeroDecimal(
                payment.usdc
              )
          )
          .length,
    },

    hyperEvm: {
      hasNativeBalance:
        nonZeroHex(
          evidence
            .hyperEvm
            .balanceWei
        ),

      hasPriorTransactions:
        evidence
          .hyperEvm
          .transactionCount >
        0,

      isContract:
        evidence
          .hyperEvm
          .isContract,
    },
  };
}
