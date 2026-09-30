import assert from "node:assert/strict";
import test from "node:test";

import {
  getAptosAnalysisPolicy,
} from "./policy";

test(
  "Aptos deep analysis depth is monotonic",
  () => {
    const free =
      getAptosAnalysisPolicy(
        "free"
      );

    const pro =
      getAptosAnalysisPolicy(
        "pro"
      );

    const advanced =
      getAptosAnalysisPolicy(
        "advanced"
      );

    assert.deepEqual(
      [
        free.transactionLimit,
        pro.transactionLimit,
        advanced.transactionLimit,
      ],
      [
        16,
        48,
        96,
      ]
    );

    assert.ok(
      free.fungibleAssetLimit <
        pro.fungibleAssetLimit
    );

    assert.ok(
      pro.fungibleAssetLimit <
        advanced.fungibleAssetLimit
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
