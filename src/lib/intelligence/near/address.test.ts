import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyNearAccountId,
  isNearAccountId,
  normalizeNearAccountId,
} from "./address";

test(
  "accepts native NEAR account identifier families",
  () => {
    assert.equal(
      normalizeNearAccountId(
        "  alice.near  "
      ),
      "alice.near"
    );

    assert.equal(
      classifyNearAccountId(
        "app.alice.near"
      ),
      "named"
    );

    assert.equal(
      classifyNearAccountId(
        "a-b_c.near"
      ),
      "named"
    );

    assert.equal(
      classifyNearAccountId(
        "11".repeat(32)
      ),
      "implicit"
    );

    assert.equal(
      classifyNearAccountId(
        `0x${"11".repeat(20)}`
      ),
      "eth-implicit"
    );

    assert.equal(
      classifyNearAccountId(
        `0s${"11".repeat(20)}`
      ),
      "near-deterministic"
    );
  }
);

test(
  "rejects malformed NEAR account identifiers",
  () => {
    for (
      const value of [
        "",
        "a",
        "Alice.near",
        ".alice.near",
        "alice.near.",
        "alice..near",
        "alice.-near",
        "alice_.near",
        "alice+near",
        "x".repeat(65),
        `0x${"GG".repeat(20)}`,
      ]
    ) {
      assert.equal(
        isNearAccountId(
          value
        ),
        false,
        value
      );
    }
  }
);
