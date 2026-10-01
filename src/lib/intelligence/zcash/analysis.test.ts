import assert from "node:assert/strict";
import test from "node:test";

import {
  buildZcashDerivedAnalysis,
} from "./analysis";

import {
  getZcashAnalysisPolicy,
} from "./policy";

import type {
  ZcashEvidence,
} from "./types";

const ROOT =
  "t1RyCw14wRXrh3mp21uxgr9ynjem7cNUkMH";

const SOURCE =
  "t1PKBiv7mtzD9bNafYaqyxaENeiNDbpKxxQ";

const TARGET =
  "t1dY1q5BvE1sEecTiPw1LnQ398skmPrUQQD";

test(
  "derives conservative transparent Zcash flow counterparties funding privacy boundary timeline and graph",
  () => {
    const evidence:
      ZcashEvidence = {
        network:
          "zcash",

        address:
          ROOT,

        addressKind:
          "transparent-p2pkh",

        analysisPlan:
          "free",

        balanceZatoshis:
          "500",

        totalReceivedZatoshis:
          "1500",

        totalSpentZatoshis:
          "1000",

        transactions: [
          {
            txid:
              "a".repeat(
                64
              ),

            height:
              null,

            timestamp:
              null,
          },
        ],

        utxos:
          [],

        canonicalTransactions: [
          {
            txid:
              "a".repeat(
                64
              ),

            height:
              100,

            timestamp:
              "2026-01-01 00:00:00",

            coinbase:
              false,

            inputs: [
              {
                previousTransactionHash:
                  "c".repeat(
                    64
                  ),

                previousOutputIndex:
                  0,

                address:
                  SOURCE,

                valueZatoshis:
                  "500",
              },
            ],

            outputs: [
              {
                index:
                  0,

                address:
                  ROOT,

                valueZatoshis:
                  "500",
              },

              {
                index:
                  1,

                address:
                  null,

                valueZatoshis:
                  null,
              },
            ],
          },

          {
            txid:
              "b".repeat(
                64
              ),

            height:
              101,

            timestamp:
              "2026-01-02 00:00:00",

            coinbase:
              false,

            inputs: [
              {
                previousTransactionHash:
                  "a".repeat(
                    64
                  ),

                previousOutputIndex:
                  0,

                address:
                  ROOT,

                valueZatoshis:
                  "500",
              },
            ],

            outputs: [
              {
                index:
                  0,

                address:
                  TARGET,

                valueZatoshis:
                  "300",
              },

              {
                index:
                  1,

                address:
                  ROOT,

                valueZatoshis:
                  "200",
              },
            ],
          },
        ],

        coverage: {
          plan:
            "free",

          historyLimit:
            16,

          canonicalSampleLimit:
            4,

          utxoLimit:
            24,

          providerRequestBudget:
            12,

          providerRequestsUsed:
            3,

          historyHasMore:
            false,

          utxosHaveMore:
            false,

          canonicalRequested:
            2,

          canonicalVerified:
            2,

          canonicalUnavailable:
            0,
        },
      };

    const derived =
      buildZcashDerivedAnalysis({
        address:
          ROOT,

        evidence,

        policy:
          getZcashAnalysisPolicy(
            "free"
          ),
      });

    assert.equal(
      derived.flow
        .incomingTransactionCount,
      1
    );

    assert.equal(
      derived.flow
        .outgoingTransactionCount,
      1
    );

    /*
     * The second transaction spends ROOT
     * and returns 200 to ROOT. That output
     * must not be counted as fresh inbound
     * evidence.
     */
    assert.equal(
      derived.flow
        .incomingZatoshis,
      "500"
    );

    assert.equal(
      derived.flow
        .explicitOutgoingZatoshis,
      "300"
    );

    assert.equal(
      derived
        .counterparties
        .count,
      2
    );

    assert.equal(
      derived
        .observedFunding
        ?.sourceAddress,
      SOURCE
    );

    assert.equal(
      derived
        .privacyBoundary
        .unresolvedOutputCount,
      1
    );

    assert.equal(
      derived
        .timeline
        .events
        .length,
      2
    );

    assert.equal(
      derived
        .graph
        .nodes
        .length,
      3
    );

    assert.equal(
      derived
        .graph
        .edges
        .length,
      2
    );
  }
);

test(
  "does not attribute funding when multiple transparent inputs exist",
  () => {
    const evidence:
      ZcashEvidence = {
        network:
          "zcash",

        address:
          ROOT,

        addressKind:
          "transparent-p2pkh",

        analysisPlan:
          "free",

        balanceZatoshis:
          "1",

        totalReceivedZatoshis:
          "1",

        totalSpentZatoshis:
          "0",

        transactions:
          [],

        utxos:
          [],

        canonicalTransactions: [
          {
            txid:
              "d".repeat(
                64
              ),

            height:
              200,

            timestamp:
              null,

            coinbase:
              false,

            inputs: [
              {
                previousTransactionHash:
                  null,

                previousOutputIndex:
                  null,

                address:
                  SOURCE,

                valueZatoshis:
                  "1",
              },

              {
                previousTransactionHash:
                  null,

                previousOutputIndex:
                  null,

                address:
                  TARGET,

                valueZatoshis:
                  "1",
              },
            ],

            outputs: [
              {
                index:
                  0,

                address:
                  ROOT,

                valueZatoshis:
                  "1",
              },
            ],
          },
        ],

        coverage: {
          plan:
            "free",

          historyLimit:
            16,

          canonicalSampleLimit:
            4,

          utxoLimit:
            24,

          providerRequestBudget:
            12,

          providerRequestsUsed:
            2,

          historyHasMore:
            false,

          utxosHaveMore:
            false,

          canonicalRequested:
            1,

          canonicalVerified:
            1,

          canonicalUnavailable:
            0,
        },
      };

    const derived =
      buildZcashDerivedAnalysis({
        address:
          ROOT,

        evidence,

        policy:
          getZcashAnalysisPolicy(
            "free"
          ),
      });

    assert.equal(
      derived
        .observedFunding,
      null
    );

    assert.equal(
      derived.flow
        .transfers
        .every(
          transfer =>
            transfer
              .amountZatoshis ===
            null
        ),
      true
    );
  }
);
