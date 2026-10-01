import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNearDerivedAnalysis,
} from "./analysis";

test(
  "derives explicit NEAR flow counterparties methods and observed funding",
  () => {
    const derived =
      buildNearDerivedAnalysis({
        accountId:
          "alice.near",

        rpc: {
          account: {
            accountId:
              "alice.near",
            accountKind:
              "named",
            amountYoctoNear:
              "100",
            lockedYoctoNear:
              "0",
            storageUsage:
              1,
            storagePaidAt:
              null,
            codeHash:
              null,
            blockHeight:
              10,
            blockHash:
              "block",
          },

          accessKeys: [
            {
              publicKey:
                "ed25519:test",
              nonce:
                1,
              permission: {
                type:
                  "full-access",
              },
            },
          ],

          coverage: {
            plan:
              "free",
            accessKeyLimit:
              16,
            transactionLimit:
              16,
            receiptLimit:
              24,
            fungibleTokenLimit:
              16,
            providerRequestBudget:
              8,
            providerRequestsUsed:
              2,
            indexedHistoryAvailable:
              false,
            coverage:
              "partial",
            unavailableEvidence:
              [],
          },
        },

        indexed: {
          transactions: [
            {
              transactionHash:
                "fund",
              signerId:
                "funder.near",
              receiverId:
                "alice.near",
              blockHeight:
                1,
              blockTimestamp:
                "2026-01-01T00:00:00.000Z",
              actions: [
                {
                  type:
                    "Transfer",
                  senderId:
                    "funder.near",
                  receiverId:
                    "alice.near",
                  transactionHash:
                    "fund",
                  receiptId:
                    null,
                  blockHeight:
                    1,
                  blockTimestamp:
                    "2026-01-01T00:00:00.000Z",
                  methodName:
                    null,
                  depositYoctoNear:
                    "500",
                  publicKey:
                    null,
                },
              ],
            },
            {
              transactionHash:
                "swap",
              signerId:
                "alice.near",
              receiverId:
                "dex.near",
              blockHeight:
                2,
              blockTimestamp:
                "2026-01-02T00:00:00.000Z",
              actions: [
                {
                  type:
                    "FunctionCall",
                  senderId:
                    "alice.near",
                  receiverId:
                    "dex.near",
                  transactionHash:
                    "swap",
                  receiptId:
                    null,
                  blockHeight:
                    2,
                  blockTimestamp:
                    "2026-01-02T00:00:00.000Z",
                  methodName:
                    "swap",
                  depositYoctoNear:
                    "10",
                  publicKey:
                    null,
                },
              ],
            },
          ],

          receipts:
            [],

          coverage: {
            transactionLimit:
              16,
            receiptLimit:
              24,
            providerRequestsUsed:
              3,
            historyAvailable:
              true,
            receiptsAvailable:
              true,
            truncated:
              false,
            unavailableEvidence:
              [],
          },
        },
      });

    assert.equal(
      derived.flow
        .incomingYoctoNear,
      "500"
    );

    assert.equal(
      derived.flow
        .outgoingYoctoNear,
      "10"
    );

    assert.equal(
      derived.counterparties
        .count,
      2
    );

    assert.deepEqual(
      derived.specialist
        .functionCallMethods,
      [
        "swap",
      ]
    );

    assert.equal(
      derived.observedFunding
        ?.sourceAccountId,
      "funder.near"
    );
  }
);
