import assert from "node:assert/strict";
import test from "node:test";

import {
  googlePlayObfuscatedAccountId,
} from "./googlePlayAccountBinding";

test(
  "Google Play account binding is deterministic and bounded",
  () => {
    const first =
      googlePlayObfuscatedAccountId(
        "11111111-2222-3333-4444-555555555555"
      );

    const second =
      googlePlayObfuscatedAccountId(
        "11111111-2222-3333-4444-555555555555"
      );

    assert.equal(
      first,
      second
    );

    assert.equal(
      first.length,
      43
    );

    assert.match(
      first,
      /^[A-Za-z0-9_-]{43}$/
    );
  }
);

test(
  "different AYZO users receive different Play account bindings",
  () => {
    assert.notEqual(
      googlePlayObfuscatedAccountId(
        "11111111-2222-3333-4444-555555555555"
      ),
      googlePlayObfuscatedAccountId(
        "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
      )
    );
  }
);
