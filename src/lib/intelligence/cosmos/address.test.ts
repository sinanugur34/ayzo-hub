import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeCosmosAddress,
} from "./address";

test(
  "Cosmos validator rejects malformed and wrong-prefix inputs",
  () => {
    assert.equal(
      normalizeCosmosAddress(
        ""
      ),
      null
    );

    assert.equal(
      normalizeCosmosAddress(
        "inj1invalid"
      ),
      null
    );

    assert.equal(
      normalizeCosmosAddress(
        "cosmos1invalid"
      ),
      null
    );
  }
);
