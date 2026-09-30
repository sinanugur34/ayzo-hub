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
  "stellar",
] as const;

test(
  "wave 22 has twenty-one live networks after Stellar promotion",
  () => {
    assert.equal(
      NETWORK_IDS.length,
      22
    );

    const live =
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id]
            .status ===
          "live"
      );

    assert.equal(
      live.length,
      21
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

    assert.equal(
      NETWORKS.hyperliquid.status,
      "development"
    );

    assert.equal(
      resolveIntelligenceNetwork(
        "hyperliquid"
      ).ok,
      false
    );
  }
);
