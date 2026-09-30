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

const WAVE_22 = [
  "litecoin",
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
  "existing seventeen networks remain mobile live",
  () => {
    const live =
      getMobileLiveNetworkIds();

    assert.equal(
      live.length,
      17
    );

    for (
      const networkId of
      live
    ) {
      assert.equal(
        isMobileAnalysisNetworkLive(
          networkId
        ),
        true
      );
    }
  }
);

test(
  "wave 22 networks stay hidden until full mobile engines are ready",
  () => {
    for (
      const networkId of
      WAVE_22
    ) {
      const support =
        getMobileNetworkSupport(
          networkId
        );

      assert.equal(
        support.canonicalLive,
        false
      );

      assert.equal(
        support.engineReady,
        false
      );

      assert.equal(
        support.analysisEnabled,
        false
      );
    }
  }
);

test(
  "Litecoin inherits the native UTXO mobile adapter",
  () => {
    assert.equal(
      getMobileNetworkSupport(
        "litecoin"
      ).adapter,
      "utxo"
    );
  }
);

test(
  "new native families have explicit mobile adapters",
  () => {
    assert.equal(
      getMobileNetworkSupport(
        "sui"
      ).adapter,
      "sui"
    );

    assert.equal(
      getMobileNetworkSupport(
        "ton"
      ).adapter,
      "ton"
    );

    assert.equal(
      getMobileNetworkSupport(
        "hyperliquid"
      ).adapter,
      "hyperliquid"
    );

    assert.equal(
      getMobileNetworkSupport(
        "stellar"
      ).adapter,
      "stellar"
    );
  }
);

test(
  "mobile evidence workspace safely accepts all wave 22 network ids",
  () => {
    for (
      const networkId of
      WAVE_22
    ) {
      const workspace =
        buildMobileEvidenceWorkspace({
          networkId,

          address:
            `test-${networkId}-subject`,

          data: {
            ok:
              true,

            network:
              networkId,

            coverage:
              "limited",

            history: {
              transactions: [
                {
                  transactionHash:
                    `${networkId}-transaction`,

                  timestamp:
                    null,
                },
              ],
            },

            modules: {
              addressHistory: {
                status:
                  "limited",
              },
            },
          },
        });

      assert.ok(
        workspace.nodes.length >=
          1
      );

      assert.ok(
        workspace.timeline.length >=
          1
      );

      assert.ok(
        workspace.limitation.includes(
          "only evidence already returned by AYZO"
        )
      );
    }
  }
);
