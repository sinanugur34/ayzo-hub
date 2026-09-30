import assert from "node:assert/strict";
import test from "node:test";

import {
  getNearIndexedEvidence,
  type NearBlocksFetch,
} from "./nearblocks";

function response(
  body:
    unknown,
  status =
    200
) {
  return {
    ok:
      status >= 200 &&
      status < 300,

    status,

    async json() {
      return body;
    },
  };
}

test(
  "normalizes bounded NearBlocks transaction and receipt evidence",
  async () => {
    const fetchImpl:
      NearBlocksFetch =
      async input => {
        const url =
          new URL(input);

        if (
          url.pathname ===
            "/v1/txns" &&
          url.searchParams.get(
            "from"
          ) ===
            "alice.near"
        ) {
          return response({
            txns: [
              {
                transaction_hash:
                  "out-hash",

                signer_account_id:
                  "alice.near",

                receiver_account_id:
                  "dex.near",

                block_height:
                  200,

                block_timestamp:
                  "1700000000000000000",

                actions: [
                  {
                    action:
                      "FUNCTION_CALL",

                    method_name:
                      "swap",

                    deposit:
                      "1000",
                  },
                ],
              },
            ],
          });
        }

        if (
          url.pathname ===
            "/v1/txns" &&
          url.searchParams.get(
            "to"
          ) ===
            "alice.near"
        ) {
          return response({
            txns: [
              {
                transaction_hash:
                  "in-hash",

                signer_account_id:
                  "funder.near",

                receiver_account_id:
                  "alice.near",

                block_height:
                  100,

                block_timestamp:
                  "1690000000000000000",

                actions: [
                  {
                    action:
                      "TRANSFER",

                    deposit:
                      "5000",
                  },
                ],
              },
            ],
          });
        }

        if (
          url.pathname ===
            "/v1/account/alice.near/receipts"
        ) {
          return response({
            receipts: [
              {
                receipt_id:
                  "receipt-1",

                predecessor_account_id:
                  "dex.near",

                receiver_account_id:
                  "alice.near",

                transaction_hash:
                  "out-hash",

                block_height:
                  201,

                block_timestamp:
                  "1700000001000000000",

                actions: [
                  {
                    action:
                      "TRANSFER",

                    deposit:
                      "25",
                  },
                ],
              },
            ],
          });
        }

        return response(
          {},
          404
        );
      };

    const result =
      await getNearIndexedEvidence(
        {
          accountId:
            "alice.near",

          analysisPlan:
            "free",
        },
        {
          fetchImpl,

          baseUrl:
            "https://example.invalid/v1",

          apiKey:
            null,

          timeoutMs:
            1000,
        }
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        "Expected indexed NEAR evidence."
      );
    }

    assert.equal(
      result.data
        .transactions.length,
      2
    );

    assert.equal(
      result.data
        .receipts.length,
      1
    );

    assert.equal(
      result.data
        .transactions
        .find(
          tx =>
            tx.transactionHash ===
            "out-hash"
        )
        ?.actions[0]
        ?.methodName,
      "swap"
    );

    assert.equal(
      result.data
        .receipts[0]
        ?.predecessorId,
      "dex.near"
    );

    assert.equal(
      result.data
        .coverage
        .providerRequestsUsed,
      3
    );
  }
);

test(
  "rejects invalid NEAR account before indexed requests",
  async () => {
    let called =
      false;

    const result =
      await getNearIndexedEvidence(
        {
          accountId:
            "INVALID.NEAR",

          analysisPlan:
            "free",
        },
        {
          fetchImpl:
            async () => {
              called =
                true;

              return response(
                {}
              );
            },

          baseUrl:
            "https://example.invalid/v1",

          apiKey:
            null,

          timeoutMs:
            1000,
        }
      );

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      called,
      false
    );
  }
);
