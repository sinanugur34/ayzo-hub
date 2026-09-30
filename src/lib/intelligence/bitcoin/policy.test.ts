import assert from "node:assert/strict";
import test from "node:test";

import {
  getBitcoinAnalysisPolicy,
} from "./policy";

test(
  "Bitcoin Free preserves five-transaction history depth",
  () => {
    const policy =
      getBitcoinAnalysisPolicy(
        "free"
      );

    assert.equal(
      policy.historyLimit,
      5
    );

    assert.equal(
      policy.canonicalSampleLimit,
      1
    );
  }
);

test(
  "Bitcoin paid plans widen bounded history depth",
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

    assert.equal(
      pro.historyLimit,
      10
    );

    assert.equal(
      advanced.historyLimit,
      20
    );

    assert.ok(
      free.historyLimit <
        pro.historyLimit
    );

    assert.ok(
      pro.historyLimit <
        advanced.historyLimit
    );
  }
);

test(
  "Bitcoin V2 increases canonical verification depth by plan",
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
      free.canonicalSampleLimit <
        pro.canonicalSampleLimit
    );

    assert.ok(
      pro.canonicalSampleLimit <
        advanced.canonicalSampleLimit
    );
  }
);
