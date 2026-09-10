import assert from "node:assert/strict";
import test from "node:test";

import {
  NETWORKS,
} from "@/lib/networks/registry";

import {
  resolveIntelligenceNetwork,
} from "@/lib/intelligence/router";

test(
  "registers TRON as development-only",
  () => {
    assert.equal(
      NETWORKS.tron.family,
      "tron"
    );

    assert.equal(
      NETWORKS.tron.status,
      "development"
    );

    assert.equal(
      NETWORKS.tron.nativeCurrency,
      "TRX"
    );

    assert.deepEqual(
      NETWORKS.tron.capabilities,
      ["addressFlows"]
    );
  }
);

test(
  "TRON remains unavailable through the live router",
  () => {
    const result =
      resolveIntelligenceNetwork(
        "tron"
      );

    assert.equal(
      result.ok,
      false
    );

    if (result.ok) {
      throw new Error(
        "TRON unexpectedly resolved as live."
      );
    }

    assert.equal(
      result.code,
      "NETWORK_NOT_AVAILABLE"
    );

    assert.equal(
      result.networkId,
      "tron"
    );
  }
);
