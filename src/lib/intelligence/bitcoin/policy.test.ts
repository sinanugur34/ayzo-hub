import assert from "node:assert/strict";
import test from "node:test";

import {
  getBitcoinAnalysisPolicy,
} from "./policy";

test(
  "Bitcoin Free preserves existing history and canonical entry depth",
  () => {
    const free =
      getBitcoinAnalysisPolicy(
        "free"
      );

    assert.equal(
      free.historyLimit,
      5
    );

    assert.equal(
      free.canonicalSampleLimit,
      1
    );

    assert.equal(
      free.graphMaxNodes,
      8
    );

    assert.equal(
      free.timelineMaxEvents,
      5
    );
  }
);

test(
  "Bitcoin Pro and Advanced materially deepen native evidence",
  () => {
    const free =
      getBitcoinAnalysisPolicy(
        "free"
      );

    const pro =
      getBitcoinAnalysisPolicy(
        "pro"
      );

    const advanced =
      getBitcoinAnalysisPolicy(
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
      15
    );

    assert.equal(
      advanced.historyLimit,
      30
    );

    assert.equal(
      pro.canonicalSampleLimit,
      3
    );

    assert.equal(
      advanced.canonicalSampleLimit,
      5
    );
  }
);

test(
  "Bitcoin Advanced canonical verification remains bounded",
  () => {
    const advanced =
      getBitcoinAnalysisPolicy(
        "advanced"
      );

    assert.ok(
      advanced.canonicalSampleLimit <=
        5
    );

    assert.ok(
      advanced.timelineMaxEvents <=
        25
    );
  }
);
