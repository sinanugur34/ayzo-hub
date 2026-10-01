import assert from "node:assert/strict";
import test from "node:test";

import {
  getZcashAddressKind,
  isZcashShieldedOrUnifiedAddress,
  normalizeZcashTransparentAddress,
} from "./address";

const REAL_MAINNET_T1 =
  "t1RyCw14wRXrh3mp21uxgr9ynjem7cNUkMH";

test(
  "accepts checksum-valid Zcash transparent mainnet address",
  () => {
    assert.equal(
      normalizeZcashTransparentAddress(
        REAL_MAINNET_T1
      ),
      REAL_MAINNET_T1
    );

    assert.equal(
      getZcashAddressKind(
        REAL_MAINNET_T1
      ),
      "transparent-p2pkh"
    );
  }
);

test(
  "rejects Zcash transparent checksum mutation",
  () => {
    const mutated =
      REAL_MAINNET_T1.slice(
        0,
        -1
      ) +
      (
        REAL_MAINNET_T1.endsWith(
          "H"
        )
          ? "J"
          : "H"
      );

    assert.equal(
      normalizeZcashTransparentAddress(
        mutated
      ),
      null
    );
  }
);

test(
  "rejects Bitcoin and malformed Base58 as Zcash",
  () => {
    assert.equal(
      normalizeZcashTransparentAddress(
        "1BoatSLRHtKNngkdXEeobR76b53LETtpyT"
      ),
      null
    );

    assert.equal(
      normalizeZcashTransparentAddress(
        "t1INVALID000000000000000000000000000"
      ),
      null
    );
  }
);

test(
  "shielded-like families never become transparent evidence",
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
