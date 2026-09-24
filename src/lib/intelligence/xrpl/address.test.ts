import assert from "node:assert/strict";
import test from "node:test";

import {
  isXrplClassicAddress,
} from "./address";

test(
  "accepts a checksum-valid XRPL classic address",
  () => {
    assert.equal(
      isXrplClassicAddress(
        "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh"
      ),
      true
    );
  }
);

test(
  "rejects a modified XRPL checksum",
  () => {
    assert.equal(
      isXrplClassicAddress(
        "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTi"
      ),
      false
    );
  }
);