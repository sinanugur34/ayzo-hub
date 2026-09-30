import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStellarDerivedAnalysis,
} from "./analysis";

import type {
  StellarEvidence,
} from "./types";

const ROOT =
  "GDMQQNJM4UL7QIA66P7R2PZHMQINWZBM77BEBMHLFXD5JEUAHGJ7R4JZ";

const OTHER =
  "GA3DJTZDPH5BM4BYJZBQIYJWVAZHNLZHZX6F3OYCQY2VQZIJ7XQOWYSN";

const evidence:
  StellarEvidence = {
    account: {
      id:
        ROOT,

      sequence:
        "1",

      subentryCount:
        1,

      inflationDestination:
        null,

      homeDomain:
        null,

      lastModifiedLedger:
        null,

      lastModifiedTime:
        null,

      thresholds: {
        low:
          1,

        medium:
          1,

        high:
          1,
      },

      flags: {
        authRequired:
          false,

        authRevocable:
          false,

        authImmutable:
          false,

        authClawbackEnabled:
          false,
      },

      balances: [
        {
          assetType:
            "native",

          assetCode:
            null,

          assetIssuer:
            null,

          balance:
            "20.0000000",

          limit:
            null,

          authorized:
            null,

          authorizedToMaintainLiabilities:
            null,

          clawbackEnabled:
            null,
        },

        {
          assetType:
            "credit_alphanum4",

          assetCode:
            "USDC",

          assetIssuer:
            OTHER,

          balance:
            "5.0000000",

          limit:
            "1000.0000000",

          authorized:
            true,

          authorizedToMaintainLiabilities:
            false,

          clawbackEnabled:
            false,
        },
      ],

      signers:
        [],
    },

    transactions:
      [],

    payments: [
      {
        id:
          "1",

        type:
          "payment",

        transactionHash:
          "tx",

        createdAt:
          "2026-09-30T00:00:00Z",

        source:
          OTHER,

        destination:
          ROOT,

        funder:
          null,

        createdAccount:
          null,

        amount:
          "10.0000000",

        startingBalance:
          null,

        assetType:
          "native",

        assetCode:
          null,

        assetIssuer:
          null,
      },
    ],

    earliestPayments: [
      {
        id:
          "1",

        type:
          "payment",

        transactionHash:
          "tx",

        createdAt:
          "2026-09-30T00:00:00Z",

        source:
          OTHER,

        destination:
          ROOT,

        funder:
          null,

        createdAccount:
          null,

        amount:
          "10.0000000",

        startingBalance:
          null,

        assetType:
          "native",

        assetCode:
          null,

        assetIssuer:
          null,
      },
    ],

    operations:
      [],

    offers:
      [],

    trades:
      [],

    coverage: {
      plan:
        "free",

      transactionLimit:
        8,

      paymentLimit:
        8,

      earliestPaymentLimit:
        4,

      operationLimit:
        8,

      offerLimit:
        8,

      tradeLimit:
        8,

      provider:
        "stellar-horizon",
    },
  };

test(
  "derives Stellar trustlines relationships and funding",
  () => {
    const result =
      buildStellarDerivedAnalysis({
        address:
          ROOT,

        evidence,
      });

    assert.equal(
      result.nativeBalanceXlm,
      "20.0000000"
    );

    assert.equal(
      result.trustlines.count,
      1
    );

    assert.equal(
      result.counterparties.count,
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
