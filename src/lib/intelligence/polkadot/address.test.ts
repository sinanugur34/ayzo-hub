import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizePolkadotAddress,
} from "./address";

test(
  "Polkadot foundation fails closed for malformed addresses",
  () => {
    assert.equal(
      normalizePolkadotAddress(
        ""
      ),
      null
    );

    assert.equal(
      normalizePolkadotAddress(
        "cosmos1deadbeef"
      ),
      null
    );

    assert.equal(
      normalizePolkadotAddress(
        "5FHneW46xGXgs5mUiveU4sbTyGBzmst1YyX8Z9cZLZ1A9M"
      ),
      null
    );
  }
);

test(
  "Polkadot foundation preserves canonical-looking network-1 shape",
  () => {
    const address =
      "13V9z4eW2FQ7xJYq5oQkK1bW2z6X8nM3vT7sP9rL5cD1fG2";

    assert.equal(
      normalizePolkadotAddress(
        ` ${address} `
      ),
      address
    );
  }
);
