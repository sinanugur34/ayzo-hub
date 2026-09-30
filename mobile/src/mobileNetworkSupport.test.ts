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

const REMAINING_WAVE = [
  "sui",
  "ton",
  "hyperliquid",
  "stellar",
] as const;

test(
  "mobile adapter registry covers every canonical network",
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
  "eighteen networks are mobile live after Litecoin promotion",
  () => {
    const live =
      getMobileLiveNetworkIds();

    assert.equal(
      live.length,
      18
    );

    assert.equal(
      isMobileAnalysisNetworkLive(
        "litecoin"
      ),
      true
    );
  }
);

test(
  "Litecoin uses production UTXO mobile adapter",
  () => {
    const support =
      getMobileNetworkSupport(
        "litecoin"
      );

    assert.equal(
      support.adapter,
      "utxo"
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
  "remaining wave networks stay hidden",
  () => {
    for (
      const networkId of
      REMAINING_WAVE
    ) {
      assert.equal(
        getMobileNetworkSupport(
          networkId
        ).analysisEnabled,
        false
      );
    }
  }
);

test(
  "Litecoin mobile workspace uses returned evidence only",
  () => {
    const workspace =
      buildMobileEvidenceWorkspace({
        networkId:
          "litecoin",

        address:
          "LKDxGDJq5fF4FohAB8zJH24mDDNHDNtqsE",

        data: {
          ok:
            true,

          network:
            "litecoin",

          coverage:
            "partial",

          derived: {
            counterparties: {
              items: [
                {
                  address:
                    "M7uAERuQW2AotfyLDyewFGcLUDtAYu9v5V",

                  incomingCount:
                    1,

                  outgoingCount:
                    0,

                  observationCount:
                    1,
                },
              ],
            },

            observedFunding: {
              sourceAddress:
                "M7uAERuQW2AotfyLDyewFGcLUDtAYu9v5V",
            },
          },

          history: {
            transactions: [
              {
                transactionHash:
                  "a".repeat(
                    64
                  ),

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

    assert.ok(
      workspace.limitation.includes(
        "only evidence already returned by AYZO"
      )
    );
  }
);
