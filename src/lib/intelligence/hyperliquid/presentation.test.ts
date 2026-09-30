import assert from "node:assert/strict";
import test from "node:test";

import type {
  HyperliquidIntelligence,
} from "./engine";

import {
  buildHyperliquidActivityTimeline,
  buildHyperliquidVisualEvidenceGraph,
} from "./presentation";

const SUBJECT =
  "0x1111111111111111111111111111111111111111";

const COUNTERPARTY =
  "0x2222222222222222222222222222222222222222";

const data:
  HyperliquidIntelligence = {
  ok:
    true,

  network:
    "hyperliquid",

  address:
    SUBJECT,

  analysisPlan:
    "advanced",

  coverage:
    "partial",

  executionSurfaces: {
    hyperCore: {
      accountValue:
        "100",

      withdrawable:
        "80",

      totalNotionalPosition:
        "10",

      totalMarginUsed:
        "2",

      role:
        "user",

      positions:
        [],

      spotBalances:
        [],

      fills:
        [],

      fundingPayments:
        [],

      portfolio:
        [],

      nonFundingLedger: [
        {
          hash:
            "0xledger",

          timestamp:
            "2026-09-30T10:00:00.000Z",

          type:
            "spotTransfer",

          usdc:
            null,

          amount:
            "5",

          token:
            "USDC",

          user:
            COUNTERPARTY,

          destination:
            SUBJECT,

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
      ],
    },

    hyperEvm: {
      chainId:
        999,

      nativeCurrency:
        "HYPE",

      balanceWei:
        "0x0",

      transactionCount:
        1,

      code:
        "0x",

      isContract:
        false,
    },
  },

  derived: {
    hyperCore: {
      openPositionCount:
        0,

      longPositionCount:
        0,

      shortPositionCount:
        0,

      positiveSpotBalanceCount:
        0,

      recentFillCount:
        0,

      fundingPaymentCount:
        0,

      nonZeroFundingPaymentCount:
        0,

      ledgerEventCount:
        1,

      depositCount:
        0,

      withdrawalCount:
        0,

      transferCount:
        1,

      accountClassTransferCount:
        0,

      counterparties: {
        count:
          1,

        addresses: [
          COUNTERPARTY,
        ],
      },
    },

    hyperEvm: {
      hasNativeBalance:
        false,

      hasPriorTransactions:
        true,

      isContract:
        false,
    },
  },

  evidenceCoverage: {
    plan:
      "advanced",

    fillLimit:
      64,

    fundingLimit:
      64,

    fundingLookbackDays:
      90,

    positionLimit:
      32,

    spotBalanceLimit:
      32,

    portfolioPointLimit:
      64,

    ledgerLimit:
      96,

    ledgerLookbackDays:
      90,

    hyperCoreProvider:
      "hyperliquid-info",

    hyperEvmProvider:
      "hyperliquid-json-rpc",
  },

  modules: {
    hyperCoreState: {
      status:
        "complete",

      error:
        null,
    },

    positions: {
      status:
        "complete",

      error:
        null,
    },

    tradingActivity: {
      status:
        "unavailable",

      error:
        null,
    },

    fundingPayments: {
      status:
        "unavailable",

      error:
        null,
    },

    portfolio: {
      status:
        "unavailable",

      error:
        null,
    },

    nonFundingLedger: {
      status:
        "limited",

      error:
        null,
    },

    counterparties: {
      status:
        "limited",

      error:
        null,
    },

    hyperEvmState: {
      status:
        "complete",

      error:
        null,
    },
  },

  findings:
    [],

  caveats:
    [],
};

test(
  "adds explicit HyperCore ledger transfer to the activity timeline",
  () => {
    const timeline =
      buildHyperliquidActivityTimeline(
        data
      );

    const event =
      timeline.events.find(
        item =>
          item.id.startsWith(
            "hl-ledger:"
          )
      );

    assert.ok(
      event
    );

    assert.equal(
      event.direction,
      "incoming"
    );

    assert.equal(
      event.counterparty,
      COUNTERPARTY
    );

    assert.equal(
      timeline
        .evidenceWindow
        .transferCount,
      1
    );
  }
);

test(
  "adds only explicit ledger counterparties to the evidence graph",
  () => {
    const graph =
      buildHyperliquidVisualEvidenceGraph(
        data
      );

    assert.equal(
      graph.nodes.some(
        node =>
          node.label ===
          COUNTERPARTY
      ),
      true
    );

    assert.equal(
      graph.edges.some(
        edge =>
          edge.label ===
          "Explicit HyperCore ledger interaction"
      ),
      true
    );

    assert.equal(
      graph
        .coverage
        .ownershipInference,
      false
    );
  }
);
