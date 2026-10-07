import assert from "node:assert/strict";
import test from "node:test";

import type {
  EvmTransfersProvider,
} from "../provider";

import {
  getPreferredEvmTokenTransfers,
} from "./preferredTransfers";

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

const REQUEST = {
  network:
    NETWORK,

  address:
    "0x1111111111111111111111111111111111111111",

  tokenAddress:
    "0x2222222222222222222222222222222222222222",

  cursor:
    null,
};

function provider({
  id,
  supported,
  ok,
  calls,
}: {
  id:
    "alchemy" |
    "goldrush";

  supported:
    boolean;

  ok:
    boolean;

  calls: {
    value:
      number;
  };
}): EvmTransfersProvider {
  return {
    id,

    capabilities: [
      "tokenTransfers",
    ],

    supportsNetwork:
      () =>
        supported,

    supportsCapability:
      capability =>
        capability ===
        "tokenTransfers",

    async getTokenTransfers() {
      calls.value +=
        1;

      if (ok) {
        return {
          ok:
            true,

          providerId:
            id,

          latencyMs:
            1,

          data: {
            transfers:
              [],

            nextCursor:
              null,
          },
        };
      }

      return {
        ok:
          false,

        providerId:
          id,

        latencyMs:
          1,

        code:
          "UPSTREAM_ERROR",

        error:
          `${id} unavailable`,
      };
    },
  };
}

test(
  "preferred transfers use Alchemy first on certified networks",
  async () => {
    const alchemyCalls = {
      value:
        0,
    };

    const goldrushCalls = {
      value:
        0,
    };

    const result =
      await getPreferredEvmTokenTransfers(
        REQUEST,

        {
          alchemy:
            provider({
              id:
                "alchemy",

              supported:
                true,

              ok:
                true,

              calls:
                alchemyCalls,
            }),

          goldrush:
            provider({
              id:
                "goldrush",

              supported:
                true,

              ok:
                true,

              calls:
                goldrushCalls,
            }),
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
      alchemyCalls.value,
      1
    );

    assert.equal(
      goldrushCalls.value,
      0
    );
  }
);

test(
  "preferred transfers preserve GoldRush for networks without Alchemy EAPI",
  async () => {
    const alchemyCalls = {
      value:
        0,
    };

    const goldrushCalls = {
      value:
        0,
    };

    const result =
      await getPreferredEvmTokenTransfers(
        REQUEST,

        {
          alchemy:
            provider({
              id:
                "alchemy",

              supported:
                false,

              ok:
                true,

              calls:
                alchemyCalls,
            }),

          goldrush:
            provider({
              id:
                "goldrush",

              supported:
                true,

              ok:
                true,

              calls:
                goldrushCalls,
            }),
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
      alchemyCalls.value,
      0
    );

    assert.equal(
      goldrushCalls.value,
      1
    );
  }
);

test(
  "preferred transfers fall back only after Alchemy upstream failure",
  async () => {
    const alchemyCalls = {
      value:
        0,
    };

    const goldrushCalls = {
      value:
        0,
    };

    const result =
      await getPreferredEvmTokenTransfers(
        REQUEST,

        {
          alchemy:
            provider({
              id:
                "alchemy",

              supported:
                true,

              ok:
                false,

              calls:
                alchemyCalls,
            }),

          goldrush:
            provider({
              id:
                "goldrush",

              supported:
                true,

              ok:
                true,

              calls:
                goldrushCalls,
            }),
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
      alchemyCalls.value,
      1
    );

    assert.equal(
      goldrushCalls.value,
      1
    );
  }
);
