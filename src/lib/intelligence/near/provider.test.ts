import assert from "node:assert/strict";
import test from "node:test";

import {
  getNearRpcEvidence,
  type NearFetch,
} from "./provider";

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
  "normalizes NEAR account state and access-key evidence",
  async () => {
    const seen:
      string[] = [];

    const fetchImpl:
      NearFetch =
      async (
        _input,
        init
      ) => {
        const body =
          JSON.parse(
            String(
              init?.body
            )
          );

        const requestType =
          body.params
            ?.request_type;

        seen.push(
          requestType
        );

        if (
          requestType ===
            "view_account"
        ) {
          return response({
            jsonrpc:
              "2.0",

            id:
              "ayzo",

            result: {
              amount:
                "1000000000000000000000000",

              locked:
                "250000000000000000000000",

              code_hash:
                "11111111111111111111111111111111",

              storage_usage:
                2048,

              storage_paid_at:
                0,

              block_height:
                123,

              block_hash:
                "block-hash",
            },
          });
        }

        if (
          requestType ===
            "view_access_key_list"
        ) {
          return response({
            jsonrpc:
              "2.0",

            id:
              "ayzo",

            result: {
              keys: [
                {
                  public_key:
                    "ed25519:full",

                  access_key: {
                    nonce:
                      7,

                    permission:
                      "FullAccess",
                  },
                },

                {
                  public_key:
                    "ed25519:function",

                  access_key: {
                    nonce:
                      8,

                    permission: {
                      FunctionCall: {
                        allowance:
                          "50000000000000000000000",

                        receiver_id:
                          "contract.near",

                        method_names: [
                          "swap",
                          "deposit",
                        ],
                      },
                    },
                  },
                },
              ],
            },
          });
        }

        return response(
          {},
          500
        );
      };

    const result =
      await getNearRpcEvidence(
        {
          accountId:
            "alice.near",

          analysisPlan:
            "free",
        },
        {
          fetchImpl,

          baseUrl:
            "https://example.invalid",

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
        "Expected NEAR RPC evidence."
      );
    }

    assert.equal(
      result.data
        .account.accountId,
      "alice.near"
    );

    assert.equal(
      result.data
        .account.amountYoctoNear,
      "1000000000000000000000000"
    );

    assert.equal(
      result.data
        .accessKeys.length,
      2
    );

    assert.deepEqual(
      result.data
        .accessKeys[1]
        ?.permission,
      {
        type:
          "function-call",

        allowanceYoctoNear:
          "50000000000000000000000",

        receiverId:
          "contract.near",

        methodNames: [
          "swap",
          "deposit",
        ],
      }
    );

    assert.equal(
      result.data
        .coverage.coverage,
      "partial"
    );

    assert.equal(
      result.data
        .coverage
        .indexedHistoryAvailable,
      false
    );

    assert.deepEqual(
      seen,
      [
        "view_account",
        "view_access_key_list",
      ]
    );
  }
);

test(
  "rejects invalid NEAR account before provider access",
  async () => {
    let called =
      false;

    const result =
      await getNearRpcEvidence(
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
            "https://example.invalid",

          timeoutMs:
            1000,
        }
      );

    assert.equal(
      result.ok,
      false
    );

    if (result.ok) {
      assert.fail(
        "Expected failure."
      );
    }

    assert.equal(
      result.code,
      "INVALID_ACCOUNT"
    );

    assert.equal(
      called,
      false
    );
  }
);
