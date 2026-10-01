import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeAlgorandAddress,
} from "./address";

test(
  "normalizes Algorand address shape",
  () => {
    const address =
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

    assert.equal(
      normalizeAlgorandAddress(
        address
      ),
      address
    );
  }
);

test(
  "rejects malformed Algorand address shape",
  () => {
    assert.equal(
      normalizeAlgorandAddress(
        "not-an-algorand-address"
      ),
      null
    );
  }
);
