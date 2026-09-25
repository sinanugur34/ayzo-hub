import assert from "node:assert/strict";
import test from "node:test";

import type {
  EvmTransactionsProvider,
} from "../provider";

import {
  getEvmTransactionsWithFallback,
} from "./transactionProviderFallback";

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

function provider(
  id:
    "goldrush" |
    "alchemy",
  result:
    Awaited<
      ReturnType<
        EvmTransactionsProvider[
          "getTransactions"
        ]
      >
    >,
  calls: {
    value:
      number;
  }
): EvmTransactionsProvider {
  return {
    id,

    capabilities: [
      "transactions",
    ],

    supportsNetwork:
      () =>
        true,

    supportsCapability:
      capability =>
        capability ===
        "transactions",

    async getTransactions() {
      calls.value +=
        1;

      return result;
    },
  };
}

test(
  "transaction provider falls back to Alchemy when GoldRush upstream fails",
  async () => {
    const primaryCalls = {
      value:
        0,
    };

    const fallbackCalls = {
      value:
        0,
    };

    const primary =
      provider(
        "goldrush",
        {
          ok:
            false,

          providerId:
            "goldrush",

          latencyMs:
            10,

          code:
            "UPSTREAM_ERROR",

          error:
            "Credit limit exceeded.",
        },
        primaryCalls
      );

    const fallback =
      provider(
        "alchemy",
        {
          ok:
            true,

          providerId:
            "alchemy",

          latencyMs:
            20,

          data: {
            transactions: [
              {
                hash:
                  `0x${"a".repeat(
                    64
                  )}`,

                blockNumber:
                  1,

                timestamp:
                  "2026-09-25T12:00:00.000Z",

                from:
                  "0x1111111111111111111111111111111111111111",

                to:
                  "0x9999999999999999999999999999999999999999",

                value:
                  "1000000000000000000",
              },
            ],

            nextCursor:
              null,
          },
        },
        fallbackCalls
      );

    const result =
      await getEvmTransactionsWithFallback(
        {
          network:
            NETWORK,

          address:
            "0x9999999999999999999999999999999999999999",

          cursor:
            null,
        },
        {
          primary,
          fallback,
        }
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.providerId,
      "alchemy"
    );

    assert.equal(
      primaryCalls.value,
      1
    );

    assert.equal(
      fallbackCalls.value,
      1
    );
  }
);

test(
  "transaction provider keeps GoldRush when primary succeeds",
  async () => {
    const primaryCalls = {
      value:
        0,
    };

    const fallbackCalls = {
      value:
        0,
    };

    const primary =
      provider(
        "goldrush",
        {
          ok:
            true,

          providerId:
            "goldrush",

          latencyMs:
            10,

          data: {
            transactions:
              [],

            nextCursor:
              null,
          },
        },
        primaryCalls
      );

    const fallback =
      provider(
        "alchemy",
        {
          ok:
            true,

          providerId:
            "alchemy",

          latencyMs:
            20,

          data: {
            transactions:
              [],

            nextCursor:
              null,
          },
        },
        fallbackCalls
      );

    const result =
      await getEvmTransactionsWithFallback(
        {
          network:
            NETWORK,

          address:
            "0x9999999999999999999999999999999999999999",

          cursor:
            null,
        },
        {
          primary,
          fallback,
        }
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.providerId,
      "goldrush"
    );

    assert.equal(
      primaryCalls.value,
      1
    );

    assert.equal(
      fallbackCalls.value,
      0
    );
  }
);
