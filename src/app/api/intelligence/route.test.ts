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


test(
  "rejects invalid BNB and Arbitrum addresses on the public route",
  async () => {
    for (
      const network of [
        "bnb",
        "arbitrum",
      ] as const
    ) {
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
                  network,
                  address:
                    "0x123",
                }),
            }
          )
        );

      assert.equal(
        response.status,
        400
      );

      const data =
        await response.json();

      assert.equal(
        data.ok,
        false
      );

      assert.equal(
        data.code,
        "INVALID_ADDRESS"
      );

      assert.equal(
        data.network,
        network
      );
    }
  }
);
