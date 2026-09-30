import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAptosDerivedAnalysis,
} from "./analysis";

import type {
  AptosEvidence,
} from "./types";

const ROOT =
  `0x${"11".repeat(32)}`;

const FUNDER =
  `0x${"22".repeat(32)}`;

const RECEIVER =
  `0x${"33".repeat(32)}`;

const evidence:
  AptosEvidence = {
    chainId:
      1,

    ledgerVersion:
      "100",

    account: {
      address:
        ROOT,

      sequenceNumber:
        "1",

      authenticationKey:
        ROOT,

      statelessCompatible:
        false,
    },

    aptBalanceOctas:
      "100000000",

    fungibleAssets:
      [],

    resources:
      [],

    objects:
      [],

    transactions: [
      {
        transactionHash:
          "incoming",

        version:
          "1",

        timestamp:
          "2026-09-30T00:00:00Z",

        sender:
          FUNDER,

        success:
          true,

        vmStatus:
          "Executed",

        gasUsed:
          "1",

        gasUnitPrice:
          "1",

        sequenceNumber:
          "1",

        replayProtectionNonce:
          null,

        moduleAddress:
          "0x1",

        moduleName:
          "aptos_account",

        functionName:
          "transfer",

        payloadArguments: [
          ROOT,
          "50000000",
        ],

        events: [
          {
            type:
              "0x1::coin::DepositEvent",

            accountAddress:
              ROOT,

            sequenceNumber:
              "1",

            creationNumber:
              "1",

            data: {
              amount:
                "50000000",
            },
          },
        ],

        changes:
          [],
      },

      {
        transactionHash:
          "outgoing",

        version:
          "2",

        timestamp:
          "2026-09-30T01:00:00Z",

        sender:
          ROOT,

        success:
          true,

        vmStatus:
          "Executed",

        gasUsed:
          "1",

        gasUnitPrice:
          "1",

        sequenceNumber:
          "2",

        replayProtectionNonce:
          null,

        moduleAddress:
          "0x1",

        moduleName:
          "aptos_account",

        functionName:
          "transfer",

        payloadArguments: [
          RECEIVER,
          "25000000",
        ],

        events: [
          {
            type:
              "0x1::coin::WithdrawEvent",

            accountAddress:
              ROOT,

            sequenceNumber:
              "2",

            creationNumber:
              "1",

            data: {
              amount:
                "25000000",
            },
          },
        ],

        changes:
          [],
      },
    ],

    earliestTransactions:
      [],

    coverage: {
      plan:
        "free",

      transactionLimit:
        16,

      earliestTransactionLimit:
        6,

      fungibleAssetLimit:
        16,

      resourceLimit:
        16,

      objectLimit:
        12,

      eventLimit:
        32,

      providerRequestBudget:
        8,

      providerRequestsUsed:
        4,

      transactionHistoryMayBePruned:
        false,

      transactionHistoryHasMore:
        false,
    },
  };

test(
  "derives explicit Aptos incoming/outgoing transfer evidence",
  () => {
    const result =
      buildAptosDerivedAnalysis({
        address:
          ROOT,

        evidence,
      });

    assert.equal(
      result.flow
        .incomingTransferCount,
      1
    );

    assert.equal(
      result.flow
        .outgoingTransferCount,
      1
    );

    assert.equal(
      result.flow
        .incomingOctas,
      "50000000"
    );

    assert.equal(
      result.flow
        .outgoingOctas,
      "25000000"
    );

    assert.equal(
      result.counterparties
        .count,
      2
    );

    assert.equal(
      result
        .observedFunding
        ?.sourceAddress,
      FUNDER
    );

    assert.equal(
      result.counterparties
        .items.some(
          item =>
            item.address ===
            ROOT
        ),
      false
    );
  }
);
