import assert from "node:assert/strict";
import test from "node:test";

import {
  getLitecoinAnalysisPolicy,
} from "./policy";

test(
  "Litecoin analysis depth increases by plan",
  () => {
    const free =
      getLitecoinAnalysisPolicy(
        "free"
      );

    const pro =
      getLitecoinAnalysisPolicy(
        "pro"
      );

    const advanced =
      getLitecoinAnalysisPolicy(
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