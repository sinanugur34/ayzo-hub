import test from "node:test";
import assert from "node:assert/strict";

import {
  parsePaidCheckoutEnabled,
} from "./checkoutLaunchPolicyCore";

test(
  "checkout is disabled when value is missing",
  () => {
    assert.equal(
      parsePaidCheckoutEnabled(undefined),
      false
    );

    assert.equal(
      parsePaidCheckoutEnabled(null),
      false
    );
  }
);

test(
  "checkout is disabled for false",
  () => {
    assert.equal(
      parsePaidCheckoutEnabled("false"),
      false
    );
  }
);

test(
  "checkout is fail-closed for unexpected values",
  () => {
    assert.equal(
      parsePaidCheckoutEnabled("1"),
      false
    );

    assert.equal(
      parsePaidCheckoutEnabled("TRUE"),
      false
    );

    assert.equal(
      parsePaidCheckoutEnabled("yes"),
      false
    );
  }
);

test(
  "checkout is enabled only by explicit true",
  () => {
    assert.equal(
      parsePaidCheckoutEnabled("true"),
      true
    );

    assert.equal(
      parsePaidCheckoutEnabled(" true "),
      true
    );
  }
);
