import assert from "node:assert/strict";
import test from "node:test";

import {
  isHederaAccountId,
  normalizeHederaAccountId,
} from "./address";

test(
  "normalizes canonical Hedera account IDs",
  () => {
    assert.equal(
      normalizeHederaAccountId(
        "  0.0.1000  "
      ),
      "0.0.1000"
    );

    assert.equal(
      normalizeHederaAccountId(
        "000.00.001000"
      ),
      "0.0.1000"
    );

    assert.equal(
      isHederaAccountId(
        "1.2.3"
      ),
      true
    );
  }
);

test(
  "rejects malformed or unsupported Hedera identifiers",
  () => {
    for (
      const value of [
        "",
        "1000",
        "0.1000",
        "0.0.-1",
        "0.0.1.2",
        "0x1111111111111111111111111111111111111111",
        "alias",
        `0.0.${(
          18_446_744_073_709_551_615n +
          1n
        ).toString()}`,
      ]
    ) {
      assert.equal(
        isHederaAccountId(
          value
        ),
        false,
        value
      );
    }
  }
);
