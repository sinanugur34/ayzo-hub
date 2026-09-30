import assert from "node:assert/strict";
import test from "node:test";

import {
  getNearAnalysisPolicy,
} from "./policy";

test(
  "NEAR analysis depth is monotonic Free < Pro < Advanced",
  () => {
    const free =
      getNearAnalysisPolicy(
        "free"
      );

    const pro =
      getNearAnalysisPolicy(
        "pro"
      );

    const advanced =
      getNearAnalysisPolicy(
        "advanced"
      );

    for (
      const key of [
        "transactionLimit",
        "receiptLimit",
        "accessKeyLimit",
        "fungibleTokenLimit",
        "actionLimit",
        "graphMaxNodes",
        "graphMaxEdges",
        "timelineMaxEvents",
        "providerRequestBudget",
      ] as const
    ) {
      assert.ok(
        free[key] <
          pro[key],
        `${key}: Free < Pro`
      );

      assert.ok(
        pro[key] <
          advanced[key],
        `${key}: Pro < Advanced`
      );
    }
  }
);
