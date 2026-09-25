import assert from "node:assert/strict";
import test from "node:test";

import {
  getDogecoinAnalysisPolicy,
} from "./policy";

test(
  "Dogecoin analysis depth increases by plan",
  () => {
    const free =
      getDogecoinAnalysisPolicy(
        "free"
      );

    const pro =
      getDogecoinAnalysisPolicy(
        "pro"
      );

    const advanced =
      getDogecoinAnalysisPolicy(
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
      pro.canonicalSampleLimit >
      free.canonicalSampleLimit
    );

    assert.ok(
      advanced.canonicalSampleLimit >
      pro.canonicalSampleLimit
    );

    assert.ok(
      advanced.graphMaxNodes >
      free.graphMaxNodes
    );
  }
);