import assert from "node:assert/strict";
import test from "node:test";

import {
  NETWORKS,
  NETWORK_IDS,
} from "./registry";

import {
  resolveIntelligenceNetwork,
} from "@/lib/intelligence/router";

import {
  getMobileNetworkSupport,
} from "../../../mobile/src/mobileNetworkSupport";

const expansion = [
  "polkadot",
  "cosmos",
  "injective",
] as const;

test(
  "multi-network expansion promotes all three accepted networks",
  () => {
    assert.equal(
      NETWORK_IDS.length,
      31
    );

    for (
      const id of expansion
    ) {
      assert.equal(
        NETWORKS[id].status,
        "live"
      );
    }
  }
);

test(
  "multi-network expansion reaches thirty live networks",
  () => {
    assert.equal(
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id].status ===
            "live"
      ).length,
      30
    );
  }
);

test(
  "promoted native networks resolve on public and mobile surfaces",
  () => {
    for (
      const id of expansion
    ) {
      assert.equal(
        resolveIntelligenceNetwork(
          id
        ).ok,
        true,
        id
      );

      assert.equal(
        getMobileNetworkSupport(
          id
        ).analysisEnabled,
        true,
        id
      );
    }
  }
);
