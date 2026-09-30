import assert from "node:assert/strict";
import test from "node:test";

import {
  isStellarAccountAddress,
} from "./address";

const ACCOUNT =
  "GDMQQNJM4UL7QIA66P7R2PZHMQINWZBM77BEBMHLFXD5JEUAHGJ7R4JZ";

test(
  "accepts checksum-valid Stellar G account",
  () => {
    assert.equal(
      isStellarAccountAddress(
        ACCOUNT
      ),
      true
    );
  }
);

test(
  "rejects invalid Stellar account",
  () => {
    assert.equal(
      isStellarAccountAddress(
        ACCOUNT.slice(0, -1) + "A"
      ),
      false
    );

    assert.equal(
      isStellarAccountAddress(
        "not-stellar"
      ),
      false
    );
  }
);
