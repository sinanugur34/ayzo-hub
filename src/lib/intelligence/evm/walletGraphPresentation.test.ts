import assert from "node:assert/strict";
import test from "node:test";

import {
  getEvmWalletGraphPresentation,
} from "./walletGraphPresentation";

test(
  "two-hop graph coverage keeps the standard visual presentation",
  () => {
    const presentation =
      getEvmWalletGraphPresentation({
        maxHops: 2,
        maxNodes: 14,
        maxEdges: 24,
      });

    assert.deepEqual(
      presentation,
      {
        advancedDepth: false,
        nodePreviewLimit: 6,
        visualMaxNodes: 8,
        visualMaxEdges: 12,
        capabilityLabel:
          "BOUNDED GRAPH",
      }
    );
  }
);

test(
  "four-hop graph coverage enables the Advanced visual presentation",
  () => {
    const presentation =
      getEvmWalletGraphPresentation({
        maxHops: 4,
        maxNodes: 28,
        maxEdges: 48,
      });

    assert.deepEqual(
      presentation,
      {
        advancedDepth: true,
        nodePreviewLimit: 12,
        visualMaxNodes: 12,
        visualMaxEdges: 20,
        capabilityLabel:
          "ADVANCED MULTI-HOP",
      }
    );
  }
);

test(
  "presentation follows server graph depth rather than client plan inference",
  () => {
    const deeper =
      getEvmWalletGraphPresentation({
        maxHops: 3,
        maxNodes: 20,
        maxEdges: 30,
      });

    assert.equal(
      deeper.advancedDepth,
      true
    );

    assert.equal(
      deeper.visualMaxNodes,
      12
    );

    assert.equal(
      deeper.visualMaxEdges,
      20
    );
  }
);
