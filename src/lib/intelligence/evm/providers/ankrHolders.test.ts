import assert from "node:assert/strict";
import test from "node:test";

import {
  ankrHoldersProvider,
} from "./ankrHolders";

const BNB = {
  networkId:
    "bnb" as const,

  name:
    "BNB Chain",

  chainId:
    56,

  nativeCurrency:
    "BNB",
};

const SONIC = {
  networkId:
    "sonic" as const,

  name:
    "Sonic",

  chainId:
    146,

  nativeCurrency:
    "S",
};

const TOKEN =
  "0x1111111111111111111111111111111111111111";

test(
  "Ankr holder provider normalizes raw evidence",
  async () => {
    const oldKey =
      process.env
        .ANKR_API_KEY;

    const oldFetch =
      globalThis.fetch;

    process.env
      .ANKR_API_KEY =
      "test-ankr-key";

    const urls:
      string[] = [];

    globalThis.fetch =
      (async input => {
        const url =
          String(input);

        urls.push(url);

        if (
          url.includes(
            "/bsc/"
          )
        ) {
          return new Response(
            JSON.stringify({
              jsonrpc:
                "2.0",
              id:
                1,
              result:
                "0x64",
            }),
            {
              status: 200,
            }
          );
        }

        return new Response(
          JSON.stringify({
            jsonrpc:
              "2.0",

            id:
              1,

            result: {
              holdersCount:
                5000,

              nextPageToken:
                "page/2+opaque==",

              holders: [
                {
                  holderAddress:
                    "0x2222222222222222222222222222222222222222",
                  balanceRawInteger:
                    "40",
                },

                {
                  holderAddress:
                    "0x3333333333333333333333333333333333333333",
                  balanceRawInteger:
                    "60",
                },
              ],
            },
          }),
          {
            status: 200,
          }
        );
      }) as typeof fetch;

    try {
      const result =
        await ankrHoldersProvider
          .getTokenHolders({
            network:
              BNB,

            address:
              TOKEN,

            limit:
              100,

            cursor:
              null,
          });

      assert.equal(
        result.ok,
        true
      );

      if (!result.ok) {
        return;
      }

      assert.equal(
        result.providerId,
        "ankr"
      );

      assert.equal(
        result.data
          .totalSupply,
        "100"
      );

      assert.equal(
        result.data
          .totalCount,
        5000
      );

      assert.equal(
        result.data
          .holders[0]
          ?.balance,
        "60"
      );

      assert.equal(
        result.data
          .holders[0]
          ?.percentage,
        60
      );

      assert.equal(
        result.data
          .holders[1]
          ?.percentage,
        40
      );

      assert.equal(
        result.data
          .nextCursor,
        "ankr:page%2F2%2Bopaque%3D%3D"
      );

      assert.equal(
        urls.length,
        2
      );
    } finally {
      globalThis.fetch =
        oldFetch;

      if (
        oldKey === undefined
      ) {
        delete process.env
          .ANKR_API_KEY;
      } else {
        process.env
          .ANKR_API_KEY =
          oldKey;
      }
    }
  }
);

test(
  "Ankr rejects unsupported Sonic without HTTP",
  async () => {
    const oldFetch =
      globalThis.fetch;

    let calls = 0;

    globalThis.fetch =
      (async () => {
        calls += 1;

        throw new Error(
          "unexpected fetch"
        );
      }) as typeof fetch;

    try {
      const result =
        await ankrHoldersProvider
          .getTokenHolders({
            network:
              SONIC,

            address:
              TOKEN,

            limit:
              100,

            cursor:
              null,
          });

      assert.equal(
        result.ok,
        false
      );

      if (result.ok) {
        return;
      }

      assert.equal(
        result.code,
        "UNSUPPORTED_NETWORK"
      );

      assert.equal(
        calls,
        0
      );
    } finally {
      globalThis.fetch =
        oldFetch;
    }
  }
);

