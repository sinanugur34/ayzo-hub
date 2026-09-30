import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCardanoActivityTimeline,
  buildCardanoVisualEvidenceGraph,
} from "./presentation";

import type {
  CardanoIntelligence,
} from "./engine";

const ROOT =
  "addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers66hrl8";

const FUNDER =
  "addr1qfunder";

const data:
  CardanoIntelligence = {
    ok:
      true,

    network:
      "cardano",

    address:
      ROOT,

    analysisPlan:
      "advanced",

    coverage:
      "partial",

    account: {
      address:
        ROOT,

      stakeAddress:
        null,

      script:
        false,

      nativeBalanceLovelace:
        "5000000",

      assets:
        [],
    },

    history: {
      transactions: [
        {
          transactionHash:
            "a".repeat(64),

          blockHeight:
            100,

          blockTime:
            "2026-09-30T00:00:00Z",
        },
      ],

      earliestTransactions:
        [],
    },

    utxos:
      [],

    canonicalTransactions: [
      {
        transactionHash:
          "a".repeat(64),

        blockHash:
          "b".repeat(64),

        blockHeight:
          100,

        blockTime:
          "2026-09-30T00:00:00Z",

        feeLovelace:
          "200000",

        validContract:
          true,

        inputs: [
          {
            address:
              FUNDER,

            transactionHash:
              "c".repeat(64),

            outputIndex:
              0,

            amounts: [
              {
                unit:
                  "lovelace",

                quantity:
                  "5000000",

                policyId:
                  null,

                assetNameHex:
                  null,
              },
            ],
          },
        ],

        outputs: [
          {
            address:
              ROOT,

            outputIndex:
              0,

            amounts: [
              {
                unit:
                  "lovelace",

                quantity:
                  "5000000",

                policyId:
                  null,

                assetNameHex:
                  null,
              },
            ],
          },
        ],
      },
    ],

    stake:
      null,

    derived: {
      flow: {
        incomingTransactionCount:
          1,

        outgoingTransactionCount:
          0,

        selfTransactionCount:
          0,

        unresolvedTransactionCount:
          0,

        incomingLovelace:
          "5000000",

        outgoingLovelace:
          "0",
      },

      counterparties: {
        count:
          1,

        items: [
          {
            address:
              FUNDER,

            incomingCount:
              1,

            outgoingCount:
              0,

            observationCount:
              1,

            transactionHashes: [
              "a".repeat(64),
            ],
          },
        ],
      },

      observedFunding: {
        sourceAddress:
          FUNDER,

        transactionHash:
          "a".repeat(64),

        amountLovelace:
          "5000000",

        timestamp:
          "2026-09-30T00:00:00Z",
      },

      assets: {
        currentNativeAssetCount:
          0,

        observedPolicyCount:
          0,
      },

      canonicalCoverage: {
        requested:
          1,

        verified:
          1,

        unavailable:
          0,
      },
    },

    evidenceCoverage: {
      plan:
        "advanced",

      historyLimit:
        96,

      earliestHistoryLimit:
        24,

      utxoLimit:
        96,

      assetLimit:
        96,

      canonicalSampleLimit:
        8,

      canonicalRequested:
        1,

      canonicalVerified:
        1,

      canonicalUnavailable:
        0,

      historyHasMore:
        false,

      utxosHaveMore:
        false,

      providerRequestBudget:
        32,

      providerRequestsUsed:
        5,

      primaryProvider:
        "cardano-blockfrost",

      fallbackProvider:
        null,

      fallbackUsed:
        false,
    },

    modules: {
      accountState: {
        status:
          "complete",

        error:
          null,
      },

      history: {
        status:
          "limited",

        error:
          null,
      },

      canonicalEvidence: {
        status:
          "complete",

        error:
          null,
      },

      utxos: {
        status:
          "limited",

        error:
          null,
      },

      assets: {
        status:
          "limited",

        error:
          null,
      },

      staking: {
        status:
          "unavailable",

        error:
          null,
      },

      flow: {
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

      funding: {
        status:
          "limited",

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
  "builds Cardano timeline from canonical evidence",
  () => {
    const timeline =
      buildCardanoActivityTimeline(
        data
      );

    assert.equal(
      timeline.events.length,
      1
    );

    assert.equal(
      timeline.events[0]
        ?.direction,
      "incoming"
    );

    assert.equal(
      timeline.events[0]
        ?.counterparty,
      FUNDER
    );
  }
);

test(
  "builds Cardano evidence graph without self counterparties",
  () => {
    const graph =
      buildCardanoVisualEvidenceGraph(
        data
      );

    assert.ok(
      graph.nodes.some(
        node =>
          node.label ===
          FUNDER
      )
    );

    assert.equal(
      graph.nodes.filter(
        node =>
          node.label ===
          ROOT
      ).length,
      1
    );

    assert.ok(
      graph.edges.length >
      0
    );
  }
);
