import assert from "node:assert/strict";
import test from "node:test";

import {
  getTonEvidence,
  type TonFetch,
} from "./provider";

const ADDRESS =
  "0:4098805d2272a61b375350c6b2f5faaaf27c8267d8e7521ff2045104fdc7de76";

function response(
  body:
    unknown,
  status =
    200
) {
  return {
    ok:
      status >=
        200 &&
      status <
        300,

    status,

    async json() {
      return body;
    },
  };
}

test(
  "normalizes TON Center v3 evidence",
  async () => {
    const fetchImpl:
      TonFetch =
      async input => {
        const url =
          new URL(
            input
          );

        if (
          url.pathname.endsWith(
            "/accountStates"
          )
        ) {
          return response({
            accounts: [
              {
                address:
                  ADDRESS,

                balance:
                  "1000000000",

                status:
                  "active",

                interfaces: [
                  "wallet_v5r1",
                ],

                suspended:
                  false,

                last_transaction_hash:
                  "tx",

                last_transaction_lt:
                  "1",
              },
            ],
          });
        }

        if (
          url.pathname.endsWith(
            "/transactions"
          )
        ) {
          return response({
            transactions: [
              {
                account:
                  ADDRESS,

                hash:
                  "tx",

                lt:
                  "1",

                now:
                  1_700_000_000,

                total_fees:
                  "100",

                end_status:
                  "active",

                description: {
                  aborted:
                    false,
                },

                in_msg: {
                  source:
                    "0:1111111111111111111111111111111111111111111111111111111111111111",

                  destination:
                    ADDRESS,

                  value:
                    "500",

                  hash:
                    "message",

                  bounced:
                    false,
                },

                out_msgs:
                  [],
              },
            ],
          });
        }

        if (
          url.pathname.endsWith(
            "/jetton/wallets"
          )
        ) {
          return response({
            jetton_wallets: [
              {
                address:
                  "0:2222222222222222222222222222222222222222222222222222222222222222",

                owner:
                  ADDRESS,

                jetton:
                  "0:3333333333333333333333333333333333333333333333333333333333333333",

                balance:
                  "42",

                last_transaction_lt:
                  "2",
              },
            ],

            metadata: {},
          });
        }

        return response({
          jetton_transfers:
            [],
        });
      };

    const result =
      await getTonEvidence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "free",
        },
        {
          fetchImpl,

          baseUrl:
            "https://example.invalid/api/v3",

          apiKey:
            "test",

          timeoutMs:
            1000,

          unauthenticatedDelayMs:
            0,
        }
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        "Expected TON evidence."
      );
    }

    assert.equal(
      result.data
        .account
        .status,
      "active"
    );

    assert.equal(
      result.data
        .transactions
        .length,
      1
    );

    assert.equal(
      result.data
        .jettonWallets
        .length,
      1
    );
  }
);

test(
  "rejects invalid TON address before fetch",
  async () => {
    let called =
      false;

    const fetchImpl:
      TonFetch =
      async () => {
        called =
          true;

        return response(
          {}
        );
      };

    const result =
      await getTonEvidence(
        {
          address:
            "invalid",

          analysisPlan:
            "free",
        },
        {
          fetchImpl,

          baseUrl:
            "https://example.invalid/api/v3",

          apiKey:
            null,

          timeoutMs:
            100,

          unauthenticatedDelayMs:
            0,
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
