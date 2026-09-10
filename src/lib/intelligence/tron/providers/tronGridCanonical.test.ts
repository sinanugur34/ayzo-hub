import assert from "node:assert/strict";
import test from "node:test";

import {
  TronGridCanonicalProvider,
} from "./tronGridCanonical";

const NETWORK = {
  networkId: "tron",
  name: "TRON",
  nativeCurrency: "TRX",
} as const;

const HASH =
  "a".repeat(64);

const OTHER_HASH =
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
  "combines solidified TRON transaction body and receipt",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalKey =
      process.env
        .TRONGRID_API_KEY;

    process.env
      .TRONGRID_API_KEY =
        "test-trongrid-key";

    const paths:
      string[] = [];

    globalThis.fetch =
      (async (
        input,
        init
      ) => {
        const url =
          new URL(
            String(input)
          );

        paths.push(
          url.pathname
        );

        assert.equal(
          new Headers(
            init?.headers
          ).get(
            "TRON-PRO-API-KEY"
          ),
          "test-trongrid-key"
        );

        assert.equal(
          JSON.parse(
            String(
              init?.body
            )
          ).value,
          HASH
        );

        if (
          url.pathname ===
          "/walletsolidity/gettransactionbyid"
        ) {
          return new Response(
            JSON.stringify({
              txID:
                HASH.toUpperCase(),

              ret: [
                {
                  contractRet:
                    "SUCCESS",
                },
              ],

              raw_data: {
                timestamp:
                  1700000000000,

                contract: [
                  {
                    type:
                      "TransferContract",

                    parameter: {
                      value: {
                        owner_address:
                          "41" +
                          "1".repeat(
                            40
                          ),

                        to_address:
                          "41" +
                          "2".repeat(
                            40
                          ),

                        amount:
                          1250000,
                      },
                    },
                  },
                ],
              },

              raw_data_hex:
                "aabbccdd",

              signature: [
                "signature-one",
              ],
            }),
            {
              status: 200,
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );
        }

        return new Response(
          JSON.stringify({
            id:
              HASH,

            blockNumber:
              70000000,

            blockTimeStamp:
              1700000001000,

            fee:
              1000,

            receipt: {
              result:
                "SUCCESS",

              energy_usage:
                10,

              energy_usage_total:
                20,

              energy_fee:
                30,

              net_usage:
                40,

              net_fee:
                50,
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
        new TronGridCanonicalProvider();

      const result =
        await provider
          .getTransactionEvidence({
            network:
              NETWORK,

            transactionHash:
              HASH,
          });

      assert.equal(
        result.ok,
        true
      );

      if (!result.ok) {
        assert.fail(
          "Canonical TRON evidence unexpectedly failed."
        );
      }

      assert.deepEqual(
        paths,
        [
          "/walletsolidity/gettransactionbyid",
          "/walletsolidity/gettransactioninfobyid",
        ]
      );

      assert.equal(
        result.data
          .transactionHash,
        HASH
      );

      assert.equal(
        result.data
          .confirmed,
        true
      );

      assert.equal(
        result.data
          .blockHeight,
        70000000
      );

      assert.equal(
        result.data
          .executionResult,
        "SUCCESS"
      );

      assert.equal(
        result.data
          .feeSun,
        "1000"
      );

      assert.equal(
        result.data
          .energyUsageTotal,
        20
      );

      assert.equal(
        result.data
          .contract
          ?.type,
        "TransferContract"
      );

      assert.equal(
        result.data
          .contract
          ?.amountSun,
        "1250000"
      );

      assert.equal(
        result.data
          .signatureCount,
        1
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
  "rejects invalid TRON transaction hash before fetch",
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
        new TronGridCanonicalProvider();

      const result =
        await provider
          .getTransactionEvidence({
            network:
              NETWORK,
            transactionHash:
              "not-a-hash",
          });

      assert.equal(
        result.ok,
        false
      );

      if (!result.ok) {
        assert.equal(
          result.code,
          "INVALID_TRANSACTION_HASH"
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
        new TronGridCanonicalProvider();

      const result =
        await provider
          .getTransactionEvidence({
            network:
              NETWORK,
            transactionHash:
              HASH,
          });

      assert.equal(
        result.ok,
        false
      );

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
  "rejects canonical transaction hash mismatch",
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
      (async input => {
        const url =
          new URL(
            String(input)
          );

        return new Response(
          JSON.stringify(
            url.pathname.endsWith(
              "gettransactionbyid"
            )
              ? {
                  txID:
                    OTHER_HASH,
                  raw_data: {},
                }
              : {
                  id:
                    HASH,
                  receipt: {},
                }
          ),
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
        new TronGridCanonicalProvider();

      const result =
        await provider
          .getTransactionEvidence({
            network:
              NETWORK,
            transactionHash:
              HASH,
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
  "maps canonical HTTP 429 to RATE_LIMITED",
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
        new TronGridCanonicalProvider();

      const result =
        await provider
          .getTransactionEvidence({
            network:
              NETWORK,
            transactionHash:
              HASH,
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

