import assert from "node:assert/strict";
import test from "node:test";

import {
  NETWORK_IDS,
} from "../../src/lib/networks/registry";

import {
  MOBILE_NETWORK_ADAPTERS,
  getMobileLiveNetworkIds,
  getMobileNetworkSupport,
} from "./mobileNetworkSupport";

test(
  "mobile adapter registry covers all canonical networks",
  () => {
    assert.equal(
      NETWORK_IDS.length,
      22
    );

    assert.equal(
      Object.keys(
        MOBILE_NETWORK_ADAPTERS
      ).length,
      22
    );
  }
);

test(
  "twenty networks are mobile live after TON promotion",
  () => {
    assert.equal(
      getMobileLiveNetworkIds()
        .length,
      20
    );

    assert.equal(
      getMobileNetworkSupport(
        "ton"
      ).analysisEnabled,
      true
    );
  }
);

test(
  "TON uses dedicated native mobile adapter",
  () => {
    const support =
      getMobileNetworkSupport(
        "ton"
      );

    assert.equal(
      support.adapter,
      "ton"
    );

    assert.equal(
      support.canonicalLive,
      true
    );

    assert.equal(
      support.engineReady,
      true
    );

    assert.equal(
      support.analysisEnabled,
      true
    );
  }
);

test(
  "Stellar and Hyperliquid remain hidden",
  () => {
    for (
      const id of [
        "stellar",
        "hyperliquid",
      ] as const
    ) {
      assert.equal(
        getMobileNetworkSupport(
          id
        ).analysisEnabled,
        false
      );
    }
  }
);
