import assert from "node:assert/strict";
import test from "node:test";

import {
  getSuiAccountEvidence,
  type SuiFetch,
} from "./provider";

const ADDRESS =
  `0x${"11".repeat(32)}`;

const OTHER =
  `0x${"22".repeat(32)}`;

function response(
  body: unknown,
  status = 200
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
  "normalizes Sui GraphQL account evidence",
  async () => {
    const fetchImpl:
      SuiFetch =
      async () =>
        response({
          data: {
            chainIdentifier:
              "mainnet-test",

            subject: {
              address:
                ADDRESS,

              balance: {
                totalBalance:
                  "2000000000",

                coinBalance:
                  "2000000000",

                addressBalance:
                  "0",
              },

              balances: {
                nodes: [
                  {
                    coinType: {
                      repr:
                        "0x2::sui::SUI",
                    },

                    totalBalance:
                      "2000000000",

                    coinBalance:
                      "2000000000",

                    addressBalance:
                      "0",

                    coinMetadata: {
                      name:
                        "Sui",

                      symbol:
                        "SUI",

                      decimals:
                        9,
                    },
                  },
                ],

                pageInfo: {
                  hasNextPage:
                    false,
                },
              },

              objects: {
                nodes: [
                  {
                    address:
                      `0x${"33".repeat(32)}`,

                    version:
                      7,

                    digest:
                      "object-digest",

                    hasPublicTransfer:
                      true,

                    contents: {
                      type: {
                        repr:
                          "0x2::coin::Coin<0x2::sui::SUI>",
                      },
                    },
                  },
                ],

                pageInfo: {
                  hasNextPage:
                    false,
                },
              },

              recentTransactions: {
                nodes: [
                  {
                    digest:
                      "tx-digest",

                    sender: {
                      address:
                        OTHER,
                    },

                    effects: {
                      status:
                        "SUCCESS",

                      timestamp:
                        "2026-09-30T00:00:00Z",

                      balanceChanges: {
                        nodes: [
                          {
                            amount:
                              "1000000000",

                            coinType: {
                              repr:
                                "0x2::sui::SUI",
                            },

                            owner: {
                              address:
                                ADDRESS,
                            },
                          },

                          {
                            amount:
                              "-1000000000",

                            coinType: {
                              repr:
                                "0x2::sui::SUI",
                            },

                            owner: {
                              address:
                                OTHER,
                            },
                          },
                        ],
                      },

                      objectChanges: {
                        nodes: [
                          {
                            address:
                              `0x${"44".repeat(32)}`,

                            idCreated:
                              true,

                            idDeleted:
                              false,
                          },
                        ],
                      },
                    },
                  },
                ],

                pageInfo: {
                  hasPreviousPage:
                    true,
                },
              },

              earliestTransactions: {
                nodes: [],

                pageInfo: {
                  hasNextPage:
                    false,
                },
              },
            },

            subjectObject:
              null,
          },
        });

    const result =
      await getSuiAccountEvidence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "free",
        },
        {
          fetchImpl,

          graphqlUrl:
            "https://example.invalid/graphql",

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
        "Expected Sui evidence."
      );
    }

    assert.equal(
      result.data.suiBalanceMist,
      "2000000000"
    );

    assert.equal(
      result.data
        .transactions
        .length,
      1
    );

    assert.equal(
      result.data
        .balances[0]
        ?.symbol,
      "SUI"
    );

    assert.equal(
      result.data
        .ownedObjects[0]
        ?.version,
      7
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
  "maps Sui GraphQL rate limiting",
  async () => {
    const fetchImpl:
      SuiFetch =
      async () =>
        response(
          {},
          429
        );

    const result =
      await getSuiAccountEvidence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "free",
        },
        {
          fetchImpl,

          graphqlUrl:
            "https://example.invalid/graphql",

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

test(
  "rejects invalid Sui address before provider access",
  async () => {
    let called =
      false;

    const fetchImpl:
      SuiFetch =
      async () => {
        called =
          true;

        return response(
          {}
        );
      };

    const result =
      await getSuiAccountEvidence(
        {
          address:
            "invalid",

          analysisPlan:
            "advanced",
        },
        {
          fetchImpl,

          graphqlUrl:
            "https://example.invalid/graphql",

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
