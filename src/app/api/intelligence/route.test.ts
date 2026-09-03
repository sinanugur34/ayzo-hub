import assert from "node:assert/strict";
import test from "node:test";

import {
  POST,
} from "./route";

test(
  "rejects an invalid Base address on the public route",
  async () => {
    const response =
      await POST(
        new Request(
          "http://localhost/api/intelligence",
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
                network:
                  "base",
                address:
                  "invalid",
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
          "Invalid EVM address.",
        network:
          "base",
      }
    );
  }
);
