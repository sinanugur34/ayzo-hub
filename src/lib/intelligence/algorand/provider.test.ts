import assert from "node:assert/strict";
import test from "node:test";

import {
  getAlgorandNodelyEvidence,
  type AlgorandProviderDependencies,
} from "./provider";

const ROOT =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

const OTHER =
  "A7NMWS3NT3IUDMLVO26ULGXGIIOUQ3ND2TXSER6EBGRZNOBOUIQXHIBGDE";

function response(
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
  "normalizes paginated Nodely account, ASA, app, rekey and inner transaction evidence",
  async () => {
    const requested:
      string[] = [];

    const deps:
      AlgorandProviderDependencies = {
        baseUrls: [
          "https://example.test",
        ],

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
                `/v2/accounts/${ROOT}` &&
              !url.pathname.endsWith(
                "/transactions"
              )
            ) {
              return response({
                account: {
                  address:
                    ROOT,

                  amount:
                    1000000,

                  "min-balance":
                    100000,

                  "auth-addr":
                    OTHER,

                  "total-assets-opted-in":
                    1,

                  "total-apps-opted-in":
                    1,
                },
              });
            }

            if (
              url.pathname ===
              `/v2/accounts/${ROOT}/transactions`
            ) {
              if (
                url.searchParams
                  .get("next") ===
                "page2"
              ) {
                return response({
                  transactions: [
                    {
                      id:
                        "TX2",

                      sender:
                        ROOT,

                      "confirmed-round":
                        11,

                      "round-time":
                        101,

                      "tx-type":
                        "axfer",

                      "rekey-to":
                        OTHER,

                      "asset-transfer-transaction": {
                        "asset-id":
                          123,

                        receiver:
                          OTHER,

                        amount:
                          7,
                      },
                    },
                  ],
                });
              }

              return response({
                transactions: [
                  {
                    id:
                      "TX1",

                    sender:
                      OTHER,

                    "confirmed-round":
                      10,

                    "round-time":
                      100,

                    "tx-type":
                      "pay",

                    "payment-transaction": {
                      receiver:
                        ROOT,

                      amount:
                        5000,
                    },

                    "inner-txns": [
                      {
                        sender:
                          ROOT,

                        "confirmed-round":
                          10,

                        "round-time":
                          100,

                        "tx-type":
                          "pay",

                        "payment-transaction": {
                          receiver:
                            OTHER,

                          amount:
                            100,
                        },
                      },
                    ],
                  },
                ],

                "next-token":
                  "page2",
              });
            }

            if (
              url.pathname ===
              `/v2/accounts/${ROOT}/assets`
            ) {
              return response({
                assets: [
                  {
                    "asset-id":
                      123,

                    amount:
                      99,

                    "is-frozen":
                      false,
                  },
                ],
              });
            }

            if (
              url.pathname ===
              `/v2/accounts/${ROOT}/created-assets`
            ) {
              return response({
                assets: [
                  {
                    index:
                      123,

                    params: {
                      creator:
                        ROOT,

                      total:
                        1000,

                      decimals:
                        2,

                      name:
                        "AYZO TEST",

                      "unit-name":
                        "AYZT",

                      manager:
                        ROOT,

                      reserve:
                        OTHER,

                      freeze:
                        ROOT,

                      clawback:
                        OTHER,
                    },
                  },
                ],
              });
            }

            if (
              url.pathname ===
              `/v2/accounts/${ROOT}/apps-local-state`
            ) {
              return response({
                "apps-local-states": [
                  {
                    id:
                      77,
                  },
                ],
              });
            }

            if (
              url.pathname ===
              `/v2/accounts/${ROOT}/created-applications`
            ) {
              return response({
                applications: [
                  {
                    id:
                      88,

                    params: {
                      creator:
                        ROOT,
                    },
                  },
                ],
              });
            }

            return response(
              {
                error:
                  "unexpected path",
              },
              404
            );
          },
      };

    const result =
      await getAlgorandNodelyEvidence(
        {
          address:
            ROOT,

          analysisPlan:
            "free",
        },
        deps
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.data
        .amountMicroAlgos,
      "1000000"
    );

    assert.equal(
      result.data
        .authAddress,
      OTHER
    );

    assert.equal(
      result.data
        .transactions
        .length,
      2
    );

    assert.equal(
      result.data
        .transactions[0]
        ?.innerTransactions
        .length,
      1
    );

    assert.equal(
      result.data
        .transactions[1]
        ?.rekeyTo,
      OTHER
    );

    assert.equal(
      result.data
        .assets[0]
        ?.assetId,
      123
    );

    assert.equal(
      result.data
        .createdAssets[0]
        ?.clawback,
      OTHER
    );

    assert.equal(
      result.data
        .appLocalStates[0]
        ?.applicationId,
      77
    );

    assert.equal(
      result.data
        .createdApplications[0]
        ?.applicationId,
      88
    );

    assert.ok(
      requested.some(
        url =>
          url.includes(
            "next=page2"
          )
      )
    );
  }
);

test(
  "rejects invalid Algorand address before provider access",
  async () => {
    let calls =
      0;

    const result =
      await getAlgorandNodelyEvidence(
        {
          address:
            "not-algorand",

          analysisPlan:
            "free",
        },
        {
          baseUrls: [
            "https://example.test",
          ],

          timeoutMs:
            2_000,

          fetchImpl:
            async () => {
              calls +=
                1;

              return response(
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
  "uses Nodely transport fallback after primary upstream failure",
  async () => {
    const bases:
      string[] = [];

    const result =
      await getAlgorandNodelyEvidence(
        {
          address:
            ROOT,

          analysisPlan:
            "free",
        },
        {
          baseUrls: [
            "https://primary.test",
            "https://backup.test",
          ],

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

              bases.push(
                url.origin
              );

              if (
                url.origin ===
                "https://primary.test"
              ) {
                return response(
                  {},
                  502
                );
              }

              if (
                url.pathname ===
                `/v2/accounts/${ROOT}`
              ) {
                return response({
                  account: {
                    address:
                      ROOT,

                    amount:
                      1,
                  },
                });
              }

              if (
                url.pathname.endsWith(
                  "/transactions"
                )
              ) {
                return response({
                  transactions:
                    [],
                });
              }

              if (
                url.pathname.endsWith(
                  "/assets"
                )
              ) {
                return response({
                  assets:
                    [],
                });
              }

              if (
                url.pathname.endsWith(
                  "/created-assets"
                )
              ) {
                return response({
                  assets:
                    [],
                });
              }

              if (
                url.pathname.endsWith(
                  "/apps-local-state"
                )
              ) {
                return response({
                  "apps-local-states":
                    [],
                });
              }

              if (
                url.pathname.endsWith(
                  "/created-applications"
                )
              ) {
                return response({
                  applications:
                    [],
                });
              }

              return response(
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

    assert.equal(
      result.data
        .coverage
        .transportFailoverUsed,
      true
    );

    assert.ok(
      bases.includes(
        "https://primary.test"
      )
    );

    assert.ok(
      bases.includes(
        "https://backup.test"
      )
    );
  }
);
