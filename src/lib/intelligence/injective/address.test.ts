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
