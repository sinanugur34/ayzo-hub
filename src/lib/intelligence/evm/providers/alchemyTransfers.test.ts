import assert from "node:assert/strict";
import test from "node:test";

import {
  alchemyTransfersProvider,
} from "./alchemyTransfers";

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
  "alchemy transfer provider normalizes inbound and outbound ERC20 evidence",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalKey =
      process.env
        .ALCHEMY_API_KEY;

    process.env
      .ALCHEMY_API_KEY =
      "unit-test-key";

    const observedBodies:
      Record<
        string,
        unknown
      >[] = [];

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

        const params =
          body.params[0];

        observedBodies.push(
          params
        );

        const incoming =
          typeof params
            .toAddress ===
            "string";

        const transfer =
          incoming
            ? {
                uniqueId:
                  "incoming-1",

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
                    "0x64",
                },

                metadata: {
                  blockTimestamp:
                    "2026-10-07T12:00:00.000Z",
                },
              }
            : {
                uniqueId:
                  "outgoing-1",

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
                    "0xc8",
                },

                metadata: {
                  blockTimestamp:
                    "2026-10-07T11:00:00.000Z",
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
        await alchemyTransfersProvider
          .getTokenTransfers({
            network:
              NETWORK,

            address:
              "0x9999999999999999999999999999999999999999",

            tokenAddress:
              "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",

            limit:
              100,

            cursor:
              null,
          });

      assert.equal(
        result.ok,
        true
      );

      if (
        !result.ok
      ) {
        return;
      }

      assert.equal(
        result.providerId,
        "alchemy"
      );

      assert.equal(
        result.data
          .transfers
          .length,
        2
      );

      assert.deepEqual(
        result.data
          .transfers
          .map(
            transfer =>
              transfer.value
          )
          .sort(),
        [
          "100",
          "200",
        ]
      );

      assert.equal(
        observedBodies
          .length,
        2
      );

      for (
        const body of
          observedBodies
      ) {
        assert.deepEqual(
          body.category,
          [
            "erc20",
          ]
        );

        assert.deepEqual(
          body
            .contractAddresses,
          [
            "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          ]
        );
      }
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

test(
  "alchemy transfer provider refuses networks not enabled for Transfers API",
  async () => {
    const result =
      await alchemyTransfersProvider
        .getTokenTransfers({
          network: {
            networkId:
              "mantle",

            name:
              "Mantle",

            chainId:
              5000,

            nativeCurrency:
              "MNT",
          },

          address:
            "0x9999999999999999999999999999999999999999",

          tokenAddress:
            "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",

          cursor:
            null,
        });

    assert.equal(
      result.ok,
      false
    );

    if (
      result.ok
    ) {
      return;
    }

    assert.equal(
      result.code,
      "UNSUPPORTED_NETWORK"
    );
  }
);
