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
] as const;

const REMAINING = [
  "ton",
  "hyperliquid",
  "stellar",
] as const;

test(
  "registry has 22 networks with Litecoin and Sui live",
  () => {
    assert.equal(
      NETWORK_IDS.length,
      22
    );

    const live =
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id].status ===
          "live"
      );

    assert.equal(
      live.length,
      19
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
