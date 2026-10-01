import assert from "node:assert/strict";
import test from "node:test";

import {
  getCosmosHubEvidence,
} from "./provider";

const ADDRESS =
  "cosmos1phj5gw8nr9gcap9qx8ynxg6s7tdtw59walnuha";

const OTHER =
  "cosmos1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqnrql8a";

function txPayload(
  hashes:
    readonly string[],
  {
    incoming,
  }: {
    incoming:
      boolean;
  }
) {
  return {
    txs:
      hashes.map(
        () => ({
          body: {
            messages: [
              {
                "@type":
                  "/cosmos.bank.v1beta1.MsgSend",

                from_address:
                  incoming
                    ? OTHER
                    : ADDRESS,

                to_address:
                  incoming
                    ? ADDRESS
                    : OTHER,

                amount: [
                  {
                    denom:
                      "uatom",

                    amount:
                      "1",
                  },
                ],
              },
            ],
          },
        })
      ),

    tx_responses:
      hashes.map(
        (
          hash,
          index
        ) => ({
          txhash:
            hash,

          height:
            String(
              100 -
              index
            ),

          timestamp:
            `2026-10-01T00:00:0${index}Z`,

          code:
            0,
        })
      ),
  };
}

function json(
  body:
    unknown
) {
  return new Response(
    JSON.stringify(
      body
    ),
    {
      status:
        200,

      headers: {
        "Content-Type":
          "application/json",
      },
    }
  );
}

