import assert from "node:assert/strict";
import test from "node:test";

import {
  runAptosIntelligence,
} from "./engine";

test(
  "rejects invalid Aptos address before provider work",
  async () => {
    let called =
      false;

    const result =
      await runAptosIntelligence(
        {
          address:
            "invalid",
        },
        {
          async loadEvidence() {
            called =
              true;
            throw new Error(
              "must not run"
            );
          },
        }
      );

    assert.equal(
      result.status,
      400
    );

    assert.equal(
      called,
      false
    );
  }
);
