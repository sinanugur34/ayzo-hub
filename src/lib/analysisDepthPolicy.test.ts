import assert from "node:assert/strict";
import test from "node:test";

import {
  getAnalysisDepthPolicy,
} from "./analysisDepthPolicy";

test(
  "Free preserves the current bounded EVM analysis depth",
  () => {
    assert.deepEqual(
      getAnalysisDepthPolicy(
        "free"
      ),
      {
        rootTransactionPages: 1,
        rootTransferPages: 1,
        expansionWalletLimit: 2,
        expansionTransactionPages: 1,
        graphMaxHops: 2,
        graphMaxNodes: 8,
        graphMaxEdges: 12,
      }
    );
  }
);

test(
  "Pro receives wider bounded EVM evidence depth without deeper hops",
  () => {
    const free =
      getAnalysisDepthPolicy(
        "free"
      );

    const pro =
      getAnalysisDepthPolicy(
        "pro"
      );

    assert.equal(
      pro.rootTransactionPages,
      2
    );

    assert.equal(
      pro.rootTransferPages,
      2
    );

    assert.equal(
      pro.expansionWalletLimit,
      4
    );

    assert.equal(
      pro.expansionTransactionPages,
      2
    );

    assert.equal(
      pro.graphMaxHops,
      2
    );

    assert.ok(
      pro.graphMaxNodes >
        free.graphMaxNodes
    );

    assert.ok(
      pro.graphMaxEdges >
        free.graphMaxEdges
    );
  }
);

test(
  "Advanced receives deeper bounded multi-hop investigation depth",
  () => {
    const pro =
      getAnalysisDepthPolicy(
        "pro"
      );

    const advanced =
      getAnalysisDepthPolicy(
        "advanced"
      );

    assert.deepEqual(
      advanced,
      {
        rootTransactionPages: 3,
        rootTransferPages: 3,
        expansionWalletLimit: 8,
        expansionTransactionPages: 3,
        graphMaxHops: 4,
        graphMaxNodes: 28,
        graphMaxEdges: 48,
      }
    );

    assert.ok(
      advanced.rootTransactionPages >=
        pro.rootTransactionPages
    );

    assert.ok(
      advanced.rootTransferPages >=
        pro.rootTransferPages
    );

    assert.ok(
      advanced.expansionWalletLimit >=
        pro.expansionWalletLimit
    );

    assert.ok(
      advanced.expansionTransactionPages >=
        pro.expansionTransactionPages
    );

    assert.ok(
      advanced.graphMaxHops >
        pro.graphMaxHops
    );

    assert.ok(
      advanced.graphMaxNodes >
        pro.graphMaxNodes
    );

    assert.ok(
      advanced.graphMaxEdges >
        pro.graphMaxEdges
    );
  }
);

test(
  "Plan depth remains monotonic Free <= Pro <= Advanced",
  () => {
    const free =
      getAnalysisDepthPolicy(
        "free"
      );

    const pro =
      getAnalysisDepthPolicy(
        "pro"
      );

    const advanced =
      getAnalysisDepthPolicy(
        "advanced"
      );

    const keys:
      (keyof typeof free)[] = [
        "rootTransactionPages",
        "rootTransferPages",
        "expansionWalletLimit",
        "expansionTransactionPages",
        "graphMaxHops",
        "graphMaxNodes",
        "graphMaxEdges",
      ];

    for (
      const key of keys
    ) {
      assert.ok(
        pro[key] >=
          free[key],
        `${key}: expected Pro >= Free`
      );

      assert.ok(
        advanced[key] >=
          pro[key],
        `${key}: expected Advanced >= Pro`
      );
    }
  }
);
