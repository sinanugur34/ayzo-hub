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


test("indexed continuation stays closed outside the approved preview canary", async () => {
  const previousFlag = process.env.AYZO_INDEXED_HOLDER_CANARY;
  const previousVercel = process.env.VERCEL_ENV;
  const ankrCalls = { value: 0 };
  const goldrushCalls = { value: 0 };
  try {
    const dependencies = {
      ankr: makeProvider("ankr", true, ankrCalls),
      goldrush: makeProvider("goldrush", true, goldrushCalls),
    };
    for (const config of [
      { flag: "0", vercel: "preview" },
      { flag: "1", vercel: "production" },
    ]) {
      process.env.AYZO_INDEXED_HOLDER_CANARY = config.flag;
      process.env.VERCEL_ENV = config.vercel;
      for (const provider of ["routescan", "blockscout"]) {
        const cursor = `${provider}:${Buffer.from(JSON.stringify({ next: "page" })).toString("base64url")}`;
        const result = await getPreferredEvmTokenHolders({
          network: BASE, address: ADDRESS, limit: 100, cursor,
        }, dependencies);
        assert.equal(result.ok, false);
        if (result.ok) continue;
        assert.equal(result.providerId, provider);
        assert.match(result.error, /disabled in this environment/);
      }
    }
    assert.equal(ankrCalls.value, 0);
    assert.equal(goldrushCalls.value, 0);
  } finally {
    if (previousFlag === undefined) delete process.env.AYZO_INDEXED_HOLDER_CANARY;
    else process.env.AYZO_INDEXED_HOLDER_CANARY = previousFlag;
    if (previousVercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousVercel;
  }
});
