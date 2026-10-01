import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  NETWORKS,
  NETWORK_IDS,
} from "@/lib/networks/registry";

import {
  resolveIntelligenceNetwork,
} from "@/lib/intelligence/router";

import {
  getMobileNetworkSupport,
} from "../../../mobile/src/mobileNetworkSupport";

const finalFive = [
  "zcash",
  "algorand",
  "polkadot",
  "cosmos",
  "injective",
] as const;

const home =
  fs.readFileSync(
    "src/app/page.tsx",
    "utf8"
  );

const detector =
  fs.readFileSync(
    "src/app/api/address-detect/route.ts",
    "utf8"
  );

test(
  "Final Five promotion leaves NEAR as only deferred registration",
  () => {
    assert.equal(
      NETWORK_IDS.length,
      31
    );

    assert.equal(
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id].status ===
            "live"
      ).length,
      30
    );

    assert.equal(
      NETWORKS.near.status,
      "development"
    );

    for (
      const id of finalFive
    ) {
      assert.equal(
        NETWORKS[id].status,
        "live"
      );

      assert.equal(
        resolveIntelligenceNetwork(
          id
        ).ok,
        true
      );

      assert.equal(
        getMobileNetworkSupport(
          id
        ).analysisEnabled,
        true
      );
    }
  }
);

test(
  "home has executable report wiring for every Final Five network",
  () => {
    for (
      const component of [
        "ZcashIntelligenceReport",
        "AlgorandIntelligenceReport",
        "PolkadotIntelligenceReport",
        "CosmosIntelligenceReport",
        "InjectiveIntelligenceReport",
      ]
    ) {
      assert.ok(
        home.includes(
          component
        ),
        component
      );
    }

    assert.ok(
      home.includes(
        "finalFiveAnalysis"
      )
    );

    for (
      const id of finalFive
    ) {
      assert.ok(
        home.includes(
          `"${id}"`
        ),
        id
      );
    }
  }
);

test(
  "server address detection understands every promoted native format",
  () => {
    for (
      const validator of [
        "normalizeZcashTransparentAddress",
        "normalizeAlgorandAddress",
        "normalizePolkadotAddress",
        "normalizeCosmosAddress",
        "normalizeInjectiveAddress",
      ]
    ) {
      assert.ok(
        detector.includes(
          validator
        ),
        validator
      );
    }

    for (
      const id of finalFive
    ) {
      assert.ok(
        detector.includes(
          `"${id}"`
        ),
        id
      );
    }
  }
);
