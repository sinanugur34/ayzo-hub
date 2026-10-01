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
  "Zcash and Algorand are live after full promotion acceptance",
  () => {
    for (
      const id of [
        "zcash",
        "algorand",
      ] as const
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
    }
  }
);

test(
  "expansion promotion exposes thirty live networks",
  () => {
    const live =
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id].status ===
            "live"
      );

    assert.equal(
      NETWORK_IDS.length,
      31
    );

    assert.equal(
      live.length,
      30
    );

    assert.equal(
      NETWORKS.near.status,
      "development"
    );
  }
);
