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
  "multi-network expansion registers all three networks",
  () => {
    assert.equal(
      NETWORK_IDS.length,
      31
    );

    for (
      const id of
      expansion
    ) {
      assert.equal(
        NETWORKS[id].status,
        "development"
      );
    }
  }
);

test(
  "multi-network expansion preserves twenty-five live networks",
  () => {
    const live =
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id].status ===
            "live"
      );

    assert.equal(
      live.length,
      25
    );
  }
);

test(
  "new networks remain fail closed on public and mobile surfaces",
  () => {
    for (
      const id of
      expansion
    ) {
      const resolution =
        resolveIntelligenceNetwork(
          id
        );

      assert.equal(
        resolution.ok,
        false
      );

      assert.equal(
        getMobileNetworkSupport(
          id
        ).analysisEnabled,
        false
      );
    }
  }
);
