import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildHistoricalSnapshot,
} from "@/lib/account/historicalSnapshot";

import {
  getAskAyzoNetworkProfile,
} from "@/lib/account/askAyzoNetworkRegistry";

import {
  NETWORKS,
  NETWORK_IDS,
} from "@/lib/networks/registry";

import {
  getProductToolsForNetwork,
} from "@/lib/networks/productCapabilities";

import {
  getMobileNetworkSupport,
} from "../../../mobile/src/mobileNetworkSupport";

import {
  buildMobileEvidenceWorkspace,
} from "../../../mobile/src/mobileEvidenceWorkspace";

const finalFive = [
  "zcash",
  "algorand",
  "polkadot",
  "cosmos",
  "injective",
] as const;

test(
  "final five product surfaces are live after promotion acceptance",
  () => {
    assert.equal(
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id].status ===
            "live"
      ).length,
      30
    );

    for (
      const id of finalFive
    ) {
      assert.equal(
        NETWORKS[id].status,
        "live"
      );

      assert.equal(
        getMobileNetworkSupport(
          id
        ).analysisEnabled,
        true
      );

      assert.equal(
        getMobileNetworkSupport(
          id
        ).engineReady,
        true
      );
    }

    assert.equal(
      NETWORKS.near.status,
      "development"
    );
  }
);

test(
  "native reports remain present after promotion",
  () => {
    for (
      const path of [
        "src/components/PolkadotIntelligenceReport.tsx",
        "src/components/CosmosIntelligenceReport.tsx",
        "src/components/InjectiveIntelligenceReport.tsx",
      ]
    ) {
      assert.equal(
        fs.existsSync(
          path
        ),
        true
      );
    }
  }
);

test(
  "Polkadot Cosmos and Injective have explicit Ask AYZO profiles",
  () => {
    for (
      const id of [
        "polkadot",
        "cosmos",
        "injective",
      ] as const
    ) {
      const profile =
        getAskAyzoNetworkProfile(
          id
        );

      assert.equal(
        profile.adapter,
        id
      );

      assert.ok(
        profile.capabilities
          .includes(
            "relationships"
          )
      );

      assert.ok(
        profile.capabilities
          .includes(
            "funding"
          )
      );
    }
  }
);

test(
  "Historical Evidence understands final expansion native shapes",
  () => {
    const polkadot =
      buildHistoricalSnapshot(
        "polkadot",
        {
          coverage:
            "limited",

          account: {
            freePlanck:
              "100",
          },

          transfers: [
            {
              extrinsicHash:
                "0xabc",

              timestamp:
                "2026-01-01T00:00:00.000Z",

              blockNumber:
                1,
            },
          ],

          derived: {
            flow: {
              incomingCount:
                1,
            },

            counterparties: {
              count:
                1,
            },

            observedFunding: {
              sourceAddress:
                "source",
            },
          },

          findings:
            [],
        }
      );

    const cosmos =
      buildHistoricalSnapshot(
        "cosmos",
        {
          coverage:
            "limited",

          balances: [
            {
              denom:
                "uatom",

              amount:
                "1",
            },
          ],

          delegations:
            [],

          transactions: [
            {
              hash:
                "ABC",

              timestamp:
                "2026-01-01T00:00:00.000Z",

              height:
                1,
            },
          ],

          derived: {
            flow: {
              incomingCount:
                1,
            },

            counterparties: {
              count:
                1,
            },

            observedFunding: {
              sourceAddress:
                "source",
            },
          },

          findings:
            [],
        }
      );

    assert.equal(
      polkadot
        ?.metrics
        .nativeBalanceRaw,
      "100"
    );

    assert.equal(
      cosmos
        ?.metrics
        .transactionCount,
      1
    );
  }
);

test(
  "mobile workspace uses explicit Polkadot evidence",
  () => {
    const workspace =
      buildMobileEvidenceWorkspace({
        networkId:
          "polkadot",

        address:
          "root",

        data: {
          derived: {
            counterparties: {
              items: [
                {
                  address:
                    "peer",

                  observationCount:
                    1,

                  incomingCount:
                    1,

                  outgoingCount:
                    0,
                },
              ],
            },

            observedFunding: {
              sourceAddress:
                "peer",
            },

            flow: {
              transfers: [
                {
                  direction:
                    "incoming",

                  counterparty:
                    "peer",

                  extrinsicHash:
                    "0x123",

                  timestamp:
                    "2026-01-01T00:00:00.000Z",
                },
              ],
            },
          },
        },
      });

    assert.equal(
      workspace.edges.length,
      1
    );

    assert.equal(
      workspace.timeline.length,
      1
    );
  }
);

test(
  "mobile workspace uses explicit Cosmos SDK transfer evidence",
  () => {
    for (
      const id of [
        "cosmos",
        "injective",
      ] as const
    ) {
      const workspace =
        buildMobileEvidenceWorkspace({
          networkId:
            id,

          address:
            "root",

          data: {
            derived: {
              counterparties: {
                items: [
                  {
                    address:
                      "peer",

                    observationCount:
                      1,

                    incomingCount:
                      1,

                    outgoingCount:
                      0,
                  },
                ],
              },

              observedFunding: {
                sourceAddress:
                  "peer",
              },

              flow: {
                transfers: [
                  {
                    direction:
                      "incoming",

                    counterparty:
                      "peer",

                    transactionHash:
                      "ABC",

                    denom:
                      id ===
                        "cosmos"
                        ? "uatom"
                        : "inj",

                    kind:
                      "bank",

                    timestamp:
                      "2026-01-01T00:00:00.000Z",
                  },
                ],
              },
            },
          },
        });

      assert.equal(
        workspace.edges.length,
        1
      );

      assert.equal(
        workspace.timeline.length,
        1
      );
    }
  }
);

test(
  "registry capabilities expose appropriate product tools after live promotion",
  () => {
    for (
      const id of [
        "polkadot",
        "cosmos",
        "injective",
      ] as const
    ) {
      const tools =
        getProductToolsForNetwork(
          id
        ).map(
          item =>
            item.id
        );

      assert.ok(
        tools.includes(
          "walletAnalysis"
        )
      );

      assert.ok(
        tools.includes(
          "fundingTrace"
        )
      );

      assert.ok(
        tools.includes(
          "connections"
        )
      );
    }

    assert.ok(
      getProductToolsForNetwork(
        "cosmos"
      )
        .map(
          item =>
            item.id
        )
        .includes(
          "tokenAnalysis"
        )
    );

    assert.ok(
      getProductToolsForNetwork(
        "injective"
      )
        .map(
          item =>
            item.id
        )
        .includes(
          "tokenAnalysis"
        )
    );
  }
);
