import assert from "node:assert/strict";
import test from "node:test";

import {
  getAskAyzoNetworkProfile,
} from "@/lib/account/askAyzoNetworkRegistry";

import {
  buildHistoricalSnapshot,
} from "@/lib/account/historicalSnapshot";

import {
  getMobileNetworkSupport,
} from "../../../mobile/src/mobileNetworkSupport";

import {
  getProductToolsForNetwork,
} from "@/lib/networks/productCapabilities";

import {
  NETWORKS,
} from "@/lib/networks/registry";

test(
  "Zcash product parity remains intact after live promotion",
  () => {
    const profile =
      getAskAyzoNetworkProfile(
        "zcash"
      );

    assert.equal(
      profile.adapter,
      "zcash"
    );

    assert.equal(
      profile.capabilities.includes(
        "canonical-transaction"
      ),
      true
    );

    const tools =
      getProductToolsForNetwork(
        "zcash"
      ).map(
        item =>
          item.id
      );

    assert.equal(
      tools.includes(
        "walletAnalysis"
      ),
      true
    );

    assert.equal(
      tools.includes(
        "fundingTrace"
      ),
      true
    );

    assert.equal(
      tools.includes(
        "connections"
      ),
      true
    );

    assert.equal(
      NETWORKS.zcash.status,
      "live"
    );

    assert.equal(
      getMobileNetworkSupport(
        "zcash"
      ).analysisEnabled,
      true
    );
  }
);

test(
  "Algorand product parity remains intact after live promotion",
  () => {
    const profile =
      getAskAyzoNetworkProfile(
        "algorand"
      );

    assert.equal(
      profile.adapter,
      "algorand"
    );

    assert.equal(
      profile.capabilities.includes(
        "authorities"
      ),
      true
    );

    const tools =
      getProductToolsForNetwork(
        "algorand"
      ).map(
        item =>
          item.id
      );

    assert.equal(
      tools.includes(
        "tokenAnalysis"
      ),
      true
    );

    assert.equal(
      tools.includes(
        "walletAnalysis"
      ),
      true
    );

    assert.equal(
      tools.includes(
        "fundingTrace"
      ),
      true
    );

    assert.equal(
      tools.includes(
        "connections"
      ),
      true
    );

    assert.equal(
      NETWORKS.algorand.status,
      "live"
    );

    assert.equal(
      getMobileNetworkSupport(
        "algorand"
      ).analysisEnabled,
      true
    );
  }
);

test(
  "Historical Evidence accepts Zcash and Algorand native shapes",
  () => {
    const zcash =
      buildHistoricalSnapshot(
        "zcash",
        {
          coverage:
            "limited",

          transactions: [
            {
              txid:
                "a".repeat(64),
              height:
                100,
              timestamp:
                "2026-01-01T00:00:00.000Z",
            },
          ],

          derived: {
            flow: {
              incomingTransactionCount:
                1,
            },

            counterparties: {
              count:
                2,
            },

            observedFunding: {
              sourceAddress:
                "transparent-source",
            },
          },

          modules:
            {},

          findings:
            [],
        }
      );

    assert.ok(
      zcash
    );

    assert.equal(
      zcash?.network,
      "zcash"
    );

    assert.equal(
      zcash?.metrics
        .transactionCount,
      1
    );

    const algorand =
      buildHistoricalSnapshot(
        "algorand",
        {
          coverage:
            "limited",

          account: {
            amount:
              "1000000",
          },

          assets: [
            {
              assetId:
                1,
            },
          ],

          history: {
            transactions: [
              {
                id:
                  "TX",
                round:
                  123,
                timestamp:
                  "2026-01-01T00:00:00.000Z",
              },
            ],
          },

          derived: {
            flow: {
              incomingTransferCount:
                1,
            },

            counterparties: {
              count:
                1,
            },

            observedFunding: {
              source:
                "ALGO-SOURCE",
            },
          },

          modules:
            {},

          findings:
            [],
        }
      );

    assert.ok(
      algorand
    );

    assert.equal(
      algorand?.network,
      "algorand"
    );

    assert.equal(
      algorand?.metrics
        .transactionCount,
      1
    );
  }
);
