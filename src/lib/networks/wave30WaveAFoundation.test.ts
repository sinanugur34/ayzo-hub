import assert from "node:assert/strict";
import test from "node:test";

import {
  NETWORKS,
  NETWORK_IDS,
} from "./registry";

import {
  resolveIntelligenceNetwork,
} from "../intelligence/router";

test(
  "Wave30 A preserves twenty-four accepted live networks after later development registration",
  () => {
    const live =
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id]
            .status ===
          "live"
      );

    assert.equal(
      live.length,
      24
    );

    assert.equal(
      NETWORKS.cardano.status,
      "live"
    );

    assert.equal(
      NETWORKS.aptos.status,
      "live"
    );
  }
);

test(
  "Cardano resolves to its native deep engine",
  () => {
    const result =
      resolveIntelligenceNetwork(
        "cardano"
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        "Cardano must resolve."
      );
    }

    assert.equal(
      result.networkId,
      "cardano"
    );

    assert.equal(
      result.engine,
      "cardano"
    );

    assert.equal(
      result.network.family,
      "cardano"
    );
  }
);

test(
  "Aptos resolves to its native deep engine",
  () => {
    const result =
      resolveIntelligenceNetwork(
        "aptos"
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        "Aptos must resolve."
      );
    }

    assert.equal(
      result.networkId,
      "aptos"
    );

    assert.equal(
      result.engine,
      "aptos"
    );

    assert.equal(
      result.network.family,
      "aptos"
    );
  }
);
