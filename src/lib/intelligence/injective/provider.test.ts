import assert from "node:assert/strict";
import test from "node:test";

import {
  getInjectiveIndexedHistory,
  type InjectiveIndexedHistoryResult,
} from "./indexer";

import {
  getInjectiveEvidence,
} from "./provider";

const ADDRESS =
  "inj14sph79aemnd0jsmgx0kpfl2tsutjfjaxwjf5x4";

const OTHER =
  "inj17vytdwqczqz72j65saukplrktd4gyfme5agf6c";

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

function indexedPayload() {
  return {
    paging: {
      total:
        3,
    },

    data: [
      {
        id:
          "1",

        block_number:
          185405997,

        block_timestamp:
          "2026-10-01T10:00:00Z",

        block_unix_timestamp:
          1790848800000,

        hash:
          "A".repeat(
            64
          ),

        code:
          0,

        messages: [
          {
            "@type":
              "/cosmos.bank.v1beta1.MsgSend",

            from_address:
              ADDRESS,

            to_address:
              OTHER,

            amount: [
              {
                denom:
                  "inj",

                amount:
                  "123",
              },
            ],
          },
        ],
      },
    ],
  };
}

test(
  "Injective indexed history normalizes official Explorer transaction evidence",
  async () => {
    const result =
      await getInjectiveIndexedHistory(
        {
          address:
            ADDRESS,

          analysisPlan:
            "free",
        },
        {
          providers: [
            {
              id:
                "official",

              baseUrl:
                "https://official.test",

              apiKey:
                null,
            },
          ],

          fetchImpl:
            async (
              input,
              init
            ) => {
              const url =
                new URL(
                  input
                );

              assert.equal(
                url.pathname,
                `/api/explorer/v1/accountTxs/${ADDRESS}`
              );

              assert.equal(
                url.searchParams.get(
                  "limit"
                ),
                "20"
              );

              assert.equal(
                url.searchParams.get(
                  "skip"
                ),
                "0"
              );

              assert.equal(
                new Headers(
                  init?.headers
                ).has(
                  "api-key"
                ),
                false
              );

              return json(
                indexedPayload()
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
      result.providerId,
      "official"
    );

    assert.equal(
      result.data
        .transactions
        .length,
      1
    );

    const tx =
      result.data
        .transactions[0];

    assert.ok(tx);

    assert.equal(
      tx.height,
      185405997
    );

    assert.equal(
      tx.messages.length,
      1
    );

    assert.equal(
      tx.messages[0]
        ?.sender,
      ADDRESS
    );

    assert.equal(
      tx.messages[0]
        ?.recipient,
      OTHER
    );

    assert.deepEqual(
      tx.messages[0]
        ?.coins,
      [
        {
          denom:
            "inj",

          amount:
            "123",
        },
      ]
    );

    assert.equal(
      result.data
        .coverage
        .historyHasMore,
      true
    );
  }
);

test(
  "Injective indexed history uses independent NOWNodes fallback after official upstream failure",
  async () => {
    const calls:
      {
        host:
          string;

        apiKey:
          string | null;
      }[] = [];

    const result =
      await getInjectiveIndexedHistory(
        {
          address:
            ADDRESS,

          analysisPlan:
            "free",
        },
        {
          providers: [
            {
              id:
                "official",

              baseUrl:
                "https://official.test",

              apiKey:
                null,
            },

            {
              id:
                "nownodes",

              baseUrl:
                "https://nownodes.test",

              apiKey:
                "test-only-key",
            },
          ],

          fetchImpl:
            async (
              input,
              init
            ) => {
              const url =
                new URL(
                  input
                );

              const apiKey =
                new Headers(
                  init?.headers
                ).get(
                  "api-key"
                );

              calls.push({
                host:
                  url.host,

                apiKey,
              });

              if (
                url.host ===
                  "official.test"
              ) {
                return json(
                  {
                    error:
                      "upstream",
                  },
                  503
                );
              }

              return json(
                indexedPayload()
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
      result.providerId,
      "nownodes"
    );

    assert.equal(
      result.data
        .coverage
        .providerRequestsUsed,
      2
    );

    assert.equal(
      result.data
        .coverage
        .transportFailoverUsed,
      true
    );

    assert.deepEqual(
      calls,
      [
        {
          host:
            "official.test",

          apiKey:
            null,
        },

        {
          host:
            "nownodes.test",

          apiKey:
            "test-only-key",
        },
      ]
    );
  }
);

test(
  "Injective provider keeps Chain REST state separate from indexed transaction history",
  async () => {
    const chainPaths:
      string[] = [];

    const indexedResult:
      InjectiveIndexedHistoryResult =
        {
          ok:
            true,

          providerId:
            "official-indexer",

          latencyMs:
            5,

          data: {
            transactions: [
              {
                hash:
                  "B".repeat(
                    64
                  ),

                height:
                  10,

                timestamp:
                  "2026-10-01T00:00:00Z",

                code:
                  0,

                messages:
                  [],
              },
            ],

            coverage: {
              transactionLimit:
                20,

              providerRequestsUsed:
                1,

              transportFailoverUsed:
                false,

              historyHasMore:
                false,

              total:
                1,
            },
          },
        };

    const result =
      await getInjectiveEvidence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "free",
        },
        {
          baseUrls: [
            "https://chain.test",
          ],

          fetchImpl:
            async input => {
              const url =
                new URL(
                  input
                );

              chainPaths.push(
                url.pathname
              );

              if (
                url.pathname ===
                  `/cosmos/auth/v1beta1/accounts/${ADDRESS}`
              ) {
                return json({
                  account: {
                    account_number:
                      "1",

                    sequence:
                      "2",
                  },
                });
              }

              if (
                url.pathname ===
                  `/cosmos/bank/v1beta1/balances/${ADDRESS}`
              ) {
                return json({
                  balances: [
                    {
                      denom:
                        "inj",

                      amount:
                        "42",
                    },
                  ],
                });
              }

              if (
                url.pathname ===
                  `/cosmos/staking/v1beta1/delegations/${ADDRESS}`
              ) {
                return json({
                  delegation_responses:
                    [],
                });
              }

              if (
                url.pathname ===
                  `/cosmos/distribution/v1beta1/delegators/${ADDRESS}/rewards`
              ) {
                return json({
                  total:
                    [],
                });
              }

              throw new Error(
                `Unexpected Chain REST path: ${url.pathname}`
              );
            },

          loadIndexedHistory:
            async () =>
              indexedResult,
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
      chainPaths.some(
        path =>
          path ===
          "/cosmos/tx/v1beta1/txs"
      ),
      false
    );

    assert.equal(
      chainPaths.length,
      4
    );

    assert.equal(
      result.data
        .transactions
        .length,
      1
    );

    assert.equal(
      result.data
        .coverage
        .providerRequestsUsed,
      5
    );

    assert.equal(
      result.data
        .coverage
        .unavailableEvidence
        .includes(
          "transaction_history"
        ),
      false
    );
  }
);

test(
  "Injective provider degrades truthfully when indexed history is unavailable",
  async () => {
    const result =
      await getInjectiveEvidence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "free",
        },
        {
          baseUrls: [
            "https://chain.test",
          ],

          fetchImpl:
            async input => {
              const url =
                new URL(
                  input
                );

              if (
                url.pathname.startsWith(
                  "/cosmos/auth/"
                )
              ) {
                return json({
                  account: {
                    account_number:
                      "1",

                    sequence:
                      "2",
                  },
                });
              }

              if (
                url.pathname.startsWith(
                  "/cosmos/bank/"
                )
              ) {
                return json({
                  balances:
                    [],
                });
              }

              if (
                url.pathname.startsWith(
                  "/cosmos/staking/"
                )
              ) {
                return json({
                  delegation_responses:
                    [],
                });
              }

              if (
                url.pathname.startsWith(
                  "/cosmos/distribution/"
                )
              ) {
                return json({
                  total:
                    [],
                });
              }

              return json(
                {},
                404
              );
            },

          loadIndexedHistory:
            async () => ({
              ok:
                false,

              providerId:
                "official-indexer",

              latencyMs:
                5,

              providerRequestsUsed:
                1,

              code:
                "UPSTREAM_ERROR",

              error:
                "Indexer unavailable.",
            }),
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
        .transactions
        .length,
      0
    );

    assert.equal(
      result.data
        .coverage
        .coverage,
      "partial"
    );

    assert.equal(
      result.data
        .coverage
        .unavailableEvidence
        .includes(
          "transaction_history"
        ),
      true
    );
  }
);
