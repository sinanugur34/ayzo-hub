import assert from "node:assert/strict";
import test from "node:test";

import {
  runZcashIntelligence,
} from "./engine";

test(
  "Zcash foundation fails closed until provider acceptance",
  async () => {
    const result =
      await runZcashIntelligence({
        address:
          "t1Z7U8gYQpJ7A7xQYk7JgqvLqPjTvV7hFxx",
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

test(
  "Zcash does not invent shielded traceability",
  async () => {
    const result =
      await runZcashIntelligence({
        address:
          "zs1qqqqqqqqqqqqqqqqqqqqqq",
      });

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.code,
      "SHIELDED_ADDRESS_NOT_PUBLICLY_TRACEABLE"
    );
  }
);
