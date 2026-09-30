import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTonDerivedAnalysis,
} from "./analysis";

import type {
  TonEvidence,
} from "./types";

const ROOT =
  "0:4098805d2272a61b375350c6b2f5faaaf27c8267d8e7521ff2045104fdc7de76";

const OTHER =
  "0:1111111111111111111111111111111111111111111111111111111111111111";

const evidence:
  TonEvidence = {
    account: {
      address:
        ROOT,

      status:
        "active",

      balanceNano:
        "1000000000",

      codeHash:
        null,

      interfaces:
        [],

      suspended:
        false,

      lastTransactionHash:
        "tx",

      lastTransactionLt:
        "1",
    },

    transactions: [
      {
        transactionHash:
          "tx",

        logicalTime:
          "1",

        timestamp:
          "2026-09-30T00:00:00.000Z",

        totalFeesNano:
          "1000",

        aborted:
          false,

        endStatus:
          "active",

        inbound: {
          source:
            OTHER,

          destination:
            ROOT,

          valueNano:
            "500000000",

          hash:
            "msg",

          opcode:
            null,

          bounced:
            false,
        },

        outbound:
          [],
      },
    ],

    earliestTransactions: [
      {
        transactionHash:
          "tx",

        logicalTime:
          "1",

        timestamp:
          "2026-09-30T00:00:00.000Z",

        totalFeesNano:
          "1000",

        aborted:
          false,

        endStatus:
          "active",

        inbound: {
          source:
            OTHER,

          destination:
            ROOT,

          valueNano:
            "500000000",

          hash:
            "msg",

          opcode:
            null,

          bounced:
            false,
        },

        outbound:
          [],
      },
    ],

    jettonWallets: [
      {
        walletAddress:
          OTHER,

        owner:
          ROOT,

        jettonMaster:
          OTHER,

        balance:
          "10",

        lastTransactionLt:
          "1",

        name:
          "Example",

        symbol:
          "EX",

        validMetadata:
          true,

        scamMetadata:
          false,
      },
    ],

    jettonTransfers:
      [],

    coverage: {
      plan:
        "free",

      historyLimit:
        8,

      earliestHistoryLimit:
        4,

      jettonWalletLimit:
        8,

      jettonTransferLimit:
        8,

      provider:
        "toncenter-v3",
    },
  };

test(
  "builds TON flow counterparties and funding evidence",
  () => {
    const result =
      buildTonDerivedAnalysis({
        address:
          ROOT,

        evidence,
      });

    assert.equal(
      result.flow
        .incomingNano,
      "500000000"
    );

    assert.equal(
      result
        .counterparties
        .count,
      1
    );

    assert.equal(
      result
        .observedFunding
        ?.sourceAddress,
      OTHER
    );

    assert.equal(
      result
        .jettons
        .positiveBalanceCount,
      1
    );
  }
);
