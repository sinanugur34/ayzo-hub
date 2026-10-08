import assert from "node:assert/strict";
import test from "node:test";

import type {
  EvmTokenHoldersProvider,
} from "../provider";

import {
  getPreferredEvmHolderProviderId,
  getPreferredEvmTokenHolders,
} from "./preferredHolders";

const BASE = {
  networkId:
    "base" as const,

  name:
    "Base",

  chainId:
    8453,

  nativeCurrency:
    "ETH",
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

const ADDRESS =
  "0x1111111111111111111111111111111111111111";

function makeProvider(
  id:
    "ankr" |
    "goldrush",

  successful:
    boolean,

  calls: {
    value: number;
  }
): EvmTokenHoldersProvider {
  return {
    id,

    capabilities: [
      "tokenHolders",
    ],

    supportsNetwork:
      () => true,

    supportsCapability:
      capability =>
        capability ===
          "tokenHolders",

    async getTokenHolders() {
      calls.value += 1;

      if (!successful) {
        return {
          ok: false,

          providerId:
            id,

          latencyMs:
            1,

          code:
            "UPSTREAM_ERROR",

          error:
            "temporary failure",
        };
      }

      return {
        ok: true,

        providerId:
          id,

        latencyMs:
          1,

        data: {
          holders: [],
          totalSupply:
            "100",
          totalCount:
            0,
          nextCursor:
            null,
        },
      };
    },
  };
}

test(
  "certified networks select Ankr",
  () => {
    for (
      const network of [
        "base",
        "bnb",
        "arbitrum",
        "polygon",
        "avalanche",
        "linea",
      ] as const
    ) {
      assert.equal(
        getPreferredEvmHolderProviderId(
          network
        ),
        "ankr"
      );
    }

    assert.equal(
      getPreferredEvmHolderProviderId(
        "sonic"
      ),
      "goldrush"
    );

    assert.equal(
      getPreferredEvmHolderProviderId(
        "monad"
      ),
      "goldrush"
    );
  }
);

test(
  "Base uses Ankr",
  async () => {
    const ankr = {
      value: 0,
    };

    const goldrush = {
      value: 0,
    };

    const result =
      await getPreferredEvmTokenHolders(
        {
          network:
            BASE,

          address:
            ADDRESS,

          limit:
            100,

          cursor:
            null,
        },

        {
          ankr:
            makeProvider(
              "ankr",
              true,
              ankr
            ),

          goldrush:
            makeProvider(
              "goldrush",
              true,
              goldrush
            ),
        }
      );

    assert.equal(
      result.providerId,
      "ankr"
    );

    assert.equal(
      ankr.value,
      1
    );

    assert.equal(
      goldrush.value,
      0
    );
  }
);

test(
  "Sonic remains GoldRush",
  async () => {
    const ankr = {
      value: 0,
    };

    const goldrush = {
      value: 0,
    };

    const result =
      await getPreferredEvmTokenHolders(
        {
          network:
            SONIC,

          address:
            ADDRESS,

          limit:
            100,

          cursor:
            null,
        },

        {
          ankr:
            makeProvider(
              "ankr",
              true,
              ankr
            ),

          goldrush:
            makeProvider(
              "goldrush",
              true,
              goldrush
            ),
        }
      );

    assert.equal(
      result.providerId,
      "goldrush"
    );

    assert.equal(
      ankr.value,
      0
    );

    assert.equal(
      goldrush.value,
      1
    );
  }
);

test(
  "Ankr root failure falls back to GoldRush",
  async () => {
    const ankr = {
      value: 0,
    };

    const goldrush = {
      value: 0,
    };

    const result =
      await getPreferredEvmTokenHolders(
        {
          network:
            BASE,

          address:
            ADDRESS,

          limit:
            100,

          cursor:
            null,
        },

        {
          ankr:
            makeProvider(
              "ankr",
              false,
              ankr
            ),

          goldrush:
            makeProvider(
              "goldrush",
              true,
              goldrush
            ),
        }
      );

    assert.equal(
      result.providerId,
      "goldrush"
    );

    assert.equal(
      ankr.value,
      1
    );

    assert.equal(
      goldrush.value,
      1
    );
  }
);
