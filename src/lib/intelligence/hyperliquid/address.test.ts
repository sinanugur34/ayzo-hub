import assert from "node:assert/strict";
import test from "node:test";

import {
  isHyperliquidAddress,
  normalizeHyperliquidAddress,
} from "./address";

test(
  "accepts canonical Hyperliquid user addresses",
  () => {
    const mixed =
      "0x1234567890ABCDEF1234567890abcdef12345678";

    assert.equal(
      isHyperliquidAddress(
        mixed
      ),
      true
    );

    assert.equal(
      normalizeHyperliquidAddress(
        mixed
      ),
      mixed.toLowerCase()
    );
  }
);

test(
  "rejects malformed Hyperliquid addresses",
  () => {
    assert.equal(
      isHyperliquidAddress(
        "0x1234"
      ),
      false
    );

    assert.equal(
      isHyperliquidAddress(
        "not-an-address"
      ),
      false
    );
  }
);
