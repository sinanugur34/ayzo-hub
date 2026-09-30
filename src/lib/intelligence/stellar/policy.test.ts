import assert from "node:assert/strict";
import test from "node:test";

import {
  getStellarAnalysisPolicy,
} from "./policy";

test(
  "Stellar analysis depth is monotonic",
  () => {
    const free =
      getStellarAnalysisPolicy(
        "free"
      );

    const pro =
      getStellarAnalysisPolicy(
        "pro"
      );

    const advanced =
      getStellarAnalysisPolicy(
        "advanced"
      );

    for (
      const key of
      Object.keys(
        free
      ) as
        (
          keyof typeof free
        )[]
    ) {
      assert.ok(
        free[key] <=
          pro[key]
      );

      assert.ok(
        pro[key] <=
          advanced[key]
      );
    }
  }
);
