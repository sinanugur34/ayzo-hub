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

    ledgerEventCount:
      number;

    depositCount:
      number;

    withdrawalCount:
      number;

    transferCount:
      number;

    accountClassTransferCount:
      number;

    counterparties: {
      count:
        number;

      addresses:
        readonly string[];
    };
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

function ledgerType(
  value:
    string
) {
  return value
    .trim()
    .toLowerCase();
}

function isAddress(
  value:
    string | null
) {
  return (
    value !==
      null &&
    /^0x[0-9a-fA-F]{40}$/.test(
      value
    )
  );
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

  const ledger =
    evidence
      .hyperCore
      .nonFundingLedger;

  const counterparties =
    new Set<string>();

  let depositCount =
    0;

  let withdrawalCount =
    0;

  let transferCount =
    0;

  let accountClassTransferCount =
    0;

  for (
    const update of
    ledger
  ) {
    const type =
      ledgerType(
        update.type
      );

    if (
      type.includes(
        "deposit"
      )
    ) {
      depositCount +=
        1;
    }

    if (
      type.includes(
        "withdraw"
      )
    ) {
      withdrawalCount +=
        1;
    }

    if (
      type.includes(
        "transfer"
      )
    ) {
      transferCount +=
        1;
    }

    if (
      type ===
        "accountclasstransfer"
    ) {
      accountClassTransferCount +=
        1;
    }

    for (
      const candidate of [
        update.user,
        update.destination,
      ]
    ) {
      if (
        isAddress(
          candidate
        )
      ) {
        counterparties.add(
          candidate!
            .toLowerCase()
        );
      }
    }
  }

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

      ledgerEventCount:
        ledger.length,

      depositCount,

      withdrawalCount,

      transferCount,

      accountClassTransferCount,

      counterparties: {
        count:
          counterparties.size,

        addresses:
          [
            ...counterparties,
          ],
      },
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
