import assert from "node:assert/strict";
import test from "node:test";

import {
  isLitecoinMainnetAddress,
} from "./address";

test(
  "accepts Litecoin mainnet legacy addresses",
  () => {
    assert.equal(
      isLitecoinMainnetAddress(
        "LKDxGDJq5fF4FohAB8zJH24mDDNHDNtqsE"
      ),
      true
    );

    assert.equal(
      isLitecoinMainnetAddress(
        "M7uAERuQW2AotfyLDyewFGcLUDtAYu9v5V"
      ),
      true
    );
  }
);

test(
  "accepts structurally ambiguous legacy P2SH safely",
  () => {
    /*
     * Version 0x05 can represent legacy P2SH
     * on both Bitcoin and Litecoin.
     *
     * The validator accepts it for explicit
     * Litecoin selection. Auto-detection keeps
     * these ambiguous addresses on Bitcoin unless
     * Litecoin is already selected.
     */
    assert.equal(
      isLitecoinMainnetAddress(
        "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"
      ),
      true
    );
  }
);

test(
  "rejects invalid Litecoin addresses",
  () => {
    assert.equal(
      isLitecoinMainnetAddress(
        "not-litecoin"
      ),
      false
    );

    assert.equal(
      isLitecoinMainnetAddress(
        "LKDxGDJq5fF4FohAB8zJH24mDDNHDNtqsF"
      ),
      false
    );
  }
);
