import assert from "node:assert/strict";
import test from "node:test";

import type {
  BitcoinNetworkContext,
} from "../types";

import {
  goldRushBitcoinProvider,
} from "./goldrush";

const NETWORK: BitcoinNetworkContext = {
  networkId: "bitcoin",
  name: "Bitcoin",
  nativeCurrency: "BTC",
};

test(
  "normalizes GoldRush Bitcoin address history",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalKey =
      process.env
        .GOLDRUSH_API_KEY;

    const capture: {
      requestedUrl: URL | null;
    } = {
      requestedUrl: null,
    };

    process.env
      .GOLDRUSH_API_KEY =
        "test-key";

    globalThis.fetch =
      (async (
        input:
          string | URL | Request
      ) => {
        capture.requestedUrl =
          new URL(
            input instanceof
              Request
              ? input.url
              : input.toString()
          );

        return new Response(
          JSON.stringify({
            error: false,

            data: {
              items: [
                {
                  tx_hash:
                    "A".repeat(
                      64
                    ),

                  block_height:
                    965000,

                  block_signed_at:
                    "2026-09-03T10:00:00Z",
                },
              ],

              pagination: {
                has_more:
                  true,

                page_number:
                  0,
              },
            },
          }),

          {
            status: 200,

            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );
      }) as typeof fetch;

    try {
      const result =
        await goldRushBitcoinProvider
          .getAddressTransactions({
            network:
              NETWORK,

            address:
              "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",

            limit: 5,
          });

      if (!result.ok) {
        throw new Error(
          result.error
        );
      }

      assert.equal(
        result.ok,
        true
      );

      assert.equal(
        result.data
          .transactions.length,
        1
      );

      assert.equal(
        result.data
          .transactions[0]
          ?.transactionHash,
        "a".repeat(64)
      );

      assert.equal(
        result.data
          .transactions[0]
          ?.blockHeight,
        965000
      );

      assert.equal(
        result.data
          .transactions[0]
          ?.timestamp,
        "2026-09-03T10:00:00.000Z"
      );

      assert.equal(
        result.data
          .nextCursor,
        "1"
      );

      const requestedUrl =
        capture.requestedUrl as
          URL | null;

      if (!requestedUrl) {
        throw new Error(
          "GoldRush request URL was not captured."
        );
      }

      assert.equal(
        requestedUrl
          .searchParams
          .get(
            "page-size"
          ),
        "5"
      );

      assert.equal(
        requestedUrl
          .searchParams
          .get(
            "page-number"
          ),
        "0"
      );

      assert.equal(
        requestedUrl
          .searchParams
          .get(
            "address"
          ),
        "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo"
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      if (
        originalKey ===
        undefined
      ) {
        delete process.env
          .GOLDRUSH_API_KEY;
      } else {
        process.env
          .GOLDRUSH_API_KEY =
            originalKey;
      }
    }
  }
);

test(
  "rejects invalid Bitcoin history input before provider access",
  async () => {
    const invalidAddress =
      await goldRushBitcoinProvider
        .getAddressTransactions({
          network:
            NETWORK,

          address:
            "not-bitcoin",
        });

    assert.equal(
      invalidAddress.ok,
      false
    );

    if (
      invalidAddress.ok
    ) {
      throw new Error(
        "Invalid address unexpectedly passed."
      );
    }

    assert.equal(
      invalidAddress.code,
      "INVALID_ADDRESS"
    );

    const invalidCursor =
      await goldRushBitcoinProvider
        .getAddressTransactions({
          network:
            NETWORK,

          address:
            "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",

          cursor:
            "page-one",
        });

    assert.equal(
      invalidCursor.ok,
      false
    );

    if (
      invalidCursor.ok
    ) {
      throw new Error(
        "Invalid cursor unexpectedly passed."
      );
    }

    assert.equal(
      invalidCursor.code,
      "INVALID_CURSOR"
    );

    const invalidLimit =
      await goldRushBitcoinProvider
        .getAddressTransactions({
          network:
            NETWORK,

          address:
            "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",

          limit:
            101,
        });

    assert.equal(
      invalidLimit.ok,
      false
    );

    if (
      invalidLimit.ok
    ) {
      throw new Error(
        "Invalid limit unexpectedly passed."
      );
    }

    assert.equal(
      invalidLimit.code,
      "INVALID_LIMIT"
    );
  }
);

test(
  "declares Bitcoin transaction capability only",
  () => {
    assert.equal(
      goldRushBitcoinProvider
        .supportsNetwork(
          NETWORK
        ),
      true
    );

    assert.equal(
      goldRushBitcoinProvider
        .supportsCapability(
          "transactions"
        ),
      true
    );

    assert.equal(
      goldRushBitcoinProvider
        .supportsCapability(
          "rpc"
        ),
      false
    );
  }
);

test(
  "retries one transient GoldRush history failure",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalKey =
      process.env
        .GOLDRUSH_API_KEY;

    process.env
      .GOLDRUSH_API_KEY =
        "test-key";

    let calls = 0;

    globalThis.fetch =
      (async () => {
        calls += 1;

        if (calls === 1) {
          throw new Error(
            "Transient provider failure."
          );
        }

        return new Response(
          JSON.stringify({
            error: false,

            data: {
              items: [
                {
                  tx_hash:
                    "f".repeat(
                      64
                    ),

                  block_height:
                    965000,

                  block_signed_at:
                    "2026-09-03T10:00:00Z",
                },
              ],

              pagination: {
                has_more:
                  false,

                page_number:
                  0,
              },
            },
          }),

          {
            status: 200,

            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );
      }) as typeof fetch;

    try {
      const result =
        await goldRushBitcoinProvider
          .getAddressTransactions({
            network:
              NETWORK,

            address:
              "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",

            limit:
              5,
          });

      if (!result.ok) {
        throw new Error(
          result.error
        );
      }

      assert.equal(
        calls,
        2
      );

      assert.equal(
        result.data
          .transactions.length,
        1
      );

      assert.equal(
        result.data
          .transactions[0]
          ?.transactionHash,
        "f".repeat(64)
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      if (
        originalKey ===
        undefined
      ) {
        delete process.env
          .GOLDRUSH_API_KEY;
      } else {
        process.env
          .GOLDRUSH_API_KEY =
            originalKey;
      }
    }
  }
);
