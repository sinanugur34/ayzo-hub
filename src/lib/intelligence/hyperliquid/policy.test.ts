import assert from "node:assert/strict";
import test from "node:test";

import {
  getHyperliquidAnalysisPolicy,
} from "./policy";

test(
  "Hyperliquid analysis depth increases by plan",
  () => {
    const free =
      getHyperliquidAnalysisPolicy(
        "free"
      );

    const pro =
      getHyperliquidAnalysisPolicy(
        "pro"
      );

    const advanced =
      getHyperliquidAnalysisPolicy(
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
