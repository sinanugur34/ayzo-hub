import assert from "node:assert/strict";
import test from "node:test";

import {
  getXrplAnalysisPolicy,
} from "./policy";

test(
  "XRPL Free preserves established entry depth",
  () => {
    const free =
      getXrplAnalysisPolicy(
        "free"
      );

    assert.equal(
      free.historyLimit,
      10
    );

    assert.equal(
      free.trustLineLimit,
      10
    );

    assert.equal(
      free.graphMaxNodes,
      8
    );
  }
);

test(
  "XRPL Pro and Advanced increase every evidence-depth axis",
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

    const keys =
      Object.keys(
        free
      ) as (
        keyof typeof free
      )[];

    for (
      const key of keys
    ) {
      assert.ok(
        free[key] <
          pro[key],
        `${String(
          key
        )}: Free must be shallower than Pro`
      );

      assert.ok(
        pro[key] <
          advanced[key],
        `${String(
          key
        )}: Pro must be shallower than Advanced`
      );
    }

    assert.equal(
      pro.historyLimit,
      30
    );

    assert.equal(
      advanced.historyLimit,
      72
    );

    assert.equal(
      advanced.trustLineLimit,
      80
    );
  }
);
