import assert from "node:assert/strict";
import test from "node:test";

import {
  getEvmRecursiveGraphPolicy,
} from "./recursiveGraphPolicy";

test(
  "Free recursive provider graph discovery is disabled",
  () => {
    assert.deepEqual(
      getEvmRecursiveGraphPolicy(
        "free"
      ),
      {
        enabled: false,
      }
    );
  }
);

test(
  "Pro recursive provider graph discovery is disabled",
  () => {
    assert.deepEqual(
      getEvmRecursiveGraphPolicy(
        "pro"
      ),
      {
        enabled: false,
      }
    );
  }
);

test(
  "Advanced receives bounded recursive provider graph discovery",
  () => {
    const policy =
      getEvmRecursiveGraphPolicy(
        "advanced"
      );

    assert.equal(
      policy.enabled,
      true
    );

    if (!policy.enabled) {
      throw new Error(
        "Expected Advanced recursive graph policy."
      );
    }

    assert.deepEqual(
      {
        maxHops:
          policy.maxHops,

        maxNodes:
          policy.maxNodes,

        maxEdges:
          policy.maxEdges,

        maxNeighborsPerNode:
          policy.maxNeighborsPerNode,

        transactionPagesPerNode:
          policy.transactionPagesPerNode,

        providerRequestBudget:
          policy.providerRequestBudget,
      },
      {
        maxHops: 4,
        maxNodes: 28,
        maxEdges: 48,
        maxNeighborsPerNode: 4,
        transactionPagesPerNode: 2,
        providerRequestBudget: 16,
      }
    );
  }
);
