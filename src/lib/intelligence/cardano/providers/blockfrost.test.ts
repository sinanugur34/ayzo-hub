import assert from "node:assert/strict";
import test from "node:test";

import {
  getCardanoBlockfrostEvidence,
  type CardanoFetch,
} from "./blockfrost";

const ADDRESS =
  "addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers66hrl8";

function response(
  body: unknown,
  status = 200
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
  "normalizes Blockfrost Cardano deep evidence",
  async () => {
    const fetchImpl:
      CardanoFetch =
      async input => {
        const url =
          new URL(input);

        if (
          url.pathname.endsWith(
            `/addresses/${ADDRESS}`
          )
        ) {
          return response({
            address:
              ADDRESS,
            amount: [
              {
                unit:
                  "lovelace",
                quantity:
                  "5000000",
              },
            ],
            stake_address:
              null,
            script:
              false,
          });
        }

        if (
          url.pathname.endsWith(
            "/transactions"
          )
        ) {
          return response([
            {
              tx_hash:
                "a".repeat(64),
              block_height:
                100,
              block_time:
                1_700_000_000,
            },
          ]);
        }

        if (
          url.pathname.endsWith(
            `/txs/${"a".repeat(64)}/utxos`
          )
        ) {
          return response({
            inputs: [
              {
                address:
                  "addr1qexample",
                tx_hash:
                  "d".repeat(64),
                output_index:
                  0,
                amount: [
                  {
                    unit:
                      "lovelace",
                    quantity:
                      "7000000",
                  },
                ],
              },
            ],
            outputs: [
              {
                address:
                  ADDRESS,
                output_index:
                  0,
                amount: [
                  {
                    unit:
                      "lovelace",
                    quantity:
                      "5000000",
                  },
                ],
              },
            ],
          });
        }

        if (
          url.pathname.endsWith(
            "/utxos"
          )
        ) {
          return response([
            {
              tx_hash:
                "b".repeat(64),
              output_index:
                0,
              block:
                "c".repeat(64),
              amount: [
                {
                  unit:
                    "lovelace",
                  quantity:
                    "5000000",
                },
              ],
              data_hash:
                null,
              inline_datum:
                null,
              reference_script_hash:
                null,
            },
          ]);
        }

        if (
          url.pathname.endsWith(
            `/txs/${"a".repeat(64)}`
          )
        ) {
          return response({
            hash:
              "a".repeat(64),
            block:
              "e".repeat(64),
            block_height:
              100,
            block_time:
              1_700_000_000,
            fees:
              "200000",
            valid_contract:
              true,
          });
        }

        return response(
          {},
          404
        );
      };

    const result =
      await getCardanoBlockfrostEvidence(
        {
          address:
            ADDRESS,
          analysisPlan:
            "free",
        },
        {
          fetchImpl,
          baseUrl:
            "https://example.invalid/api/v0",
          projectId:
            "test-project-id",
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
        "Expected Cardano evidence."
      );
    }

    assert.equal(
      result.data
        .addressState
        .nativeBalanceLovelace,
      "5000000"
    );

    assert.equal(
      result.data
        .recentTransactions
        .length,
      1
    );

    assert.equal(
      result.data
        .canonicalTransactions
        .length,
      1
    );

    assert.equal(
      result.data
        .utxos
        .length,
      1
    );
  }
);

test(
  "rejects invalid Cardano payment address before Blockfrost access",
  async () => {
    let called =
      false;

    const result =
      await getCardanoBlockfrostEvidence(
        {
          address:
            "invalid",
          analysisPlan:
            "free",
        },
        {
          fetchImpl:
            async () => {
              called =
                true;
              return response({});
            },
          baseUrl:
            "https://example.invalid",
          projectId:
            "test",
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

test(
  "maps Blockfrost quota and rate limits safely",
  async () => {
    for (
      const status of [
        402,
        418,
        429,
      ]
    ) {
      const result =
        await getCardanoBlockfrostEvidence(
          {
            address:
              ADDRESS,
            analysisPlan:
              "free",
          },
          {
            fetchImpl:
              async () =>
                response(
                  {},
                  status
                ),
            baseUrl:
              "https://example.invalid",
            projectId:
              "test",
            timeoutMs:
              1000,
          }
        );

      assert.equal(
        result.ok,
        false
      );

      if (!result.ok) {
        assert.equal(
          result.code,
          "RATE_LIMITED"
        );
      }
    }
  }
);