test(
  "Cosmos unions repeated transaction snapshots by immutable hash",
  async () => {
    let senderRead =
      0;

    let recipientRead =
      0;

    const result =
      await getCosmosHubEvidence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "free",
        },
        {
          baseUrls: [
            "https://cosmos.test",
          ],

          fetchImpl:
            async input => {
              const url =
                new URL(
                  input
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
                  balances:
                    [],
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

              if (
                url.pathname ===
                "/cosmos/tx/v1beta1/txs"
              ) {
                const query =
                  url.searchParams.get(
                    "query"
                  ) ??
                  "";

                if (
                  query.includes(
                    "message.sender"
                  )
                ) {
                  senderRead +=
                    1;

                  if (
                    senderRead ===
                    1
                  ) {
                    return json(
                      txPayload(
                        [
                          "A".repeat(
                            64
                          ),
                        ],
                        {
                          incoming:
                            false,
                        }
                      )
                    );
                  }

                  if (
                    senderRead ===
                    2
                  ) {
                    return json(
                      txPayload(
                        [
                          "A".repeat(
                            64
                          ),

                          "B".repeat(
                            64
                          ),
                        ],
                        {
                          incoming:
                            false,
                        }
                      )
                    );
                  }

                  return json(
                    txPayload(
                      [
                        "B".repeat(
                          64
                        ),
                      ],
                      {
                        incoming:
                          false,
                      }
                    )
                  );
                }

                if (
                  query.includes(
                    "transfer.recipient"
                  )
                ) {
                  recipientRead +=
                    1;

                  if (
                    recipientRead ===
                    1
                  ) {
                    return json(
                      txPayload(
                        [
                          "C".repeat(
                            64
                          ),
                        ],
                        {
                          incoming:
                            true,
                        }
                      )
                    );
                  }

                  if (
                    recipientRead ===
                    2
                  ) {
                    return json(
                      txPayload(
                        [
                          "C".repeat(
                            64
                          ),

                          "D".repeat(
                            64
                          ),
                        ],
                        {
                          incoming:
                            true,
                        }
                      )
                    );
                  }

                  return json(
                    txPayload(
                      [
                        "D".repeat(
                          64
                        ),
                      ],
                      {
                        incoming:
                          true,
                      }
                    )
                  );
                }
              }

              throw new Error(
                `Unexpected Cosmos path: ${url.pathname}${url.search}`
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
      senderRead,
      3
    );

    assert.equal(
      recipientRead,
      3
    );

    assert.equal(
      result.data
        .coverage
        .providerRequestsUsed,
      10
    );

    assert.equal(
      result.data
        .coverage
        .providerRequestBudget,
      10
    );

    assert.deepEqual(
      new Set(
        result.data
          .transactions
          .map(
            tx =>
              tx.hash
          )
      ),
      new Set([
        "A".repeat(
          64
        ),

        "B".repeat(
          64
        ),

        "C".repeat(
          64
        ),

        "D".repeat(
          64
        ),
      ])
    );

    assert.equal(
      result.data
        .transactions
        .length,
      4
    );

    assert.deepEqual(
      result.data
        .coverage
        .unavailableEvidence,
      []
    );
  }
);


test(
  "Cosmos plan depth is nested on a stable indexed snapshot",
  async () => {
    function stablePayload(
      limit:
        number,
      {
        incoming,
      }: {
        incoming:
          boolean;
      }
    ) {
      const prefix =
        incoming
          ? "B"
          : "A";

      const hashes =
        Array.from(
          {
            length:
              limit,
          },
          (
            _,
            index
          ) =>
            `${prefix}${index
              .toString(16)
              .toUpperCase()
              .padStart(63, "0")}`
        );

      return {
        txs:
          hashes.map(
            () => ({
              body: {
                messages: [
                  {
                    "@type":
                      "/cosmos.bank.v1beta1.MsgSend",

                    from_address:
                      incoming
                        ? OTHER
                        : ADDRESS,

                    to_address:
                      incoming
                        ? ADDRESS
                        : OTHER,

                    amount: [
                      {
                        denom:
                          "uatom",

                        amount:
                          "1",
                      },
                    ],
                  },
                ],
              },
            })
          ),

        tx_responses:
          hashes.map(
            (
              hash,
              index
            ) => ({
              txhash:
                hash,

              height:
                String(
                  10_000 -
                  index
                ),

              timestamp:
                new Date(
                  Date.UTC(
                    2026,
                    9,
                    1,
                    0,
                    index,
                    0
                  )
                ).toISOString(),

              code:
                0,
            })
          ),
      };
    }

    async function load(
      analysisPlan:
        "free" |
        "pro" |
        "advanced"
    ) {
      return getCosmosHubEvidence(
        {
          address:
            ADDRESS,

          analysisPlan,
        },
        {
          baseUrls: [
            "https://cosmos.test",
          ],

          fetchImpl:
            async input => {
              const url =
                new URL(
                  input
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
                  balances:
                    [],
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

              if (
                url.pathname ===
                "/cosmos/tx/v1beta1/txs"
              ) {
                const query =
                  url.searchParams.get(
                    "query"
                  ) ??
                  "";

                const limit =
                  Number(
                    url.searchParams.get(
                      "limit"
                    ) ??
                    "0"
                  );

                assert.equal(
                  Number.isSafeInteger(
                    limit
                  ),
                  true
                );

                assert.equal(
                  limit >
                    0,
                  true
                );

                return json(
                  stablePayload(
                    limit,
                    {
                      incoming:
                        query.includes(
                          "transfer.recipient"
                        ),
                    }
                  )
                );
              }

              throw new Error(
                `Unexpected Cosmos path: ${url.pathname}${url.search}`
              );
            },
        }
      );
    }

    const free =
      await load(
        "free"
      );

    const pro =
      await load(
        "pro"
      );

    const advanced =
      await load(
        "advanced"
      );

    assert.equal(
      free.ok,
      true
    );

    assert.equal(
      pro.ok,
      true
    );

    assert.equal(
      advanced.ok,
      true
    );

    if (
      !free.ok ||
      !pro.ok ||
      !advanced.ok
    ) {
      return;
    }

    assert.equal(
      free.data
        .transactions
        .length,
      20
    );

    assert.equal(
      pro.data
        .transactions
        .length,
      64
    );

    assert.equal(
      advanced.data
        .transactions
        .length,
      180
    );

    const freeHashes =
      new Set(
        free.data
          .transactions
          .map(
            tx =>
              tx.hash
          )
      );

    const proHashes =
      new Set(
        pro.data
          .transactions
          .map(
            tx =>
              tx.hash
          )
      );

    const advancedHashes =
      new Set(
        advanced.data
          .transactions
          .map(
            tx =>
              tx.hash
          )
      );

    for (
      const hash of
      freeHashes
    ) {
      assert.equal(
        proHashes.has(
          hash
        ),
        true
      );
    }

    for (
      const hash of
      proHashes
    ) {
      assert.equal(
        advancedHashes.has(
          hash
        ),
        true
      );
    }

    assert.equal(
      free.data
        .coverage
        .transactionLimit,
      20
    );

    assert.equal(
      pro.data
        .coverage
        .transactionLimit,
      64
    );

    assert.equal(
      advanced.data
        .coverage
        .transactionLimit,
      180
    );

    assert.equal(
      free.data
        .coverage
        .unavailableEvidence
        .length,
      0
    );

    assert.equal(
      pro.data
        .coverage
        .unavailableEvidence
        .length,
      0
    );

    assert.equal(
      advanced.data
        .coverage
        .unavailableEvidence
        .length,
      0
    );
  }
);
