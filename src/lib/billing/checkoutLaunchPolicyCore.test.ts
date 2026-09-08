import test from "node:test";
import assert from "node:assert/strict";

import {
  parseProCheckoutEnabled,
} from "./checkoutLaunchPolicyCore";

test(
  "checkout is disabled when value is missing",
  () => {
    assert.equal(
      parseProCheckoutEnabled(undefined),
      false
    );

    assert.equal(
      parseProCheckoutEnabled(null),
      false
    );
  }
);

test(
  "checkout is disabled for false",
  () => {
    assert.equal(
      parseProCheckoutEnabled("false"),
      false
    );
  }
);

test(
  "checkout is fail-closed for unexpected values",
  () => {
    assert.equal(
      parseProCheckoutEnabled("1"),
      false
    );

    assert.equal(
      parseProCheckoutEnabled("TRUE"),
      false
    );

    assert.equal(
      parseProCheckoutEnabled("yes"),
      false
    );
  }
);

test(
  "checkout is enabled only by explicit true",
  () => {
    assert.equal(
      parseProCheckoutEnabled("true"),
      true
    );

    assert.equal(
      parseProCheckoutEnabled(" true "),
      true
    );
  }
);
