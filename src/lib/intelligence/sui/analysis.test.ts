import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSuiDerivedAnalysis,
} from "./analysis";

import type {
  SuiAccountEvidence,
} from "./types";

const ADDRESS =
  `0x${"11".repeat(32)}`;

const FUNDER =
  `0x${"22".repeat(32)}`;

const evidence:
  SuiAccountEvidence = {
    chainIdentifier:
      "test",

    address:
      ADDRESS,

    suiBalanceMist:
      "1000000000",

    balances: [
      {
        coinType:
          "0x2::sui::SUI",

        totalBalance:
          "1000000000",

        coinBalance:
          "1000000000",

        addressBalance:
          "0",

        symbol:
          "SUI",

        name:
          "Sui",

        decimals:
          9,
      },
    ],

    ownedObjects:
      [],

    transactions: [
      {
        transactionHash:
          "tx-1",

        sender:
          FUNDER,

        timestamp:
          "2026-09-30T00:00:00Z",

        status:
          "SUCCESS",

        balanceChanges: [
          {
            owner:
              ADDRESS,

            coinType:
              "0x2::sui::SUI",

            amount:
              "500000000",
          },

          {
            owner:
              FUNDER,

            coinType:
              "0x2::sui::SUI",

            amount:
              "-500000000",
          },
        ],

        objectChanges: [
          {
            objectId:
              `0x${"33".repeat(32)}`,

            idCreated:
              true,

            idDeleted:
              false,
          },
        ],
      },
    ],

    earliestTransactions: [
      {
        transactionHash:
          "tx-1",

        sender:
          FUNDER,

        timestamp:
          "2026-09-30T00:00:00Z",

        status:
          "SUCCESS",

        balanceChanges: [
          {
            owner:
              ADDRESS,

            coinType:
              "0x2::sui::SUI",

            amount:
              "500000000",
          },
        ],

        objectChanges:
          [],
      },
    ],

    subjectObject: {
      exists:
        false,

      kind:
        null,

      objectId:
        null,

      version:
        null,

      digest:
        null,

      type:
        null,

      hasPublicTransfer:
        null,
    },

    coverage: {
      plan:
        "free",

      historyLimit:
        8,

      earliestHistoryLimit:
        4,

      balanceLimit:
        8,

      objectLimit:
        8,

      historyHasMore:
        false,

      earliestHistoryHasMore:
        false,

      balancesHaveMore:
        false,

      objectsHaveMore:
        false,
    },
  };

test(
  "builds Sui flow counterparties objects and funding evidence",
  () => {
    const result =
      buildSuiDerivedAnalysis({
        address:
          ADDRESS,

        evidence,
      });

    assert.equal(
      result.flow
        .incomingTransactionCount,
      1
    );

    assert.equal(
      result.flow
        .incomingMist,
      "500000000"
    );

    assert.ok(
      result.counterparties
        .count >=
        1
    );

    assert.equal(
      result.objectActivity
        .created,
      1
    );

    assert.equal(
      result.observedFunding
        ?.observedSender,
      FUNDER
    );
  }
);
