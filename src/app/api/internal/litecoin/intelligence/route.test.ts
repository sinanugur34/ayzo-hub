import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "./route";

test(
  "rejects unauthenticated internal Litecoin request",
  async () => {
    const original =
      process.env.AYZO_INTERNAL_API_KEY;

    process.env.AYZO_INTERNAL_API_KEY =
      "ltc-test-key";

    try {
      const response =
        await POST(
          new Request(
            "http://localhost/api/internal/litecoin/intelligence",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                address:
                  "LKDxGDJq5fF4FohAB8zJH24mDDNHDNtqsE",
              }),
            }
          )
        );

      assert.equal(
        response.status,
        403
      );
    } finally {
      if (original === undefined) {
        delete process.env
          .AYZO_INTERNAL_API_KEY;
      } else {
        process.env
          .AYZO_INTERNAL_API_KEY =
          original;
      }
    }
  }
);

test(
  "rejects invalid Litecoin address in smoke mode",
  async () => {
    const response =
      await POST(
        new Request(
          "http://localhost/api/internal/litecoin/intelligence",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              "x-ayzo-test-request":
                "smoke",
            },
            body: JSON.stringify({
              address:
                "not-litecoin",
            }),
          }
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
      "litecoin"
    );
  }
);
