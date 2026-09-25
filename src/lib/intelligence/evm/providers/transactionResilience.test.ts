import assert from "node:assert/strict";
import test from "node:test";

import type {
  EvmTransactionsProvider,
} from "../provider";

import type {
  EvmProviderResult,
  EvmTransactionsPage,
} from "../types";

import {
  getResilientEvmTransactions,
  type TransactionResilienceStore,
} from "./transactionResilience";

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

class MemoryStore
  implements TransactionResilienceStore
{
  private readonly values =
    new Map<
      string,
      unknown
    >();

  async get<T = unknown>(
    key:
      string
  ): Promise<
    T | null
  > {
    return (
      this.values.has(
        key
      )
        ? this.values.get(
            key
          )
        : null
    ) as T | null;
  }

  async set(
    key:
      string,
    value:
      unknown,
    options: {
      ex:
        number;
      nx?:
        boolean;
    }
  ) {
    void options.ex;

    if (
      options.nx &&
      this.values.has(
        key
      )
    ) {
      return null;
    }

    this.values.set(
      key,
      value
    );

    return "OK";
  }

  async del(
    ...keys:
      string[]
  ) {
    for (
      const key
      of keys
    ) {
      this.values.delete(
        key
      );
    }

    return keys.length;
  }
}

function success(
  providerId:
    "goldrush" |
    "alchemy" |
    "etherscan"
): EvmProviderResult<
  EvmTransactionsPage
> {
  return {
    ok:
      true,

    providerId,

    latencyMs:
      10,

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
  };
}

