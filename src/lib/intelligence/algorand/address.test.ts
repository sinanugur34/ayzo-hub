import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeAlgorandAddress,
} from "./address";

const ZERO_ADDRESS =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

test(
  "accepts checksum-valid Algorand address",
  () => {
    assert.equal(
      normalizeAlgorandAddress(
        ZERO_ADDRESS
      ),
      ZERO_ADDRESS
    );
  }
);

test(
  "normalizes lowercase Algorand representation",
  () => {
    assert.equal(
      normalizeAlgorandAddress(
        ZERO_ADDRESS.toLowerCase()
      ),
      ZERO_ADDRESS
    );
  }
);

test(
  "rejects Algorand checksum mutation",
  () => {
    const mutated =
      ZERO_ADDRESS.slice(
        0,
        -1
      ) +
      "A";

    assert.equal(
      normalizeAlgorandAddress(
        mutated
      ),
      null
    );
  }
);

test(
  "rejects malformed Algorand address",
  () => {
    assert.equal(
      normalizeAlgorandAddress(
        "not-an-algorand-address"
      ),
      null
    );

    assert.equal(
      normalizeAlgorandAddress(
        "A".repeat(58)
      ),
      null
    );
  }
);
