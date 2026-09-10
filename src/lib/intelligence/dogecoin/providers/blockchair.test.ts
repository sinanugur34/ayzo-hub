import assert from "node:assert/strict";
import test from "node:test";

import {
  BlockchairDogecoinProvider,
} from "./blockchair";

const NETWORK = {
  networkId: "dogecoin",
  name: "Dogecoin",
  nativeCurrency: "DOGE",
} as const;

const ADDRESS =
  "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L";

const HASH_A =
  "a".repeat(64);

const HASH_B =
  "b".repeat(64);

test(
  "parses bounded Blockchair Dogecoin history",
  async () => {
    const originalFetch =
      globalThis.fetch;

    let requestedUrl =
      "";

    globalThis.fetch =
      async input => {
        requestedUrl =
          String(input);

        return new Response(
          JSON.stringify({
            data: {
              [ADDRESS]: {
                transactions: [
                  HASH_A,
                  HASH_B.toUpperCase(),
                ],
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
      };

    try {
      const provider =
        new BlockchairDogecoinProvider();

      const result =
        await provider
          .getAddressTransactions({
            network: NETWORK,
            address: ADDRESS,
            limit: 5,
          });

      assert.equal(
        result.ok,
        true
      );

      if (!result.ok) {
        assert.fail(
          "Blockchair history unexpectedly failed."
        );
      }

      assert.equal(
        result.data
          .transactions.length,
        2
      );

      assert.equal(
        result.data
          .transactions[1]
          ?.transactionHash,
        HASH_B
      );

      const url =
        new URL(
          requestedUrl
        );

      assert.equal(
        url.searchParams
          .get("limit"),
        "5,0"
      );

      assert.equal(
        url.searchParams
          .get("state"),
        "latest"
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "rejects invalid Dogecoin address before fetch",
  async () => {
    const originalFetch =
      globalThis.fetch;

    let calls = 0;

    globalThis.fetch =
      async () => {
        calls += 1;

        throw new Error(
          "fetch must not run"
        );
      };

    try {
      const provider =
        new BlockchairDogecoinProvider();

      const result =
        await provider
          .getAddressTransactions({
            network: NETWORK,
            address:
              "not-dogecoin",
          });

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
        calls,
        0
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "maps Blockchair HTTP 429 to RATE_LIMITED",
  async () => {
    const originalFetch =
      globalThis.fetch;

    globalThis.fetch =
      async () =>
        new Response(
          "{}",
          {
            status: 429,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );

    try {
      const provider =
        new BlockchairDogecoinProvider();

      const result =
        await provider
          .getAddressTransactions({
            network: NETWORK,
            address: ADDRESS,
            limit: 5,
          });

      assert.equal(
        result.ok,
        false
      );

      if (!result.ok) {
        assert.equal(
          result.code,
          "RATE_LIMITED"
        );
      }
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);
