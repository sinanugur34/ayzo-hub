import assert from "node:assert/strict";
import test from "node:test";

import {
  getXrplAnalysisPolicy,
} from "./policy";

test(
  "increases XRPL evidence depth by plan",
  () => {
    const free =
      getXrplAnalysisPolicy(
        "free"
      );

    const pro =
      getXrplAnalysisPolicy(
        "pro"
      );

    const advanced =
      getXrplAnalysisPolicy(
        "advanced"
      );

    assert.ok(
      pro.historyLimit >
        free.historyLimit
    );

    assert.ok(
      advanced.historyLimit >
        pro.historyLimit
    );

    assert.ok(
      advanced.trustLineLimit >
        pro.trustLineLimit
    );

    assert.ok(
      advanced.graphMaxNodes >
        free.graphMaxNodes
    );
  }
);