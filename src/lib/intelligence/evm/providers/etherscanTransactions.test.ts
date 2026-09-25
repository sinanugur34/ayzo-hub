import assert from "node:assert/strict";
import test from "node:test";

import {
  etherscanTransactionsProvider,
} from "./etherscanTransactions";

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
  "etherscan transaction provider normalizes address history",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalKey =
      process.env
        .ETHERSCAN_API_KEY;

    process.env
      .ETHERSCAN_API_KEY =
      "unit-test-key";

    globalThis.fetch =
      async input => {
        const url =
          new URL(
            String(
              input
            )
          );

        assert.equal(
          url.searchParams.get(
            "module"
          ),
          "account"
        );

        assert.equal(
          url.searchParams.get(
            "action"
          ),
          "txlist"
        );

        assert.equal(
          url.searchParams.get(
            "chainid"
          ),
          "1"
        );

        return new Response(
          JSON.stringify({
            status:
              "1",

            message:
              "OK",

            result: [
              {
                blockNumber:
                  "123",

                timeStamp:
                  "1758800000",

                hash:
                  `0x${"1".repeat(
                    64
                  )}`,

                from:
                  "0x1111111111111111111111111111111111111111",

                to:
                  "0x9999999999999999999999999999999999999999",

                value:
                  "2000000000000000000",

                isError:
                  "0",
              },

              {
                blockNumber:
                  "122",

                timeStamp:
                  "1758799000",

                hash:
                  `0x${"2".repeat(
                    64
                  )}`,

                from:
                  "0x9999999999999999999999999999999999999999",

                to:
                  "0x2222222222222222222222222222222222222222",

                value:
                  "1000000000000000000",

                isError:
                  "1",
              },
            ],
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
        await etherscanTransactionsProvider
          .getTransactions({
            network:
              NETWORK,

            address:
              "0x9999999999999999999999999999999999999999",

            cursor:
              null,

            limit:
              100,
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
        "etherscan"
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
        null
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
          .ETHERSCAN_API_KEY;
      } else {
        process.env
          .ETHERSCAN_API_KEY =
          originalKey;
      }
    }
  }
);
