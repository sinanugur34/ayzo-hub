import assert from "node:assert/strict";
import test from "node:test";

import {
  POST,
} from "./route";

test(
  "requires internal authentication outside smoke requests",
  async () => {
    const originalKey =
      process.env
        .AYZO_INTERNAL_API_KEY;

    process.env
      .AYZO_INTERNAL_API_KEY =
      "bitcoin-internal-test-key";

    try {
      const response =
        await POST(
          new Request(
            "http://localhost/api/internal/bitcoin/intelligence",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  address:
                    "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",
                }),
            }
          )
        );

      assert.equal(
        response.status,
        403
      );

      assert.deepEqual(
        await response.json(),
        {
          ok:
            false,

          error:
            "Forbidden.",
        }
      );
    } finally {
      if (
        originalKey ===
        undefined
      ) {
        delete process.env
          .AYZO_INTERNAL_API_KEY;
      } else {
        process.env
          .AYZO_INTERNAL_API_KEY =
          originalKey;
      }
    }
  }
);

test(
  "rejects invalid Bitcoin address before provider work",
  async () => {
    const response =
      await POST(
        new Request(
          "http://localhost/api/internal/bitcoin/intelligence",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-ayzo-test-request":
                "smoke",
            },

            body:
              JSON.stringify({
                address:
                  "not-bitcoin",
              }),
          }
        )
      );

    assert.equal(
      response.status,
      400
    );

    assert.deepEqual(
      await response.json(),
      {
        ok:
          false,

        code:
          "INVALID_ADDRESS",

        error:
          "Invalid Bitcoin address.",

        network:
          "bitcoin",
      }
    );
  }
);
