import assert from "node:assert/strict";
import test from "node:test";

import {
  alchemyTransactionsProvider,
} from "./alchemyTransactions";

const NETWORK = {
  networkId:
    "ethereum" as const,

  name:
    "Ethereum",

  chainId:
    1,

  nativeCurrency:
    "ETH",
};

test(
  "alchemy transaction provider normalizes inbound and outbound native evidence",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalKey =
      process.env
        .ALCHEMY_API_KEY;

    process.env
      .ALCHEMY_API_KEY =
      "unit-test-key";

    globalThis.fetch =
      async (
        _input,
        init
      ) => {
        const body =
          JSON.parse(
            String(
              init?.body
            )
          ) as {
            params:
              readonly [
                Record<
                  string,
                  unknown
                >,
              ];
          };

        const filter =
          body.params[0];

        const incoming =
          typeof filter
            .toAddress ===
            "string";

        const transfer =
          incoming
            ? {
                blockNum:
                  "0x11",

                hash:
                  `0x${"2".repeat(
                    64
                  )}`,

                from:
                  "0x1111111111111111111111111111111111111111",

                to:
                  "0x9999999999999999999999999999999999999999",

                rawContract: {
                  value:
                    "0x1bc16d674ec80000",
                },

                metadata: {
                  blockTimestamp:
                    "2026-09-25T12:00:00.000Z",
                },
              }
            : {
                blockNum:
                  "0x10",

                hash:
                  `0x${"1".repeat(
                    64
                  )}`,

                from:
                  "0x9999999999999999999999999999999999999999",

                to:
                  "0x2222222222222222222222222222222222222222",

                rawContract: {
                  value:
                    "0xde0b6b3a7640000",
                },

                metadata: {
                  blockTimestamp:
                    "2026-09-25T11:00:00.000Z",
                },
              };

        return new Response(
          JSON.stringify({
            jsonrpc:
              "2.0",

            id:
              1,

            result: {
              transfers: [
                transfer,
              ],
            },
          }),
          {
            status:
              200,

            headers: {
              "content-type":
                "application/json",
            },
          }
        );
      };

    try {
      const result =
        await alchemyTransactionsProvider
          .getTransactions({
            network:
              NETWORK,

            address:
              "0x9999999999999999999999999999999999999999",

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
        "alchemy"
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
          .value,
        "2000000000000000000"
      );

      assert.equal(
        result.data
          .transactions[1]
          .value,
        "1000000000000000000"
      );

      assert.equal(
        result.data
          .nextCursor,
        null
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      if (
        originalKey ===
        undefined
      ) {
        delete process.env
          .ALCHEMY_API_KEY;
      } else {
        process.env
          .ALCHEMY_API_KEY =
          originalKey;
      }
    }
  }
);
