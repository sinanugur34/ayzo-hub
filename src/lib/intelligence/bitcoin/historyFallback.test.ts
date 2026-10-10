import assert from "node:assert/strict";
import test from "node:test";

import {
  getBitcoinAddressHistoryWithFallback,
} from "./historyFallback";

const REQUEST = {
  network: {
    networkId: "bitcoin",
    name: "Bitcoin",
    nativeCurrency: "BTC",
  },
  address:
    "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",
  limit: 5,
} as const;

const HISTORY = {
  transactions: [
    {
      transactionHash:
        "a".repeat(64),
      blockHeight:
        900000,
      timestamp:
        "2026-09-10T00:00:00.000Z",
    },
  ],
  nextCursor:
    null,
} as const;

test(
  "keeps GoldRush when primary history succeeds",
  async () => {
    let fallbackCalls = 0;

    const result =
      await getBitcoinAddressHistoryWithFallback(
        REQUEST,
        {
          async getAddressTransactions() {
            return {
              ok: true,
              providerId: "goldrush",
              latencyMs: 10,
              data: HISTORY,
            };
          },
        },
        {
          async getAddressTransactions() {
            fallbackCalls += 1;

            throw new Error(
              "Fallback must not run."
            );
          },
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
      fallbackCalls,
      0
    );
  }
);

test(
  "uses Mempool after GoldRush upstream failure",
  async () => {
    let fallbackCalls = 0;

    const result =
      await getBitcoinAddressHistoryWithFallback(
        REQUEST,
        {
          async getAddressTransactions() {
            return {
              ok: false,
              providerId: "goldrush",
              latencyMs: 10,
              code: "UPSTREAM_ERROR",
              error:
                "GoldRush unavailable.",
            };
          },
        },
        {
          async getAddressTransactions() {
            fallbackCalls += 1;

            return {
              ok: true,
              providerId: "mempool",
              latencyMs: 20,
              data: HISTORY,
            };
          },
        }
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.providerId,
      "mempool"
    );

    assert.equal(
      fallbackCalls,
      1
    );
  }
);

test(
  "uses Mempool after GoldRush rate limit",
  async () => {
    const result =
      await getBitcoinAddressHistoryWithFallback(
        REQUEST,
        {
          async getAddressTransactions() {
            return {
              ok: false,
              providerId: "goldrush",
              latencyMs: 10,
              code: "RATE_LIMITED",
              error:
                "GoldRush rate limited.",
            };
          },
        },
        {
          async getAddressTransactions() {
            return {
              ok: true,
              providerId: "mempool",
              latencyMs: 20,
              data: HISTORY,
            };
          },
        }
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.providerId,
      "mempool"
    );
  }
);

test(
  "does not fallback on validation failure",
  async () => {
    let fallbackCalls = 0;

    const result =
      await getBitcoinAddressHistoryWithFallback(
        REQUEST,
        {
          async getAddressTransactions() {
            return {
              ok: false,
              providerId: "goldrush",
              latencyMs: null,
              code: "INVALID_ADDRESS",
              error:
                "Invalid Bitcoin address.",
            };
          },
        },
        {
          async getAddressTransactions() {
            fallbackCalls += 1;

            throw new Error(
              "Fallback must not run."
            );
          },
        }
      );

    assert.equal(
      result.ok,
      false
    );

    if (!result.ok) {
      assert.equal(
        result.code,
        "INVALID_ADDRESS"
      );
    }

    assert.equal(
      fallbackCalls,
      0
    );
  }
);

test(
  "fails closed when both history providers fail",
  async () => {
    const result =
      await getBitcoinAddressHistoryWithFallback(
        REQUEST,
        {
          async getAddressTransactions() {
            return {
              ok: false,
              providerId: "goldrush",
              latencyMs: 10,
              code: "UPSTREAM_ERROR",
              error:
                "GoldRush unavailable.",
            };
          },
        },
        {
          async getAddressTransactions() {
            return {
              ok: false,
              providerId: "mempool",
              latencyMs: 20,
              code: "UPSTREAM_ERROR",
              error:
                "Mempool unavailable.",
            };
          },
        }
      );

    assert.equal(
      result.ok,
      false
    );

    if (!result.ok) {
      assert.equal(
        result.providerId,
        "mempool"
      );

      assert.equal(
        result.code,
        "UPSTREAM_ERROR"
      );
    }
  }
);


test(
  "Advanced 30-item Bitcoin history is assembled from provider-safe pages",
  async () => {
    const seen: Array<{ limit: number | undefined; cursor: string | null | undefined }> = [];
    const rows = Array.from({ length: 30 }, (_, index) => ({
      transactionHash: (index + 1).toString(16).padStart(64, "0"),
      blockHeight: 965000 - index,
      timestamp: "2026-09-10T00:00:00.000Z",
    }));
    const primary = {
      async getAddressTransactions(request: { limit?: number; cursor?: string | null }) {
        seen.push({ limit: request.limit, cursor: request.cursor });
        const first = request.cursor === null || request.cursor === undefined;
        return {
          ok: true as const,
          providerId: "mempool" as const,
          latencyMs: 2,
          data: {
            transactions: first ? rows.slice(0, 25) : rows.slice(25),
            nextCursor: first ? rows[24]!.transactionHash : null,
          },
        };
      },
    };
    const result = await getBitcoinAddressHistoryWithFallback(
      { ...REQUEST, limit: 30 },
      primary,
      { async getAddressTransactions() { throw new Error("Fallback is not needed"); } }
    );
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("Bitcoin pagination unexpectedly failed.");
    assert.equal(result.data.transactions.length, 30);
    assert.equal(result.data.nextCursor, null);
    assert.deepEqual(seen, [
      { limit: 25, cursor: null },
      { limit: 5, cursor: rows[24]!.transactionHash },
    ]);
  }
);

test(
  "Advanced Bitcoin history stops without a second request when evidence ends",
  async () => {
    let calls = 0;
    const result = await getBitcoinAddressHistoryWithFallback(
      { ...REQUEST, limit: 30 },
      {
        async getAddressTransactions(request) {
          calls += 1;
          assert.equal(request.limit, 25);
          return { ok: true as const, providerId: "mempool" as const, latencyMs: 1,
            data: { transactions: HISTORY.transactions.slice(), nextCursor: null } };
        },
      },
      { async getAddressTransactions() { throw new Error("No fallback"); } }
    );
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("Bitcoin pagination unexpectedly failed.");
    assert.equal(result.data.transactions.length, 1);
    assert.equal(calls, 1);
  }
);

test(
  "Advanced Bitcoin paging refuses duplicate hashes instead of claiming 30 unique items",
  async () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({
      transactionHash: (index + 1).toString(16).padStart(64, "0"),
      blockHeight: 965000 - index,
      timestamp: "2026-09-10T00:00:00.000Z",
    }));
    let fallbackCalls = 0;
    const result = await getBitcoinAddressHistoryWithFallback(
      { ...REQUEST, limit: 30 },
      {
        async getAddressTransactions(request) {
          const first = request.cursor == null;
          return { ok: true as const, providerId: "mempool" as const, latencyMs: 1,
            data: { transactions: first ? rows : [rows[0]!],
              nextCursor: first ? rows[24]!.transactionHash : null } };
        },
      },
      {
        async getAddressTransactions() {
          fallbackCalls += 1;
          return { ok: false as const, providerId: "goldrush" as const, latencyMs: 1,
            code: "UPSTREAM_ERROR" as const, error: "Alternative provider unavailable." };
        },
      }
    );
    assert.equal(result.ok, false);
    assert.ok(fallbackCalls <= 1);
  }
);
