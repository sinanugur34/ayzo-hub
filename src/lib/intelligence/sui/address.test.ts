import assert from "node:assert/strict";
import test from "node:test";

import {
  isSuiAddress,
  normalizeSuiAddress,
} from "./address";

test(
  "accepts canonical and shortened Sui addresses",
  () => {
    assert.equal(
      isSuiAddress(
        `0x${"11".repeat(32)}`
      ),
      true
    );

    assert.equal(
      isSuiAddress(
        "0x2"
      ),
      true
    );
  }
);

test(
  "normalizes Sui addresses to 32 bytes",
  () => {
    assert.equal(
      normalizeSuiAddress(
        "0x2"
      ),
      `0x${"0".repeat(63)}2`
    );
  }
);

test(
  "rejects malformed Sui addresses",
  () => {
    assert.equal(
      isSuiAddress(
        "0x"
      ),
      false
    );

    assert.equal(
      isSuiAddress(
        `0x${"1".repeat(65)}`
      ),
      false
    );

    assert.equal(
      isSuiAddress(
        "not-sui"
      ),
      false
    );
  }
);
