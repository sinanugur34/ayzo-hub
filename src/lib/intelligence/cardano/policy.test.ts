import assert from "node:assert/strict";
import test from "node:test";

import {
  getCardanoAnalysisPolicy,
} from "./policy";

test(
  "Cardano deep analysis depth is monotonic",
  () => {
    const free =
      getCardanoAnalysisPolicy(
        "free"
      );

    const pro =
      getCardanoAnalysisPolicy(
        "pro"
      );

    const advanced =
      getCardanoAnalysisPolicy(
        "advanced"
      );

    assert.deepEqual(
      [
        free.historyLimit,
        pro.historyLimit,
        advanced.historyLimit,
      ],
      [
        12,
        36,
        96,
      ]
    );

    assert.ok(
      free.canonicalSampleLimit <
        pro.canonicalSampleLimit
    );

    assert.ok(
      pro.canonicalSampleLimit <
        advanced.canonicalSampleLimit
    );

    assert.ok(
      free.providerRequestBudget <
        pro.providerRequestBudget
    );

    assert.ok(
      pro.providerRequestBudget <
        advanced.providerRequestBudget
    );
  }
);
