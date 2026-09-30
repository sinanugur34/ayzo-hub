import assert from "node:assert/strict";
import test from "node:test";

import {
  NETWORKS,
  NETWORK_IDS,
} from "./registry";

import {
  resolveIntelligenceNetwork,
} from "../intelligence/router";

const PROMOTED = [
  "litecoin",
  "sui",
  "ton",
] as const;

const REMAINING = [
  "stellar",
  "hyperliquid",
] as const;

test(
  "wave 22 has twenty live networks after TON promotion",
  () => {
    assert.equal(
      NETWORK_IDS.length,
      22
    );

    assert.equal(
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id].status ===
          "live"
      ).length,
      20
    );

    for (
      const id of
      PROMOTED
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
    }

    for (
      const id of
      REMAINING
    ) {
      assert.equal(
        NETWORKS[id].status,
        "development"
      );

      assert.equal(
        resolveIntelligenceNetwork(
          id
        ).ok,
        false
      );
    }
  }
);
