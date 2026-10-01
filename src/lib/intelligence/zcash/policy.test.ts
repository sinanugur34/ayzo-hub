import assert from "node:assert/strict";
import test from "node:test";

import {
  getZcashAnalysisPolicy,
} from "./policy";

test(
  "Zcash Deep Analyze depth is monotonic",
  () => {
    const free =
      getZcashAnalysisPolicy(
        "free"
      );

    const pro =
      getZcashAnalysisPolicy(
        "pro"
      );

    const advanced =
      getZcashAnalysisPolicy(
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
