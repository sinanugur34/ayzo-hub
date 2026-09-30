import assert from "node:assert/strict";
import test from "node:test";

import {
  getHyperliquidEvidence,
  type HyperliquidFetch,
} from "./provider";

const USER =
  "0x1111111111111111111111111111111111111111";

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
  "normalizes HyperCore and HyperEVM evidence",
  async () => {
    const fetchImpl:
      HyperliquidFetch =
      async (
        input,
        init
      ) => {
        if (
          input.includes(
            "/info"
          )
        ) {
          const body =
            JSON.parse(
              String(
                init?.body
              )
            ) as {
              type:
                string;
            };

          switch (
            body.type
          ) {
            case "clearinghouseState":
              return response({
                marginSummary: {
                  accountValue:
                    "100",

                  totalNtlPos:
                    "10",

                  totalMarginUsed:
                    "2",
                },

                withdrawable:
                  "90",

                assetPositions: [
                  {
                    position: {
                      coin:
                        "BTC",

                      szi:
                        "0.1",

                      entryPx:
                        "50000",

                      positionValue:
                        "5000",

                      unrealizedPnl:
                        "10",

                      liquidationPx:
                        "30000",

                      marginUsed:
                        "2",

                      returnOnEquity:
                        "0.1",

                      leverage: {
                        type:
                          "cross",

                        value:
                          5,
                      },

                      cumFunding: {
                        allTime:
                          "-1",

                        sinceOpen:
                          "-0.1",
                      },
                    },
                  },
                ],
              });

            case "spotClearinghouseState":
              return response({
                balances: [
                  {
                    coin:
                      "USDC",

                    token:
                      0,

                    total:
                      "50",

                    hold:
                      "0",

                    entryNtl:
                      "0",
                  },
                ],
              });

            case "userFills":
              return response([
                {
                  hash:
                    "0xabc",

                  tid:
                    1,

                  coin:
                    "BTC",

                  px:
                    "50000",

                  sz:
                    "0.1",

                  side:
                    "B",

                  dir:
                    "Open Long",

                  time:
                    1_700_000_000_000,

                  closedPnl:
                    "0",

                  fee:
                    "0.1",

                  feeToken:
                    "USDC",

                  crossed:
                    true,
                },
              ]);

            case "userFunding":
              return response([
                {
                  time:
                    1_700_000_000_000,

                  hash:
                    "0xdef",

                  delta: {
                    type:
                      "funding",

                    coin:
                      "BTC",

                    usdc:
                      "-0.01",

                    szi:
                      "0.1",

                    fundingRate:
                      "0.00001",
                  },
                },
              ]);

            case "portfolio":
              return response([
                [
                  "day",
                  {
                    accountValueHistory: [
                      [
                        1_700_000_000_000,
                        "100",
                      ],
                    ],

                    pnlHistory: [
                      [
                        1_700_000_000_000,
                        "1",
                      ],
                    ],

                    vlm:
                      "1000",
                  },
                ],
              ]);

            case "userRole":
              return response({
                role:
                  "user",
              });

            default:
              throw new Error(
                `Unexpected info type ${body.type}`
              );
          }
        }

        const body =
          JSON.parse(
            String(
              init?.body
            )
          ) as {
            method:
              string;
          };

        switch (
          body.method
        ) {
          case "eth_chainId":
            return response({
              jsonrpc:
                "2.0",

              id:
                1,

              result:
                "0x3e7",
            });

          case "eth_getBalance":
            return response({
              jsonrpc:
                "2.0",

              id:
                2,

              result:
                "0x10",
            });

          case "eth_getTransactionCount":
            return response({
              jsonrpc:
                "2.0",

              id:
                3,

              result:
                "0x2",
            });

          case "eth_getCode":
            return response({
              jsonrpc:
                "2.0",

              id:
                4,

              result:
                "0x",
            });

          default:
            throw new Error(
              `Unexpected RPC ${body.method}`
            );
        }
      };

    const result =
      await getHyperliquidEvidence(
        {
          address:
            USER,

          analysisPlan:
            "free",
        },
        {
          fetchImpl,

          infoUrl:
            "https://example.invalid/info",

          evmRpcUrl:
            "https://example.invalid/evm",

          timeoutMs:
            1000,

          now:
            () =>
              1_800_000_000_000,
        }
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        "Expected Hyperliquid evidence."
      );
    }

    assert.equal(
      result.data
        .hyperCore
        .positions
        .length,
      1
    );

    assert.equal(
      result.data
        .hyperCore
        .fills
        .length,
      1
    );

    assert.equal(
      result.data
        .hyperCore
        .fundingPayments
        .length,
      1
    );

    assert.equal(
      result.data
        .hyperEvm
        .chainId,
      999
    );

    assert.equal(
      result.data
        .hyperEvm
        .transactionCount,
      2
    );
  }
);

test(
  "fails closed on HyperEVM chain mismatch",
  async () => {
    const fetchImpl:
      HyperliquidFetch =
      async (
        input,
        init
      ) => {
        if (
          input.includes(
            "/info"
          )
        ) {
          const body =
            JSON.parse(
              String(
                init?.body
              )
            ) as {
              type:
                string;
            };

          switch (
            body.type
          ) {
            case "clearinghouseState":
              return response({
                marginSummary: {},
                assetPositions: [],
              });

            case "spotClearinghouseState":
              return response({
                balances: [],
              });

            case "userFills":
            case "userFunding":
            case "portfolio":
              return response([]);

            case "userRole":
              return response({
                role:
                  "missing",
              });

            default:
              return response({});
          }
        }

        const rpc =
          JSON.parse(
            String(
              init?.body
            )
          ) as {
            method:
              string;
          };

        return response({
          jsonrpc:
            "2.0",

          id:
            1,

          result:
            rpc.method ===
              "eth_chainId"
              ? "0x1"
              : "0x0",
        });
      };

    const result =
      await getHyperliquidEvidence(
        {
          address:
            USER,

          analysisPlan:
            "free",
        },
        {
          fetchImpl,

          infoUrl:
            "https://example.invalid/info",

          evmRpcUrl:
            "https://example.invalid/evm",

          timeoutMs:
            1000,

          now:
            () =>
              1_800_000_000_000,
        }
      );

    assert.equal(
      result.ok,
      false
    );

    if (result.ok) {
      assert.fail(
        "Expected chain mismatch."
      );
    }

    assert.equal(
      result.code,
      "CHAIN_ID_MISMATCH"
    );
  }
);

test(
  "rejects malformed address before provider access",
  async () => {
    let called =
      false;

    const result =
      await getHyperliquidEvidence(
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

              return response(
                {}
              );
            },

          infoUrl:
            "https://example.invalid/info",

          evmRpcUrl:
            "https://example.invalid/evm",

          timeoutMs:
            1000,

          now:
            Date.now,
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
