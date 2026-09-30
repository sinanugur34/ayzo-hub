import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "./route";

test(
  "rejects unauthenticated internal Sui request",
  async () => {
    const original =
      process.env.AYZO_INTERNAL_API_KEY;

    process.env.AYZO_INTERNAL_API_KEY =
      "ltc-test-key";

    try {
      const response =
        await POST(
          new Request(
            "http://localhost/api/internal/sui/intelligence",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                address:
                  "0x1111111111111111111111111111111111111111111111111111111111111111",
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
  "rejects invalid Sui address in smoke mode",
  async () => {
    const response =
      await POST(
        new Request(
          "http://localhost/api/internal/sui/intelligence",
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
                "not-sui",
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
      "sui"
    );
  }
);
