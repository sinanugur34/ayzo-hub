import assert from "node:assert/strict";
import test from "node:test";

import {
  getTronAnalysisPolicy,
} from "./policy";

test(
  "TRON analysis depth increases by plan",
  () => {
    const free =
      getTronAnalysisPolicy(
        "free"
      );

    const pro =
      getTronAnalysisPolicy(
        "pro"
      );

    const advanced =
      getTronAnalysisPolicy(
        "advanced"
      );

    assert.equal(
      free.historyLimit,
      5
    );

    assert.equal(
      pro.historyLimit,
      10
    );

    assert.equal(
      advanced.historyLimit,
      20
    );

    assert.equal(
      free.canonicalSampleLimit,
      1
    );

    assert.equal(
      pro.canonicalSampleLimit,
      2
    );

    assert.equal(
      advanced.canonicalSampleLimit,
      3
    );

    assert.ok(
      advanced.graphMaxNodes >
      pro.graphMaxNodes
    );

    assert.ok(
      pro.graphMaxNodes >
      free.graphMaxNodes
    );
  }
);