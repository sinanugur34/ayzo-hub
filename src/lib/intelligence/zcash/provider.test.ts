import assert from "node:assert/strict";
import test from "node:test";

import {
  getZcashBlockchairEvidence,
} from "./provider";

const ADDRESS =
  "t1RyCw14wRXrh3mp21uxgr9ynjem7cNUkMH";

const SOURCE =
  "t1PKBiv7mtzD9bNafYaqyxaENeiNDbpKxxQ";

const TARGET =
  "t1dY1q5BvE1sEecTiPw1LnQ398skmPrUQQD";

const HASH_A =
  "a".repeat(
    64
  );

const HASH_B =
  "b".repeat(
    64
  );

function json(
  body:
    unknown,
  status =
    200
) {
  return new Response(
    JSON.stringify(
      body
    ),
    {
      status,

      headers: {
        "Content-Type":
          "application/json",
      },
    }
  );
}

test(
  "normalizes bounded Blockchair Zcash address UTXO and canonical evidence",
  async () => {
    const requested:
      string[] = [];

    const result =
      await getZcashBlockchairEvidence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "free",
        },
        {
          baseUrl:
            "https://example.test",

          timeoutMs:
            2_000,

          fetchImpl:
            async input => {
              const url =
                new URL(
                  String(
                    input
                  )
                );

              requested.push(
                url.toString()
              );

              if (
                url.pathname ===
                `/dashboards/address/${ADDRESS}`
              ) {
                return json({
                  data: {
                    [ADDRESS]: {
                      address: {
                        balance:
                          500,

                        received:
                          1500,

                        spent:
                          1000,

                        transaction_count:
                          2,

                        unspent_output_count:
                          1,
                      },

                      transactions: [
                        HASH_A,
                        HASH_B,
                      ],

                      utxo: [
                        {
                          block_id:
                            100,

                          transaction_hash:
                            HASH_A,

                          index:
                            1,

                          value:
                            500,
                        },
                      ],
                    },
                  },
                });
              }

              const match =
                url.pathname.match(
                  /^\/dashboards\/transaction\/([0-9a-f]{64})$/
                );

              if (match) {
                const hash =
                  match[1]!;

                return json({
                  data: {
                    [hash]: {
                      transaction: {
                        hash,

                        block_id:
                          100,

                        time:
                          "2026-01-01 00:00:00",

                        is_coinbase:
                          false,
                      },

                      inputs: [
                        {
                          transaction_hash:
                            "c".repeat(
                              64
                            ),

                          index:
                            0,

                          recipient:
                            SOURCE,

                          value:
                            1500,
                        },
                      ],

                      outputs: [
                        {
                          index:
                            0,

                          recipient:
                            ADDRESS,

                          value:
                            500,
                        },

                        {
                          index:
                            1,

                          recipient:
                            TARGET,

                          value:
                            1000,
                        },
                      ],
                    },
                  },
                });
              }

              return json(
                {},
                404
              );
            },
        }
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      return;
    }

    assert.equal(
      result.data
        .balanceZatoshis,
      "500"
    );

    assert.equal(
      result.data
        .totalReceivedZatoshis,
      "1500"
    );

    assert.equal(
      result.data
        .utxos.length,
      1
    );

    assert.equal(
      result.data
        .canonicalTransactions
        .length,
      2
    );

    assert.equal(
      result.data
        .canonicalTransactions[0]
        ?.inputs[0]
        ?.address,
      SOURCE
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
        .coverage
        .providerRequestsUsed,
      3
    );

    assert.ok(
      requested[0]
        ?.includes(
          "state=latest"
        )
    );

    assert.ok(
      requested[0]
        ?.includes(
          "limit=16%2C24"
        )
    );
  }
);

test(
  "rejects invalid Zcash address before fetch",
  async () => {
    let calls =
      0;

    const result =
      await getZcashBlockchairEvidence(
        {
          address:
            "not-zcash",

          analysisPlan:
            "free",
        },
        {
          baseUrl:
            "https://example.test",

          timeoutMs:
            2_000,

          fetchImpl:
            async () => {
              calls +=
                1;

              return json(
                {},
                500
              );
            },
        }
      );

    assert.equal(
      result.ok,
      false
    );

    if (!result.ok) {
      assert.equal(
        result.code,
        "INVALID_ADDRESS"
      );
    }

    assert.equal(
      calls,
      0
    );
  }
);

test(
  "maps Blockchair Zcash quota response to RATE_LIMITED",
  async () => {
    const result =
      await getZcashBlockchairEvidence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "free",
        },
        {
          baseUrl:
            "https://example.test",

          timeoutMs:
            2_000,

          fetchImpl:
            async () =>
              json(
                {},
                429
              ),
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
