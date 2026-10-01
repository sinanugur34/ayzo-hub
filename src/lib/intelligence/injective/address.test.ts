import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeInjectiveAddress,
} from "./address";

test(
  "Injective validator rejects malformed and wrong-prefix inputs",
  () => {
    assert.equal(
      normalizeInjectiveAddress(
        ""
      ),
      null
    );

    assert.equal(
      normalizeInjectiveAddress(
        "cosmos1invalid"
      ),
      null
    );

    assert.equal(
      normalizeInjectiveAddress(
        "inj1invalid"
      ),
      null
    );
  }
);

test(
  "accepts checksum-valid Injective mainnet account",
  () => {
    const value =
      "inj17vytdwqczqz72j65saukplrktd4gyfme5agf6c";

    assert.equal(
      normalizeInjectiveAddress(
        value
      ),
      value
    );
  }
);
