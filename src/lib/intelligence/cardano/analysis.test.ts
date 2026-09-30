import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCardanoDerivedAnalysis,
} from "./analysis";

import type {
  CardanoEvidence,
} from "./types";

const ROOT =
  "addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers66hrl8";

const OTHER =
  "addr1qxexample";

const evidence:
  CardanoEvidence = {
    addressState: {
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
    recentTransactions:
      [],
    earliestTransactions:
      [],
    utxos:
      [],
    canonicalTransactions: [
      {
        transactionHash:
          "a".repeat(64),
        blockHash:
          "b".repeat(64),
        blockHeight:
          10,
        blockTime:
          "2026-09-30T00:00:00Z",
        feeLovelace:
          "200000",
        validContract:
          true,
        inputs: [
          {
            address:
              OTHER,
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
    coverage: {
      plan:
        "free",
      historyLimit:
        12,
      earliestHistoryLimit:
        4,
      utxoLimit:
        12,
      assetLimit:
        12,
      canonicalSampleLimit:
        2,
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
        8,
      providerRequestsUsed:
        5,
      primaryProvider:
        "cardano-blockfrost",
      fallbackProvider:
        null,
      fallbackUsed:
        false,
    },
  };

test(
  "derives Cardano incoming flow explicit counterparty and observed funding",
  () => {
    const result =
      buildCardanoDerivedAnalysis({
        address:
          ROOT,
        evidence,
      });

    assert.equal(
      result.flow
        .incomingTransactionCount,
      1
    );

    assert.equal(
      result.flow
        .incomingLovelace,
      "5000000"
    );

    assert.equal(
      result.counterparties
        .count,
      1
    );

    assert.equal(
      result
        .observedFunding
        ?.sourceAddress,
      OTHER
    );
  }
);
