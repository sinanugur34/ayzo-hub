import assert from "node:assert/strict";
import test from "node:test";

import {
  runNearIntelligence,
} from "./engine";

test(
  "runs NEAR deep intelligence with native RPC and indexed evidence",
  async () => {
    const result =
      await runNearIntelligence(
        {
          address:
            "alice.near",

          analysisPlan:
            "pro",
        },
        {
          async loadRpc(
            input
          ) {
            return {
              ok:
                true,

              providerId:
                "near-rpc",

              latencyMs:
                1,

              data: {
                account: {
                  accountId:
                    input.accountId,
                  accountKind:
                    "named",
                  amountYoctoNear:
                    "1000",
                  lockedYoctoNear:
                    "0",
                  storageUsage:
                    10,
                  storagePaidAt:
                    null,
                  codeHash:
                    null,
                  blockHeight:
                    100,
                  blockHash:
                    "block",
                },

                accessKeys:
                  [],

                coverage: {
                  plan:
                    input.analysisPlan,
                  accessKeyLimit:
                    48,
                  transactionLimit:
                    48,
                  receiptLimit:
                    72,
                  fungibleTokenLimit:
                    48,
                  providerRequestBudget:
                    16,
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
            };
          },

          async loadIndexed() {
            return {
              ok:
                true,

              providerId:
                "near-nearblocks",

              latencyMs:
                1,

              data: {
                transactions: [
                  {
                    transactionHash:
                      "fund",
                    signerId:
                      "funder.near",
                    receiverId:
                      "alice.near",
                    blockHeight:
                      90,
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
                          90,
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
                ],

                receipts:
                  [],

                coverage: {
                  transactionLimit:
                    48,
                  receiptLimit:
                    72,
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
            };
          },
        }
      );

    assert.equal(
      result.status,
      200
    );

    assert.equal(
      result.data.ok,
      true
    );

    if (!result.data.ok) {
      assert.fail(
        "Expected NEAR intelligence."
      );
    }

    assert.equal(
      result.data.network,
      "near"
    );

    assert.equal(
      result.data.coverage,
      "partial"
    );

    assert.equal(
      result.data.derived
        .observedFunding
        ?.sourceAccountId,
      "funder.near"
    );
  }
);

test(
  "rejects invalid NEAR address before provider work",
  async () => {
    let called =
      false;

    const result =
      await runNearIntelligence(
        {
          address:
            "INVALID.NEAR",
        },
        {
          async loadRpc() {
            called =
              true;

            throw new Error(
              "must not run"
            );
          },
        }
      );

    assert.equal(
      result.status,
      400
    );

    assert.equal(
      called,
      false
    );
  }
);
