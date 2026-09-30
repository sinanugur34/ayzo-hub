import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHyperliquidDerivedAnalysis,
} from "./analysis";

import type {
  HyperliquidEvidence,
} from "./types";

const evidence:
  HyperliquidEvidence = {
    hyperCore: {
      role:
        "user",

      accountValue:
        "1000",

      withdrawable:
        "400",

      totalNotionalPosition:
        "250",

      totalMarginUsed:
        "50",

      positions: [
        {
          coin:
            "BTC",

          size:
            "0.1",

          entryPrice:
            "50000",

          positionValue:
            "5000",

          unrealizedPnl:
            "20",

          liquidationPrice:
            "30000",

          marginUsed:
            "100",

          returnOnEquity:
            "0.02",

          leverageType:
            "cross",

          leverageValue:
            5,

          cumulativeFundingAllTime:
            "-1",

          cumulativeFundingSinceOpen:
            "-0.2",
        },

        {
          coin:
            "ETH",

          size:
            "-1",

          entryPrice:
            "3000",

          positionValue:
            "3000",

          unrealizedPnl:
            "-10",

          liquidationPrice:
            "4000",

          marginUsed:
            "60",

          returnOnEquity:
            "-0.01",

          leverageType:
            "cross",

          leverageValue:
            3,

          cumulativeFundingAllTime:
            "0",

          cumulativeFundingSinceOpen:
            "0",
        },
      ],

      spotBalances: [
        {
          coin:
            "USDC",

          token:
            0,

          total:
            "25",

          hold:
            "0",

          entryNotional:
            "0",
        },
      ],

      fills: [
        {
          hash:
            "0xabc",

          transactionId:
            "1",

          coin:
            "BTC",

          price:
            "50000",

          size:
            "0.1",

          side:
            "B",

          direction:
            "Open Long",

          timestamp:
            "2026-09-30T00:00:00.000Z",

          closedPnl:
            "0",

          fee:
            "0.1",

          feeToken:
            "USDC",

          crossed:
            true,
        },
      ],

      fundingPayments: [
        {
          hash:
            "0xdef",

          timestamp:
            "2026-09-30T00:00:00.000Z",

          coin:
            "BTC",

          usdc:
            "-0.05",

          size:
            "0.1",

          fundingRate:
            "0.0001",
        },
      ],

      portfolio:
        [],

      nonFundingLedger:
        [],
    },

    hyperEvm: {
      chainId:
        999,

      nativeCurrency:
        "HYPE",

      balanceWei:
        "0x1",

      transactionCount:
        4,

      code:
        "0x",

      isContract:
        false,
    },

    coverage: {
      plan:
        "free",

      fillLimit:
        12,

      fundingLimit:
        12,

      fundingLookbackDays:
        7,

      positionLimit:
        8,

      spotBalanceLimit:
        8,

      portfolioPointLimit:
        12,

      ledgerLimit:
        16,

      ledgerLookbackDays:
        7,

      hyperCoreProvider:
        "hyperliquid-info",

      hyperEvmProvider:
        "hyperliquid-json-rpc",
    },
  };

test(
  "derives HyperCore and HyperEVM state separately",
  () => {
    const result =
      buildHyperliquidDerivedAnalysis(
        evidence
      );

    assert.equal(
      result
        .hyperCore
        .openPositionCount,
      2
    );

    assert.equal(
      result
        .hyperCore
        .longPositionCount,
      1
    );

    assert.equal(
      result
        .hyperCore
        .shortPositionCount,
      1
    );

    assert.equal(
      result
        .hyperCore
        .nonZeroFundingPaymentCount,
      1
    );

    assert.equal(
      result
        .hyperEvm
        .hasPriorTransactions,
      true
    );
  }
);

test(
  "derives non-funding ledger flow and explicit counterparties",
  () => {
    const subject =
      "0x1111111111111111111111111111111111111111";

    const counterparty =
      "0x2222222222222222222222222222222222222222";

    const result =
      buildHyperliquidDerivedAnalysis({
        ...evidence,

        hyperCore: {
          ...evidence.hyperCore,

          nonFundingLedger: [
            {
              hash:
                "0xledger1",

              timestamp:
                "2026-09-30T00:00:00.000Z",

              type:
                "spotTransfer",

              usdc:
                null,

              amount:
                "5",

              token:
                "USDC",

              user:
                counterparty,

              destination:
                subject,

              fee:
                null,

              nativeTokenFee:
                null,

              feeToken:
                null,

              toPerp:
                null,

              vault:
                null,

              requestedUsd:
                null,

              sourceDex:
                null,

              destinationDex:
                null,
            },

            {
              hash:
                "0xledger2",

              timestamp:
                "2026-09-30T01:00:00.000Z",

              type:
                "withdraw",

              usdc:
                "10",

              amount:
                null,

              token:
                null,

              user:
                null,

              destination:
                counterparty,

              fee:
                "1",

              nativeTokenFee:
                null,

              feeToken:
                "USDC",

              toPerp:
                null,

              vault:
                null,

              requestedUsd:
                null,

              sourceDex:
                null,

              destinationDex:
                null,
            },
          ],
        },
      });

    assert.equal(
      result
        .hyperCore
        .ledgerEventCount,
      2
    );

    assert.equal(
      result
        .hyperCore
        .withdrawalCount,
      1
    );

    assert.equal(
      result
        .hyperCore
        .transferCount,
      1
    );

    assert.equal(
      result
        .hyperCore
        .counterparties
        .count,
      2
    );
  }
);
