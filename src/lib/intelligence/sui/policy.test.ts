import assert from "node:assert/strict";
import test from "node:test";

import {
  getSuiAnalysisPolicy,
} from "./policy";

test(
  "Sui analysis depth increases monotonically",
  () => {
    const free =
      getSuiAnalysisPolicy(
        "free"
      );

    const pro =
      getSuiAnalysisPolicy(
        "pro"
      );

    const advanced =
      getSuiAnalysisPolicy(
        "advanced"
      );

    for (
      const key of [
        "historyLimit",
        "earliestHistoryLimit",
        "balanceLimit",
        "objectLimit",
        "graphMaxNodes",
        "graphMaxEdges",
        "timelineMaxEvents",
      ] as const
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
