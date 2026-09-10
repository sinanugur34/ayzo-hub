import assert from "node:assert/strict";
import test from "node:test";

import {
  POST,
} from "./route";

const ADDRESS =
  "TJRabPrwbZy45sbavfcjinPJC18kjpRTv8";

const HASH =
  "a".repeat(64);

function smokeRequest(
  address: string
) {
  return new Request(
    "http://localhost/api/internal/tron/intelligence",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "x-ayzo-test-request":
          "smoke",
      },

      body:
        JSON.stringify({
          address,
        }),
    }
  );
}

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
  "rejects invalid TRON address before provider work",
  async () => {
    const originalFetch =
      globalThis.fetch;

    let calls = 0;

    globalThis.fetch =
      (async () => {
        calls += 1;

        throw new Error(
          "fetch must not run"
        );
      }) as typeof fetch;

    try {
      const response =
        await POST(
          smokeRequest(
            "not-tron"
          )
        );

      assert.equal(
        response.status,
        400
      );

      const body =
        await response.json();

      assert.equal(
        body.ok,
        false
      );

      assert.equal(
        body.code,
        "INVALID_ADDRESS"
      );

      assert.equal(
        body.network,
        "tron"
      );

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
  "returns bounded TRON intelligence through development smoke route",
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
      (async input => {
        const url =
          new URL(
            String(input)
          );

        paths.push(
          url.pathname
        );

        if (
          url.pathname ===
          `/v1/accounts/${ADDRESS}/transactions`
        ) {
          return new Response(
            JSON.stringify({
              success: true,

              data: [
                {
                  txID:
                    HASH,

                  blockNumber:
                    70000000,

                  block_timestamp:
                    1700000000000,
                },
              ],

              meta: {},
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

        if (
          url.pathname ===
          "/walletsolidity/gettransactionbyid"
        ) {
          return new Response(
            JSON.stringify({
              txID:
                HASH,

              ret: [
                {
                  contractRet:
                    "SUCCESS",
                },
              ],

              raw_data: {
                timestamp:
                  1700000000000,

                contract: [],
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

        if (
          url.pathname ===
          "/walletsolidity/gettransactioninfobyid"
        ) {
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
                  0,

                energy_usage_total:
                  0,

                energy_fee:
                  0,

                net_usage:
                  250,

                net_fee:
                  0,
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
        }

        return new Response(
          "{}",
          {
            status: 500,

            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );
      }) as typeof fetch;

    try {
      const response =
        await POST(
          smokeRequest(
            ADDRESS
          )
        );

      assert.equal(
        response.status,
        200
      );

      const body =
        await response.json();

      assert.equal(
        body.ok,
        true
      );

      assert.equal(
        body.network,
        "tron"
      );

      assert.equal(
        body.coverage,
        "partial"
      );

      assert.equal(
        body.history
          .transactions
          .length,
        1
      );

      assert.equal(
        body.canonicalTransaction
          .transactionHash,
        HASH
      );

      assert.deepEqual(
        paths,
        [
          `/v1/accounts/${ADDRESS}/transactions`,
          "/walletsolidity/gettransactionbyid",
          "/walletsolidity/gettransactioninfobyid",
        ]
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
