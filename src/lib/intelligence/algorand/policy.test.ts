import assert from "node:assert/strict";
import test from "node:test";

import {
  getAlgorandAnalysisPolicy,
} from "./policy";

test(
  "Algorand Deep Analyze depth is monotonic",
  () => {
    const free =
      getAlgorandAnalysisPolicy(
        "free"
      );

    const pro =
      getAlgorandAnalysisPolicy(
        "pro"
      );

    const advanced =
      getAlgorandAnalysisPolicy(
        "advanced"
      );

    for (
      const key of Object.keys(
        free
      ) as Array<
        keyof typeof free
      >
    ) {
      assert.ok(
        free[key] <
          pro[key]
      );

      assert.ok(
        pro[key] <
          advanced[key]
      );
    }
  }
);
