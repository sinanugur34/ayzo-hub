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
  "Pro receives wider bounded EVM evidence depth",
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