function fakeProvider({
  id,
  result,
  calls,
}: {
  id:
    "goldrush" |
    "alchemy" |
    "etherscan";

  result:
    EvmProviderResult<
      EvmTransactionsPage
    >;

  calls: {
    value:
      number;
  };
}): EvmTransactionsProvider {
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

function request(
  address:
    string
) {
  return {
    network:
      NETWORK,

    address,

    cursor:
      null,
  };
}

test(
  "resilience caches successful transaction evidence",
  async () => {
    const calls = {
      value:
        0,
    };

    const store =
      new MemoryStore();

    const provider =
      fakeProvider({
        id:
          "alchemy",

        result:
          success(
            "alchemy"
          ),

        calls,
      });

    const first =
      await getResilientEvmTransactions(
        request(
          "0x9999999999999999999999999999999999999999"
        ),
        {
          providers: [
            provider,
          ],
          store,
        }
      );

    const second =
      await getResilientEvmTransactions(
        request(
          "0x9999999999999999999999999999999999999999"
        ),
        {
          providers: [
            provider,
          ],
          store,
        }
      );

    assert.equal(
      first.ok,
      true
    );

    assert.equal(
      second.ok,
      true
    );

    assert.equal(
      calls.value,
      1
    );
  }
);

test(
  "quota failure opens distributed circuit and skips GoldRush for the next address",
  async () => {
    const primaryCalls = {
      value:
        0,
    };

    const fallbackCalls = {
      value:
        0,
    };

    const store =
      new MemoryStore();

    const primary =
      fakeProvider({
        id:
          "goldrush",

        result: {
          ok:
            false,

          providerId:
            "goldrush",

          latencyMs:
            10,

          code:
            "UPSTREAM_ERROR",

          error:
            "Credit limit exceeded for your account.",
        },

        calls:
          primaryCalls,
      });

    const fallback =
      fakeProvider({
        id:
          "alchemy",

        result:
          success(
            "alchemy"
          ),

        calls:
          fallbackCalls,
      });

    const first =
      await getResilientEvmTransactions(
        request(
          "0x9999999999999999999999999999999999999999"
        ),
        {
          providers: [
            primary,
            fallback,
          ],
          store,
        }
      );

    const second =
      await getResilientEvmTransactions(
        request(
          "0x8888888888888888888888888888888888888888"
        ),
        {
          providers: [
            primary,
            fallback,
          ],
          store,
        }
      );

    assert.equal(
      first.ok,
      true
    );

    assert.equal(
      second.ok,
      true
    );

    assert.equal(
      primaryCalls.value,
      1
    );

    assert.equal(
      fallbackCalls.value,
      2
    );
  }
);

test(
  "resilience reaches Etherscan when GoldRush and Alchemy both fail",
  async () => {
    const goldrushCalls = {
      value:
        0,
    };

    const alchemyCalls = {
      value:
        0,
    };

    const etherscanCalls = {
      value:
        0,
    };

    const store =
      new MemoryStore();

    const goldrush =
      fakeProvider({
        id:
          "goldrush",

        result: {
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

        calls:
          goldrushCalls,
      });

    const alchemy =
      fakeProvider({
        id:
          "alchemy",

        result: {
          ok:
            false,
          providerId:
            "alchemy",
          latencyMs:
            10,
          code:
            "RATE_LIMITED",
          error:
            "Rate limit reached.",
        },

        calls:
          alchemyCalls,
      });

    const etherscan =
      fakeProvider({
        id:
          "etherscan",

        result:
          success(
            "etherscan"
          ),

        calls:
          etherscanCalls,
      });

    const result =
      await getResilientEvmTransactions(
        request(
          "0x9999999999999999999999999999999999999999"
        ),
        {
          providers: [
            goldrush,
            alchemy,
            etherscan,
          ],
          store,
        }
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.providerId,
      "etherscan"
    );

    assert.equal(
      goldrushCalls.value,
      1
    );

    assert.equal(
      alchemyCalls.value,
      1
    );

    assert.equal(
      etherscanCalls.value,
      1
    );
  }
);

test(
  "preview and production use separate Redis cache namespaces",
  async () => {
    const originalVercelEnv =
      process.env
        .VERCEL_ENV;

    const calls = {
      value:
        0,
    };

    const store =
      new MemoryStore();

    const provider =
      fakeProvider({
        id:
          "alchemy",

        result:
          success(
            "alchemy"
          ),

        calls,
      });

    try {
      process.env
        .VERCEL_ENV =
        "preview";

      const preview =
        await getResilientEvmTransactions(
          request(
            "0x7777777777777777777777777777777777777777"
          ),
          {
            providers: [
              provider,
            ],

            store,
          }
        );

      assert.equal(
        preview.ok,
        true
      );

      assert.equal(
        calls.value,
        1
      );

      process.env
        .VERCEL_ENV =
        "production";

      const production =
        await getResilientEvmTransactions(
          request(
            "0x7777777777777777777777777777777777777777"
          ),
          {
            providers: [
              provider,
            ],

            store,
          }
        );

      assert.equal(
        production.ok,
        true
      );

      assert.equal(
        calls.value,
        2
      );

      process.env
        .VERCEL_ENV =
        "preview";

      const previewAgain =
        await getResilientEvmTransactions(
          request(
            "0x7777777777777777777777777777777777777777"
          ),
          {
            providers: [
              provider,
            ],

            store,
          }
        );

      assert.equal(
        previewAgain.ok,
        true
      );

      assert.equal(
        calls.value,
        2
      );
    } finally {
      if (
        originalVercelEnv ===
          undefined
      ) {
        delete process.env
          .VERCEL_ENV;
      } else {
        process.env
          .VERCEL_ENV =
          originalVercelEnv;
      }
    }
  }
);

test(
  "alchemy continuation cursor routes only to Alchemy",
  async () => {
    const calls = {
      goldrush: 0,
      alchemy: 0,
      etherscan: 0,
    };

    let receivedCursor:
      string | null | undefined =
      null;

    const providers:
      EvmTransactionsProvider[] = [
      {
        id: "goldrush",
        capabilities: ["transactions"],
        supportsNetwork: () => true,
        supportsCapability: () => true,
        async getTransactions() {
          calls.goldrush += 1;
          return success("goldrush");
        },
      },
      {
        id: "alchemy",
        capabilities: ["transactions"],
        supportsNetwork: () => true,
        supportsCapability: () => true,
        async getTransactions(
          request
        ) {
          calls.alchemy += 1;
          receivedCursor =
            request.cursor;
          return success("alchemy");
        },
      },
      {
        id: "etherscan",
        capabilities: ["transactions"],
        supportsNetwork: () => true,
        supportsCapability: () => true,
        async getTransactions() {
          calls.etherscan += 1;
          return success("etherscan");
        },
      },
    ];

    const result =
      await getResilientEvmTransactions(
        {
          network: NETWORK,
          address:
            "0x9999999999999999999999999999999999999999",
          cursor:
            "alchemy:eyJpIjoicGFnZS0yIiwibyI6bnVsbH0",
        },
        {
          providers,
          store: null,
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
      calls.goldrush,
      0
    );

    assert.equal(
      calls.alchemy,
      1
    );

    assert.equal(
      calls.etherscan,
      0
    );

    assert.equal(
      receivedCursor,
      "alchemy:eyJpIjoicGFnZS0yIiwibyI6bnVsbH0"
    );
  }
);

test(
  "GoldRush scoped continuation routes only to GoldRush and strips prefix",
  async () => {
    let receivedCursor:
      string | null | undefined =
      null;

    let alchemyCalls =
      0;

    const goldrush:
      EvmTransactionsProvider = {
      id: "goldrush",
      capabilities: ["transactions"],
      supportsNetwork: () => true,
      supportsCapability: () => true,
      async getTransactions(
        request
      ) {
        receivedCursor =
          request.cursor;

        return success(
          "goldrush"
        );
      },
    };

    const alchemy:
      EvmTransactionsProvider = {
      id: "alchemy",
      capabilities: ["transactions"],
      supportsNetwork: () => true,
      supportsCapability: () => true,
      async getTransactions() {
        alchemyCalls += 1;

        return success(
          "alchemy"
        );
      },
    };

    const result =
      await getResilientEvmTransactions(
        {
          network: NETWORK,
          address:
            "0x9999999999999999999999999999999999999999",
          cursor:
            "goldrush:3",
        },
        {
          providers: [
            goldrush,
            alchemy,
          ],
          store: null,
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
      receivedCursor,
      "3"
    );

    assert.equal(
      alchemyCalls,
      0
    );
  }
);

test(
  "Etherscan scoped continuation routes only to Etherscan and strips prefix",
  async () => {
    let receivedCursor:
      string | null | undefined =
      null;

    let goldrushCalls =
      0;

    const goldrush:
      EvmTransactionsProvider = {
      id: "goldrush",
      capabilities: ["transactions"],
      supportsNetwork: () => true,
      supportsCapability: () => true,
      async getTransactions() {
        goldrushCalls += 1;

        return success(
          "goldrush"
        );
      },
    };

    const etherscan:
      EvmTransactionsProvider = {
      id: "etherscan",
      capabilities: ["transactions"],
      supportsNetwork: () => true,
      supportsCapability: () => true,
      async getTransactions(
        request
      ) {
        receivedCursor =
          request.cursor;

        return success(
          "etherscan"
        );
      },
    };

    const result =
      await getResilientEvmTransactions(
        {
          network: NETWORK,
          address:
            "0x9999999999999999999999999999999999999999",
          cursor:
            "etherscan:4",
        },
        {
          providers: [
            goldrush,
            etherscan,
          ],
          store: null,
        }
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.providerId,
      "etherscan"
    );

    assert.equal(
      receivedCursor,
      "4"
    );

    assert.equal(
      goldrushCalls,
      0
    );
  }
);
