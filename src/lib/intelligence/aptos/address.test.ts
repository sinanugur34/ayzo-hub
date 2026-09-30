import assert from "node:assert/strict";
import test from "node:test";

import {
  isAptosAddress,
  normalizeAptosAddress,
} from "./address";

test(
  "normalizes Aptos addresses to full 32-byte lowercase representation",
  () => {
    assert.equal(
      normalizeAptosAddress(
        "0x1"
      ),
      `0x${"0".repeat(63)}1`
    );

    assert.equal(
      normalizeAptosAddress(
        "  A  "
      ),
      `0x${"0".repeat(63)}a`
    );

    assert.equal(
      isAptosAddress(
        `0x${"11".repeat(32)}`
      ),
      true
    );
  }
);

test(
  "rejects malformed and oversized Aptos addresses",
  () => {
    assert.equal(
      isAptosAddress(
        "0xzz"
      ),
      false
    );

    assert.equal(
      isAptosAddress(
        `0x${"11".repeat(33)}`
      ),
      false
    );

    assert.equal(
      isAptosAddress(
        ""
      ),
      false
    );
  }
);
