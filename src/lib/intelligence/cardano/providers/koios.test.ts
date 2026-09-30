import assert from "node:assert/strict";
import test from "node:test";

import {
  getCardanoKoiosEvidence,
  type KoiosFetch,
} from "./koios";

const ADDRESS =
  "addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers66hrl8";

const OTHER =
  "addr1qother";

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
  "normalizes Koios deep Cardano evidence",
  async () => {
    const fetchImpl:
      KoiosFetch =
      async input => {
        const url =
          new URL(input);

        if (
          url.pathname.endsWith(
            "/address_info"
          )
        ) {
          return response([
            {
              balance:
                "9000000",

              stake_address:
                null,

              is_script:
                false,

              asset_list:
                [],
            },
          ]);
        }

        if (
          url.pathname.endsWith(
            "/address_txs"
          )
        ) {
          return response([
            {
              tx_hash:
                "a".repeat(64),

              block_height:
                100,

              tx_timestamp:
                "2026-09-30T00:00:00Z",
            },
          ]);
        }

        if (
          url.pathname.endsWith(
            "/address_utxos"
          )
        ) {
          return response([
            {
              tx_hash:
                "b".repeat(64),

              tx_index:
                0,

              block_hash:
                "c".repeat(64),

              value:
                "9000000",

              asset_list:
                [],
            },
          ]);
        }

        if (
          url.pathname.endsWith(
            "/tx_info"
          )
        ) {
          return response([
            {
              tx_hash:
                "a".repeat(64),

              block_hash:
                "d".repeat(64),

              block_height:
                100,

              tx_timestamp:
                "2026-09-30T00:00:00Z",

              fee:
                "200000",

              inputs: [
                {
                  payment_addr:
                    OTHER,

                  tx_hash:
                    "e".repeat(64),

                  tx_index:
                    0,

                  value:
                    "9000000",

                  asset_list:
                    [],
                },
              ],

              outputs: [
                {
                  payment_addr:
                    ADDRESS,

                  tx_index:
                    0,

                  value:
                    "9000000",

                  asset_list:
                    [],
                },
              ],
            },
          ]);
        }

        return response(
          [],
          404
        );
      };

    const result =
      await getCardanoKoiosEvidence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "free",
        },
        {
          fetchImpl,

          baseUrl:
            "https://example.invalid/api/v1",

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
        "Expected Koios evidence."
      );
    }

    assert.equal(
      result.data
        .addressState
        .nativeBalanceLovelace,
      "9000000"
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
  "maps Koios rate limiting",
  async () => {
    const result =
      await getCardanoKoiosEvidence(
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
                429
              ),

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

    if (!result.ok) {
      assert.equal(
        result.code,
        "RATE_LIMITED"
      );
    }
  }
);
