import assert from "node:assert/strict";
import test from "node:test";

import {
  NETWORKS,
  NETWORK_IDS,
} from "./registry";

import {
  getMobileNetworkSupport,
} from "../../../mobile/src/mobileNetworkSupport";

test(
  "Zcash and Algorand remain development gated",
  () => {
    assert.equal(
      NETWORKS.zcash.status,
      "development"
    );

    assert.equal(
      NETWORKS.algorand.status,
      "development"
    );

    assert.equal(
      getMobileNetworkSupport(
        "zcash"
      ).analysisEnabled,
      false
    );

    assert.equal(
      getMobileNetworkSupport(
        "algorand"
      ).analysisEnabled,
      false
    );
  }
);

test(
  "expansion registration preserves twenty-five live networks",
  () => {
    const live =
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id].status ===
          "live"
      );

    assert.equal(
      NETWORK_IDS.length,
      28
    );

    assert.equal(
      live.length,
      25
    );
  }
);
