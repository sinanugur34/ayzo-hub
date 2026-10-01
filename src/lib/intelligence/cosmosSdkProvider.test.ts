import assert from "node:assert/strict";
import test from "node:test";

import {
  loadCosmosSdkEvidence,
} from "./cosmosSdk";

const ADDRESS =
  "cosmos1ayzoacceptance";

const OTHER =
  "cosmos1counterparty";

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
  "Cosmos SDK transaction history uses modern query page and limit parameters",
  async () => {
    const requested:
      URL[] = [];

    const result =
      await loadCosmosSdkEvidence(
        {
          network:
            "cosmos",

          address:
            ADDRESS,

          analysisPlan:
            "free",

          validator:
            value =>
              value ===
                ADDRESS
                ? value
                : null,

          providerId:
            "cosmos-test",

          baseUrls: [
            "https://example.test",
          ],
        },
        {
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
                url
              );

              if (
                url.pathname ===
                `/cosmos/auth/v1beta1/accounts/${ADDRESS}`
              ) {
                return json({
                  account: {
                    account_number:
                      "7",

                    sequence:
                      "9",
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
                        "uatom",

                      amount:
                        "123456",
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

              if (
                url.pathname ===
                "/cosmos/tx/v1beta1/txs"
              ) {
                assert.equal(
                  url.searchParams.has(
                    "events"
                  ),
                  false
                );

                assert.equal(
                  url.searchParams.has(
                    "pagination.limit"
                  ),
                  false
                );

                assert.equal(
                  url.searchParams.get(
                    "page"
                  ),
                  "1"
                );

                assert.equal(
                  url.searchParams.get(
                    "limit"
                  ),
                  "10"
                );

                assert.equal(
                  url.searchParams.get(
                    "order_by"
                  ),
                  "ORDER_BY_DESC"
                );

                const query =
                  url.searchParams.get(
                    "query"
                  );

                if (
                  query ===
                    `message.sender='${ADDRESS}'`
                ) {
                  return json({
                    txs: [
                      {
                        body: {
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
                                    "uatom",

                                  amount:
                                    "100",
                                },
                              ],
                            },
                          ],
                        },
                      },
                    ],

                    tx_responses: [
                      {
                        txhash:
                          "A".repeat(
                            64
                          ),

                        height:
                          "100",

                        timestamp:
                          "2026-10-01T00:00:00Z",

                        code:
                          0,
                      },
                    ],

                    total:
                      "1",
                  });
                }

                if (
                  query ===
                    `transfer.recipient='${ADDRESS}'`
                ) {
                  return json({
                    txs: [
                      {
                        body: {
                          messages: [
                            {
                              "@type":
                                "/cosmos.bank.v1beta1.MsgSend",

                              from_address:
                                OTHER,

                              to_address:
                                ADDRESS,

                              amount: [
                                {
                                  denom:
                                    "uatom",

                                  amount:
                                    "200",
                                },
                              ],
                            },
                          ],
                        },
                      },
                    ],

                    tx_responses: [
                      {
                        txhash:
                          "B".repeat(
                            64
                          ),

                        height:
                          "101",

                        timestamp:
                          "2026-10-01T00:01:00Z",

                        code:
                          0,
                      },
                    ],

                    total:
                      "1",
                  });
                }

                return json(
                  {
                    error:
                      "unexpected query",
                  },
                  400
                );
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
        .transactions
        .length,
      2
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

    const historyUrls =
      requested.filter(
        url =>
          url.pathname ===
          "/cosmos/tx/v1beta1/txs"
      );

    assert.equal(
      historyUrls.length,
      2
    );

    assert.deepEqual(
      historyUrls.map(
        url =>
          url.searchParams
            .get(
              "query"
            )
      ),
      [
        `message.sender='${ADDRESS}'`,
        `transfer.recipient='${ADDRESS}'`,
      ]
    );
  }
);
