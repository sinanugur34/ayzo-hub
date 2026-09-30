import assert from "node:assert/strict";
import test from "node:test";

import {
  NETWORK_IDS,
} from "../../src/lib/networks/registry";

import {
  MOBILE_NETWORK_ADAPTERS,
  getMobileLiveNetworkIds,
  getMobileNetworkSupport,
  isMobileAnalysisNetworkLive,
} from "./mobileNetworkSupport";

import {
  buildMobileEvidenceWorkspace,
} from "./mobileEvidenceWorkspace";

const REMAINING = [
  "ton",
  "hyperliquid",
  "stellar",
] as const;

test(
  "mobile adapter registry covers all 22 networks",
  () => {
    assert.equal(
      NETWORK_IDS.length,
      22
    );

    assert.equal(
      Object.keys(
        MOBILE_NETWORK_ADAPTERS
      ).length,
      22
    );
  }
);

test(
  "nineteen networks are mobile live",
  () => {
    assert.equal(
      getMobileLiveNetworkIds()
        .length,
      19
    );

    assert.equal(
      isMobileAnalysisNetworkLive(
        "sui"
      ),
      true
    );
  }
);

test(
  "Sui dedicated mobile adapter is ready",
  () => {
    const support =
      getMobileNetworkSupport(
        "sui"
      );

    assert.equal(
      support.adapter,
      "sui"
    );

    assert.equal(
      support.canonicalLive,
      true
    );

    assert.equal(
      support.engineReady,
      true
    );

    assert.equal(
      support.analysisEnabled,
      true
    );
  }
);

test(
  "remaining wave networks remain hidden",
  () => {
    for (
      const id of
      REMAINING
    ) {
      assert.equal(
        getMobileNetworkSupport(
          id
        ).analysisEnabled,
        false
      );
    }
  }
);

test(
  "Sui evidence workspace uses returned evidence",
  () => {
    const workspace =
      buildMobileEvidenceWorkspace({
        networkId:
          "sui",

        address:
          `0x${"11".repeat(32)}`,

        data: {
          network:
            "sui",

          derived: {
            counterparties: {
              items: [
                {
                  address:
                    `0x${"22".repeat(32)}`,

                  interactionCount:
                    1,
                },
              ],
            },

            observedFunding: {
              observedSender:
                `0x${"22".repeat(32)}`,
            },
          },

          history: {
            transactions: [
              {
                transactionHash:
                  "sui-test-transaction",

                timestamp:
                  null,
              },
            ],
          },
        },
      });

    assert.ok(
      workspace.nodes.length >=
        2
    );

    assert.ok(
      workspace.edges.length >=
        1
    );
  }
);
