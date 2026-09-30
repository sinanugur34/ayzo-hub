import assert from "node:assert/strict";
import test from "node:test";

import {
  getHederaAnalysisPolicy,
} from "./policy";

test(
  "Hedera analysis depth is monotonic Free < Pro < Advanced",
  () => {
    const free =
      getHederaAnalysisPolicy(
        "free"
      );

    const pro =
      getHederaAnalysisPolicy(
        "pro"
      );

    const advanced =
      getHederaAnalysisPolicy(
        "advanced"
      );

    for (
      const key of [
        "transactionLimit",
        "tokenRelationshipLimit",
        "nftLimit",
        "tokenMetadataLimit",
        "stakingRewardLimit",
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
