import assert from "node:assert/strict";
import test from "node:test";

import {
  BlockCypherDogecoinProvider,
} from "./blockcypher";

const NETWORK = {
  networkId: "dogecoin",
  name: "Dogecoin",
  nativeCurrency: "DOGE",
} as const;

const ADDRESS =
  "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L";

function hash(
  character: string
): string {
  return character.repeat(64);
}

test(
  "normalizes bounded BlockCypher Dogecoin history",
  async () => {
    const originalFetch =
      globalThis.fetch;

    globalThis.fetch = (
      async () =>
        new Response(
          JSON.stringify({
            address:
              ADDRESS,

            n_tx:
              1483,

            txrefs: [
              {
                tx_hash:
                  hash("a"),

                block_height:
                  6000000,

                confirmed:
                  "2026-09-10T07:00:00Z",
              },
              {
                tx_hash:
                  hash("b"),

                block_height:
                  6000001,

                confirmed:
                  "2026-09-10T07:01:00Z",
              },
            ],
          }),
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
        new BlockCypherDogecoinProvider();

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
        result.providerId,
        "blockcypher"
      );

      assert.equal(
        result.data
          .transactions
          .length,
        2
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
        6000000
      );

      assert.equal(
        result.data
          .transactions[0]
          ?.timestamp,
        "2026-09-10T07:00:00.000Z"
      );

      assert.equal(
        result.data
          .nextCursor,
        null
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "maps BlockCypher rate limiting to RATE_LIMITED",
  async () => {
    const originalFetch =
      globalThis.fetch;

    globalThis.fetch = (
      async () =>
        new Response(
          JSON.stringify({
            error:
              "Rate limit exceeded",
          }),
          {
            status:
              429,
          }
        )
    ) as typeof fetch;

    try {
      const provider =
        new BlockCypherDogecoinProvider();

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
        result.code,
        "RATE_LIMITED"
      );

      assert.equal(
        result.providerId,
        "blockcypher"
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "rejects invalid cursor before fetch",
  async () => {
    const originalFetch =
      globalThis.fetch;

    let fetchCalls =
      0;

    globalThis.fetch = (
      async () => {
        fetchCalls += 1;

        return new Response(
          "{}",
          {
            status:
              200,
          }
        );
      }
    ) as typeof fetch;

    try {
      const provider =
        new BlockCypherDogecoinProvider();

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
              "1",
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
  "fails closed on malformed BlockCypher transaction evidence",
  async () => {
    const originalFetch =
      globalThis.fetch;

    globalThis.fetch = (
      async () =>
        new Response(
          JSON.stringify({
            address:
              ADDRESS,

            txrefs: [
              {
                tx_hash:
                  "not-a-hash",

                block_height:
                  6000000,

                confirmed:
                  "2026-09-10T07:00:00Z",
              },
            ],
          }),
          {
            status:
              200,
          }
        )
    ) as typeof fetch;

    try {
      const provider =
        new BlockCypherDogecoinProvider();

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
  "rejects invalid Dogecoin address before fetch",
  async () => {
    const originalFetch =
      globalThis.fetch;

    let fetchCalls =
      0;

    globalThis.fetch = (
      async () => {
        fetchCalls += 1;

        return new Response(
          "{}",
          {
            status:
              200,
          }
        );
      }
    ) as typeof fetch;

    try {
      const provider =
        new BlockCypherDogecoinProvider();

      const result =
        await provider
          .getAddressTransactions({
            network:
              NETWORK,

            address:
              "invalid-doge-address",

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
