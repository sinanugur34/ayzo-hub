import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveLoginMode,
} from "./loginMode";

test(
  "defaults to sign in",
  () => {
    assert.equal(
      resolveLoginMode(
        undefined
      ),
      "signin"
    );
  }
);

test(
  "accepts explicit signup",
  () => {
    assert.equal(
      resolveLoginMode(
        "signup"
      ),
      "signup"
    );
  }
);

test(
  "fails safely to sign in for unknown modes",
  () => {
    assert.equal(
      resolveLoginMode(
        "unexpected"
      ),
      "signin"
    );
  }
);
