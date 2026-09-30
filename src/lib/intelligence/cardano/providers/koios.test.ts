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

function readBody(
  init?: RequestInit
): Record<string, unknown> {
  assert.equal(
    init?.method,
    "POST"
  );

  const headers =
    new Headers(
      init?.headers
    );

  assert.equal(
    headers.get(
      "content-type"
    ),
    "application/json"
  );

  assert.equal(
    typeof init?.body,
    "string"
  );

  return JSON.parse(
    String(
      init?.body
    )
  ) as Record<
    string,
    unknown
  >;
}

test(
  "normalizes current Koios v1 deep Cardano evidence over POST contracts",
  async () => {
    const paths:
      string[] =
      [];

    const fetchImpl:
      KoiosFetch =
      async (
        input,
        init
      ) => {
        const url =
          new URL(input);

        paths.push(
          url.pathname
        );

        const body =
          readBody(init);

        if (
          url.pathname.endsWith(
            "/address_info"
          )
        ) {
          assert.deepEqual(
            body,
            {
              _addresses: [
                ADDRESS,
              ],
            }
          );

          return response([
            {
              address:
                ADDRESS,

              balance:
                "9000000",

              stake_address:
                null,

              script_address:
                false,

              utxo_set:
                [],
            },
          ]);
        }

        if (
          url.pathname.endsWith(
            "/address_txs"
          )
        ) {
          assert.deepEqual(
            body,
            {
              _addresses: [
                ADDRESS,
              ],
            }
          );

          return response([
            {
              tx_hash:
                "a".repeat(
                  64
                ),

              block_height:
                100,

              block_time:
                1700000000,
            },
          ]);
        }

        if (
          url.pathname.endsWith(
            "/address_utxos"
          )
        ) {
          assert.deepEqual(
            body,
            {
              _addresses: [
                ADDRESS,
              ],

              _extended:
                true,
            }
          );

          return response([
            {
              tx_hash:
                "b".repeat(
                  64
                ),

              tx_index:
                0,

              value:
                "9000000",

              datum_hash:
                null,

              inline_datum: {
                bytes:
                  "19029a",
              },

              reference_script: {
                hash:
                  "c".repeat(
                    56
                  ),
              },

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
          assert.deepEqual(
            body,
            {
              _tx_hashes: [
                "a".repeat(
                  64
                ),
              ],

              _inputs:
                true,

              _assets:
                true,
            }
          );

          return response([
            {
              tx_hash:
                "a".repeat(
                  64
                ),

              block_hash:
                "d".repeat(
                  64
                ),

              block_height:
                100,

              tx_timestamp:
                1700000000,

              fee:
                "200000",

              valid_contract:
                true,

              inputs: [
                {
                  payment_addr: {
                    bech32:
                      OTHER,
                    cred:
                      "e".repeat(
                        56
                      ),
                  },

                  tx_hash:
                    "e".repeat(
                      64
                    ),

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
                  payment_addr: {
                    bech32:
                      ADDRESS,
                    cred:
                      "f".repeat(
                        56
                      ),
                  },

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
        .addressState
        .script,
      false
    );

    assert.equal(
      result.data
        .recentTransactions[0]
        ?.blockTime,
      "2023-11-14T22:13:20.000Z"
    );

    assert.equal(
      result.data
        .canonicalTransactions
        .length,
      1
    );

    assert.equal(
      result.data
        .canonicalTransactions[0]
        ?.blockTime,
      "2023-11-14T22:13:20.000Z"
    );

    assert.equal(
      result.data
        .canonicalTransactions[0]
        ?.inputs[0]
        ?.address,
      OTHER
    );

    assert.equal(
      result.data
        .canonicalTransactions[0]
        ?.outputs[0]
        ?.address,
      ADDRESS
    );

    assert.equal(
      result.data
        .utxos
        .length,
      1
    );

    assert.equal(
      result.data
        .utxos[0]
        ?.inlineDatum,
      "19029a"
    );

    assert.equal(
      result.data
        .utxos[0]
        ?.referenceScriptHash,
      "c".repeat(
        56
      )
    );

    assert.deepEqual(
      paths,
      [
        "/api/v1/address_info",
        "/api/v1/address_txs",
        "/api/v1/address_utxos",
        "/api/v1/tx_info",
      ]
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
            async (
              _input,
              init
            ) => {
              readBody(
                init
              );

              return response(
                {},
                429
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

    if (!result.ok) {
      assert.equal(
        result.code,
        "RATE_LIMITED"
      );
    }
  }
);