test(
  "Linea uses Alchemy totalSupply and Ankr holders",
  async () => {
    const priorAnkr = process.env.ANKR_API_KEY;
    const priorAlchemy = process.env.ALCHEMY_API_KEY;
    const priorFetch = globalThis.fetch;

    process.env.ANKR_API_KEY = "test-ankr-key";
    process.env.ALCHEMY_API_KEY = "test-alchemy-key";

    const requests: string[] = [];

    globalThis.fetch = (async input => {
      const url = String(input);

      requests.push(url);

      if (
        url.includes(
          "linea-mainnet.g.alchemy.com"
        )
      ) {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: "0x64",
          }),
          { status: 200 }
        );
      }

      if (
        url.includes(
          "rpc.ankr.com/multichain/"
        )
      ) {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: {
              holdersCount: 500,
              nextPageToken: "next-page",
              holders: [
                {
                  holderAddress:
                    "0x2222222222222222222222222222222222222222",
                  balanceRawInteger: "60",
                },
                {
                  holderAddress:
                    "0x3333333333333333333333333333333333333333",
                  balanceRawInteger: "40",
                },
              ],
            },
          }),
          { status: 200 }
        );
      }

      throw new Error(
        "Unexpected provider endpoint"
      );
    }) as typeof fetch;

    try {
      const result =
        await ankrHoldersProvider.getTokenHolders({
          network: {
            networkId: "linea",
            name: "Linea",
            chainId: 59144,
            nativeCurrency: "ETH",
          },
          address:
            "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
          limit: 100,
          cursor: null,
        });

      assert.equal(result.ok, true);

      if (!result.ok) {
        return;
      }

      assert.equal(result.providerId, "ankr");
      assert.equal(result.data.totalSupply, "100");
      assert.equal(
        result.data.holders[0]?.percentage,
        60
      );

      assert.equal(requests.length, 2);

      assert.equal(
        requests.some(url =>
          url.includes(
            "linea-mainnet.g.alchemy.com"
          )
        ),
        true
      );

      assert.equal(
        requests.some(url =>
          url.includes(
            "rpc.ankr.com/linea/"
          )
        ),
        false
      );
    } finally {
      globalThis.fetch = priorFetch;

      if (priorAnkr === undefined) {
        delete process.env.ANKR_API_KEY;
      } else {
        process.env.ANKR_API_KEY = priorAnkr;
      }

      if (priorAlchemy === undefined) {
        delete process.env.ALCHEMY_API_KEY;
      } else {
        process.env.ALCHEMY_API_KEY = priorAlchemy;
      }
    }
  }
);

test(
  "Ankr retries a temporary HTTP 429",
  async () => {
    const priorKey = process.env.ANKR_API_KEY;
    const priorFetch = globalThis.fetch;

    process.env.ANKR_API_KEY = "test-ankr-key";

    let advancedCalls = 0;

    globalThis.fetch = (async input => {
      const url = String(input);

      if (url.includes("/bsc/")) {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: "0x64",
          }),
          { status: 200 }
        );
      }

      advancedCalls += 1;

      if (advancedCalls === 1) {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            error: {
              code: -32090,
              message: "Too many requests",
            },
          }),
          {
            status: 429,
            headers: {
              "retry-after": "0",
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            holdersCount: 500,
            holders: [
              {
                holderAddress:
                  "0x2222222222222222222222222222222222222222",
                balanceRawInteger: "60",
              },
            ],
          },
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    try {
      const result =
        await ankrHoldersProvider.getTokenHolders({
          network: {
            networkId: "bnb",
            name: "BNB Chain",
            chainId: 56,
            nativeCurrency: "BNB",
          },
          address:
            "0x1111111111111111111111111111111111111111",
          limit: 100,
          cursor: null,
        });

      assert.equal(result.ok, true);
      assert.equal(advancedCalls, 2);
    } finally {
      globalThis.fetch = priorFetch;

      if (priorKey === undefined) {
        delete process.env.ANKR_API_KEY;
      } else {
        process.env.ANKR_API_KEY = priorKey;
      }
    }
  }
);

test(
  "Ankr avoids retries beyond long Retry-After",
  async () => {
    const priorKey = process.env.ANKR_API_KEY;
    const priorFetch = globalThis.fetch;

    process.env.ANKR_API_KEY = "test-ankr-key";

    let advancedCalls = 0;

    globalThis.fetch = (async input => {
      const url = String(input);

      if (url.includes("/bsc/")) {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: "0x64",
          }),
          { status: 200 }
        );
      }

      advancedCalls += 1;

      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          error: {
            code: -32090,
            message: "Too many requests",
          },
        }),
        {
          status: 429,
          headers: {
            "retry-after": "120",
          },
        }
      );
    }) as typeof fetch;

    try {
      const result =
        await ankrHoldersProvider.getTokenHolders({
          network: {
            networkId: "bnb",
            name: "BNB Chain",
            chainId: 56,
            nativeCurrency: "BNB",
          },
          address:
            "0x1111111111111111111111111111111111111111",
          limit: 100,
          cursor: null,
        });

      assert.equal(result.ok, false);

      if (!result.ok) {
        assert.equal(result.code, "RATE_LIMITED");
      }

      assert.equal(advancedCalls, 1);
    } finally {
      globalThis.fetch = priorFetch;

      if (priorKey === undefined) {
        delete process.env.ANKR_API_KEY;
      } else {
        process.env.ANKR_API_KEY = priorKey;
      }
    }
  }
);
