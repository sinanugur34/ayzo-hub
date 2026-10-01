import assert from "node:assert/strict";
import test from "node:test";

import {
  isZcashShieldedOrUnifiedAddress,
  normalizeZcashTransparentAddress,
} from "./address";

test(
  "accepts transparent Zcash mainnet address shape",
  () => {
    const address =
      "t1Z7U8gYQpJ7A7xQYk7JgqvLqPjTvV7hFxx";

    assert.equal(
      normalizeZcashTransparentAddress(
        address
      ),
      address
    );
  }
);

test(
  "does not treat shielded or unified addresses as transparent",
  () => {
    assert.equal(
      normalizeZcashTransparentAddress(
        "zs1qqqqqqqqqqqqqqqqqqqqqq"
      ),
      null
    );

    assert.equal(
      isZcashShieldedOrUnifiedAddress(
        "zs1qqqqqqqqqqqqqqqqqqqqqq"
      ),
      true
    );

    assert.equal(
      isZcashShieldedOrUnifiedAddress(
        "u1qqqqqqqqqqqqqqqqqqqqqq"
      ),
      true
    );
  }
);
