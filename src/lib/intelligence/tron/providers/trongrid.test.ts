import assert from "node:assert/strict";
import test from "node:test";

import {
  TronGridProvider,
} from "./trongrid";

const NETWORK = {
  networkId: "tron",
  name: "TRON",
  nativeCurrency: "TRX",
} as const;

const ADDRESS =
  "TJRabPrwbZy45sbavfcjinPJC18kjpRTv8";

const HASH_A =
  "a".repeat(64);

const HASH_B =
  "b".repeat(64);

function restoreKey(
  original:
    string | undefined
) {
  if (
    original ===
    undefined
  ) {
    delete process.env
      .TRONGRID_API_KEY;
  } else {
    process.env
      .TRONGRID_API_KEY =
        original;
  }
}

test(
  "parses bounded confirmed TronGrid mainnet history",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalKey =
      process.env
        .TRONGRID_API_KEY;

    process.env
      .TRONGRID_API_KEY =
        "test-trongrid-key";

    let requestedUrl =
      "";

    let apiKeyHeader:
      string | null =
        null;

    globalThis.fetch =
      (async (
        input,
        init
      ) => {
        requestedUrl =
          String(input);

        apiKeyHeader =
          new Headers(
            init?.headers
          ).get(
            "TRON-PRO-API-KEY"
          );

        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                txID:
                  HASH_A,
                blockNumber:
                  70000000,
                block_timestamp:
                  1700000000000,
              },
              {
                txID:
                  HASH_B
                    .toUpperCase(),
                blockNumber:
                  70000001,
                block_timestamp:
                  1700000001000,
              },
            ],
            meta: {
              fingerprint:
                "next-page-fingerprint",
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
      const provider =
        new TronGridProvider();

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
              "current-fingerprint",
          });

      assert.equal(
        result.ok,
        true
      );

      if (!result.ok) {
        assert.fail(
          "TronGrid history unexpectedly failed."
        );
      }

      assert.equal(
        result.providerId,
        "trongrid"
      );

      assert.equal(
        result.data
          .transactions
          .length,
        2
      );

      assert.equal(
        result.data
          .transactions[1]
          ?.transactionHash,
        HASH_B
      );

      assert.equal(
        result.data
          .transactions[0]
          ?.blockHeight,
        70000000
      );

      assert.equal(
        result.data
          .transactions[0]
          ?.timestamp,
        new Date(
          1700000000000
        ).toISOString()
      );

      assert.equal(
        result.data
          .transactions[0]
          ?.confirmed,
        true
      );

      assert.equal(
        result.data
          .nextCursor,
        "next-page-fingerprint"
      );

      const url =
        new URL(
          requestedUrl
        );

      assert.equal(
        url.origin,
        "https://api.trongrid.io"
      );

      assert.equal(
        url.pathname,
        `/v1/accounts/${ADDRESS}/transactions`
      );

      assert.equal(
        url.searchParams
          .get("limit"),
        "5"
      );

      assert.equal(
        url.searchParams
          .get(
            "only_confirmed"
          ),
        "true"
      );

      assert.equal(
        url.searchParams
          .get("order_by"),
        "block_timestamp,desc"
      );

      assert.equal(
        url.searchParams
          .get("fingerprint"),
        "current-fingerprint"
      );

      assert.equal(
        apiKeyHeader,
        "test-trongrid-key"
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      restoreKey(
        originalKey
      );
    }
  }
);

test(
  "rejects invalid TRON address before fetch",
  async () => {
    const originalFetch =
      globalThis.fetch;

    let calls =
      0;

    globalThis.fetch =
      (async () => {
        calls += 1;

        throw new Error(
          "fetch must not run"
        );
      }) as typeof fetch;

    try {
      const provider =
        new TronGridProvider();

      const result =
        await provider
          .getAddressTransactions({
            network:
              NETWORK,
            address:
              "not-tron",
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
  "rejects unbounded TRON history limit before fetch",
  async () => {
    const originalFetch =
      globalThis.fetch;

    let calls =
      0;

    globalThis.fetch =
      (async () => {
        calls += 1;

        throw new Error(
          "fetch must not run"
        );
      }) as typeof fetch;

    try {
      const provider =
        new TronGridProvider();

      const result =
        await provider
          .getAddressTransactions({
            network:
              NETWORK,
            address:
              ADDRESS,
            limit:
              26,
          });

      assert.equal(
        result.ok,
        false
      );

      if (!result.ok) {
        assert.equal(
          result.code,
          "INVALID_LIMIT"
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
  "fails closed when TRONGRID_API_KEY is missing",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalKey =
      process.env
        .TRONGRID_API_KEY;

    delete process.env
      .TRONGRID_API_KEY;

    let calls =
      0;

    globalThis.fetch =
      (async () => {
        calls += 1;

        throw new Error(
          "fetch must not run"
        );
      }) as typeof fetch;

    try {
      const provider =
        new TronGridProvider();

      const result =
        await provider
          .getAddressTransactions({
            network:
              NETWORK,
            address:
              ADDRESS,
          });

      assert.equal(
        result.ok,
        false
      );

      if (!result.ok) {
        assert.equal(
          result.code,
          "UPSTREAM_ERROR"
        );
      }

      assert.equal(
        calls,
        0
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      restoreKey(
        originalKey
      );
    }
  }
);

test(
  "maps TronGrid HTTP 429 to RATE_LIMITED",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalKey =
      process.env
        .TRONGRID_API_KEY;

    process.env
      .TRONGRID_API_KEY =
        "test-trongrid-key";

    globalThis.fetch =
      (async () =>
        new Response(
          "{}",
          {
            status: 429,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        )) as typeof fetch;

    try {
      const provider =
        new TronGridProvider();

      const result =
        await provider
          .getAddressTransactions({
            network:
              NETWORK,
            address:
              ADDRESS,
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

      restoreKey(
        originalKey
      );
    }
  }
);
