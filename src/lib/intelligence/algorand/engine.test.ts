import assert from "node:assert/strict";
import test from "node:test";

import {
  runAlgorandIntelligence,
} from "./engine";

test(
  "Algorand foundation fails closed until provider acceptance",
  async () => {
    const result =
      await runAlgorandIntelligence({
        address:
          "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ",
      });

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.code,
      "PROVIDER_NOT_CONFIGURED"
    );
  }
);
