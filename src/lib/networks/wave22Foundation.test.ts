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
  "wave 22 has all twenty-two networks live",
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
      22
    );

    for (
      const id of
      NETWORK_IDS
    ) {
      assert.equal(
        NETWORKS[id].status,
        "live",
        `${id} must be live`
      );

      assert.equal(
        resolveIntelligenceNetwork(
          id
        ).ok,
        true,
        `${id} must resolve`
      );
    }
  }
);
