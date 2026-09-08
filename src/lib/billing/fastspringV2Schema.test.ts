import {
  readFileSync,
} from "node:fs";

import test from "node:test";

import assert from "node:assert/strict";

const source =
  readFileSync(
    new URL(
      "./fastspring.ts",
      import.meta.url
    ),
    "utf8"
  );

test(
  "FastSpring Sessions v2 uses cart.lineItems",
  () => {
    assert.match(
      source,
      /cart:\s*\{\s*lineItems:\s*\[/
    );

    assert.match(
      source,
      /session\.cart\?\.lineItems/
    );

    assert.doesNotMatch(
      source,
      /cart:\s*\{\s*items:\s*\[\s*\{\s*productPath/
    );

    assert.doesNotMatch(
      source,
      /session\.cart\?\.items/
    );
  }
);
