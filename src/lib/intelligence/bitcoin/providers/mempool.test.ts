import assert from "node:assert/strict";
import test from "node:test";

import {
  MempoolBitcoinProvider,
} from "./mempool";

const NETWORK = {
  networkId: "bitcoin",
  name: "Bitcoin",
  nativeCurrency: "BTC",
} as const;

const ADDRESS =
  "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo";

function hash(
  character: string
): string {
  return character.repeat(64);
}

test(
  "normalizes bounded Mempool Bitcoin history",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const txs = [
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ].map(
      (character, index) => ({
        txid:
          hash(character),

        status: {
          confirmed:
            true,

          block_height:
            900000 + index,

          block_time:
            1750000000 + index,
        },
      })
    );

    globalThis.fetch = (
      async () =>
        new Response(
          JSON.stringify(
            txs
          ),
          {
            status:
              200,

            headers: {
              "content-type":
                "application/json",
            },
          }
        )
    ) as typeof fetch;

    try {
      const provider =
        new MempoolBitcoinProvider();

      const result =
        await provider
          .getAddressTransactions({
            network:
              NETWORK,

            address:
              ADDRESS,

            limit:
              5,
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
        result.providerId,
        "mempool"
      );

      assert.equal(
        result.data
          .transactions
          .length,
        5
      );

      assert.equal(
        result.data
          .transactions[0]
          ?.transactionHash,
        hash("a")
      );

      assert.equal(
        result.data
          .transactions[0]
          ?.blockHeight,
        900000
      );

      assert.equal(
        typeof result.data
          .transactions[0]
          ?.timestamp,
        "string"
      );

      assert.equal(
        result.data
          .nextCursor,
        hash("e")
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "maps Mempool rate limiting to RATE_LIMITED",
  async () => {
    const originalFetch =
      globalThis.fetch;

    globalThis.fetch = (
      async () =>
        new Response(
          JSON.stringify({
            error:
              "Too many requests",
          }),
          {
            status:
              429,

            headers: {
              "content-type":
                "application/json",
            },
          }
        )
    ) as typeof fetch;

    try {
      const provider =
        new MempoolBitcoinProvider();

      const result =
        await provider
          .getAddressTransactions({
            network:
              NETWORK,

            address:
              ADDRESS,

            limit:
              5,
          });

      assert.equal(
        result.ok,
        false
      );

      if (result.ok) {
        throw new Error(
          "Rate limited request unexpectedly succeeded."
        );
      }

      assert.equal(
        result.providerId,
        "mempool"
      );

      assert.equal(
        result.code,
        "RATE_LIMITED"
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "rejects invalid cursor before provider request",
  async () => {
    const originalFetch =
      globalThis.fetch;

    let fetchCalls =
      0;

    globalThis.fetch = (
      async () => {
        fetchCalls += 1;

        return new Response(
          "[]",
          {
            status:
              200,
          }
        );
      }
    ) as typeof fetch;

    try {
      const provider =
        new MempoolBitcoinProvider();

      const result =
        await provider
          .getAddressTransactions({
            network:
              NETWORK,

            address:
              ADDRESS,

            limit:
              5,

            cursor:
              "not-a-transaction-hash",
          });

      assert.equal(
        result.ok,
        false
      );

      if (result.ok) {
        throw new Error(
          "Invalid cursor unexpectedly succeeded."
        );
      }

      assert.equal(
        result.code,
        "INVALID_CURSOR"
      );

      assert.equal(
        fetchCalls,
        0
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "fails closed on malformed Mempool response",
  async () => {
    const originalFetch =
      globalThis.fetch;

    globalThis.fetch = (
      async () =>
        new Response(
          JSON.stringify([
            {
              txid:
                "not-a-hash",

              status: {
                confirmed:
                  true,

                block_height:
                  900000,

                block_time:
                  1750000000,
              },
            },
          ]),
          {
            status:
              200,

            headers: {
              "content-type":
                "application/json",
            },
          }
        )
    ) as typeof fetch;

    try {
      const provider =
        new MempoolBitcoinProvider();

      const result =
        await provider
          .getAddressTransactions({
            network:
              NETWORK,

            address:
              ADDRESS,

            limit:
              5,
          });

      assert.equal(
        result.ok,
        false
      );

      if (result.ok) {
        throw new Error(
          "Malformed response unexpectedly succeeded."
        );
      }

      assert.equal(
        result.code,
        "UPSTREAM_ERROR"
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "rejects invalid Bitcoin address before fetch",
  async () => {
    const originalFetch =
      globalThis.fetch;

    let fetchCalls =
      0;

    globalThis.fetch = (
      async () => {
        fetchCalls += 1;

        return new Response(
          "[]",
          {
            status:
              200,
          }
        );
      }
    ) as typeof fetch;

    try {
      const provider =
        new MempoolBitcoinProvider();

      const result =
        await provider
          .getAddressTransactions({
            network:
              NETWORK,

            address:
              "invalid-bitcoin-address",

            limit:
              5,
          });

      assert.equal(
        result.ok,
        false
      );

      if (result.ok) {
        throw new Error(
          "Invalid address unexpectedly succeeded."
        );
      }

      assert.equal(
        result.code,
        "INVALID_ADDRESS"
      );

      assert.equal(
        fetchCalls,
        0
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);
