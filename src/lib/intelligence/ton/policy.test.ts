import assert from "node:assert/strict";
import test from "node:test";

import {
  getTonAnalysisPolicy,
} from "./policy";

test(
  "TON depth is monotonic Free <= Pro <= Advanced",
  () => {
    const free =
      getTonAnalysisPolicy(
        "free"
      );

    const pro =
      getTonAnalysisPolicy(
        "pro"
      );

    const advanced =
      getTonAnalysisPolicy(
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
