import assert from "node:assert/strict";
import test from "node:test";

import {
  getDogecoinAddressHistoryWithFallback,
} from "./historyFallback";

const REQUEST = {
  network: {
    networkId: "dogecoin",
    name: "Dogecoin",
    nativeCurrency: "DOGE",
  },
  address:
    "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L",
  limit: 5,
} as const;

const HISTORY = {
  transactions: [
    {
      transactionHash:
        "a".repeat(64),
      blockHeight:
        6000000,
      timestamp:
        "2026-09-10T07:00:00.000Z",
    },
  ],
  nextCursor: null,
} as const;

test(
  "keeps Blockchair when primary succeeds",
  async () => {
    let fallbackCalls = 0;

    const result =
      await getDogecoinAddressHistoryWithFallback(
        REQUEST,
        {
          async getAddressTransactions() {
            return {
              ok: true,
              providerId: "blockchair",
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

    assert.equal(result.ok, true);
    assert.equal(
      result.providerId,
      "blockchair"
    );
    assert.equal(fallbackCalls, 0);
  }
);

test(
  "uses BlockCypher after upstream failure",
  async () => {
    const result =
      await getDogecoinAddressHistoryWithFallback(
        REQUEST,
        {
          async getAddressTransactions() {
            return {
              ok: false,
              providerId: "blockchair",
              latencyMs: 10,
              code: "UPSTREAM_ERROR",
              error:
                "Blockchair unavailable.",
            };
          },
        },
        {
          async getAddressTransactions() {
            return {
              ok: true,
              providerId: "blockcypher",
              latencyMs: 20,
              data: HISTORY,
            };
          },
        }
      );

    assert.equal(result.ok, true);
    assert.equal(
      result.providerId,
      "blockcypher"
    );
  }
);

test(
  "uses BlockCypher after rate limit",
  async () => {
    const result =
      await getDogecoinAddressHistoryWithFallback(
        REQUEST,
        {
          async getAddressTransactions() {
            return {
              ok: false,
              providerId: "blockchair",
              latencyMs: 10,
              code: "RATE_LIMITED",
              error:
                "Blockchair rate limited.",
            };
          },
        },
        {
          async getAddressTransactions() {
            return {
              ok: true,
              providerId: "blockcypher",
              latencyMs: 20,
              data: HISTORY,
            };
          },
        }
      );

    assert.equal(result.ok, true);
    assert.equal(
      result.providerId,
      "blockcypher"
    );
  }
);

test(
  "does not fallback on validation failure",
  async () => {
    let fallbackCalls = 0;

    const result =
      await getDogecoinAddressHistoryWithFallback(
        REQUEST,
        {
          async getAddressTransactions() {
            return {
              ok: false,
              providerId: "blockchair",
              latencyMs: null,
              code: "INVALID_ADDRESS",
              error:
                "Invalid Dogecoin address.",
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

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(
        result.code,
        "INVALID_ADDRESS"
      );
    }

    assert.equal(fallbackCalls, 0);
  }
);

test(
  "fails closed when both providers fail",
  async () => {
    const result =
      await getDogecoinAddressHistoryWithFallback(
        REQUEST,
        {
          async getAddressTransactions() {
            return {
              ok: false,
              providerId: "blockchair",
              latencyMs: 10,
              code: "UPSTREAM_ERROR",
              error:
                "Blockchair unavailable.",
            };
          },
        },
        {
          async getAddressTransactions() {
            return {
              ok: false,
              providerId: "blockcypher",
              latencyMs: 20,
              code: "UPSTREAM_ERROR",
              error:
                "BlockCypher unavailable.",
            };
          },
        }
      );

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(
        result.providerId,
        "blockcypher"
      );

      assert.equal(
        result.code,
        "UPSTREAM_ERROR"
      );
    }
  }
);
