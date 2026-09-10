import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveIntelligenceNetwork,
} from "@/lib/intelligence/router";

import {
  NETWORKS,
} from "@/lib/networks/registry";

test(
  "registers TRON as live after mainnet acceptance",
  () => {
    assert.equal(
      NETWORKS.tron.family,
      "tron"
    );

    assert.equal(
      NETWORKS.tron.status,
      "live"
    );

    assert.equal(
      NETWORKS.tron.nativeCurrency,
      "TRX"
    );

    assert.deepEqual(
      NETWORKS.tron.capabilities,
      [
        "addressFlows",
      ]
    );
  }
);

test(
  "routes live TRON through the TRON intelligence engine",
  () => {
    const result =
      resolveIntelligenceNetwork(
        "tron"
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        "Live TRON unexpectedly failed router resolution."
      );
    }

    assert.equal(
      result.networkId,
      "tron"
    );

    assert.equal(
      result.engine,
      "tron"
    );
  }
);
