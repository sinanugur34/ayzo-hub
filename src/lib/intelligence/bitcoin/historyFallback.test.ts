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
