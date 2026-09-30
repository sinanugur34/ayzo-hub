import assert from "node:assert/strict";
import test from "node:test";

import {
  isTonAddress,
  normalizeTonAddress,
} from "./address";

const RAW =
  "0:4a81708d2cf7b15a1b362fbf64880451d698461f52f05f145b36c08517d76873";

const FRIENDLY =
  "UQBKgXCNLPexWhs2L79kiARR1phGH1LwXxRbNsCFF9doczSI";

test(
  "accepts TON raw mainnet account addresses",
  () => {
    assert.equal(
      isTonAddress(
        RAW
      ),
      true
    );
  }
);

test(
  "accepts checksum-valid TON friendly mainnet addresses",
  () => {
    assert.equal(
      isTonAddress(
        FRIENDLY
      ),
      true
    );

    assert.equal(
      normalizeTonAddress(
        FRIENDLY
      ),
      RAW
    );
  }
);

test(
  "rejects malformed or checksum-invalid TON addresses",
  () => {
    assert.equal(
      isTonAddress(
        "not-ton"
      ),
      false
    );

    assert.equal(
      isTonAddress(
        FRIENDLY.slice(
          0,
          -1
        ) +
          "A"
      ),
      false
    );
  }
);
