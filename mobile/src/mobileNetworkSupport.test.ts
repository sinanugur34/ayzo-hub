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
  "mobile adapter registry covers all twenty-four canonical networks",
  () => {
    assert.equal(
      NETWORK_IDS.length,
      24
    );

    assert.equal(
      Object.keys(
        MOBILE_NETWORK_ADAPTERS
      ).length,
      24
    );
  }
);

test(
  "all twenty-four canonical networks are mobile live",
  () => {
    assert.equal(
      getMobileLiveNetworkIds()
        .length,
      24
    );

    for (
      const id of
      NETWORK_IDS
    ) {
      assert.equal(
        getMobileNetworkSupport(
          id
        ).analysisEnabled,
        true,
        `${id} must be enabled`
      );
    }
  }
);

test(
  "Hyperliquid uses dedicated native mobile adapter",
  () => {
    const support =
      getMobileNetworkSupport(
        "hyperliquid"
      );

    assert.equal(
      support.adapter,
      "hyperliquid"
    );

    assert.equal(
      support.analysisEnabled,
      true
    );
  }
);

test(
  "Cardano and Aptos use dedicated native mobile adapters",
  () => {
    const cardano =
      getMobileNetworkSupport(
        "cardano"
      );

    const aptos =
      getMobileNetworkSupport(
        "aptos"
      );

    assert.equal(
      cardano.adapter,
      "cardano"
    );

    assert.equal(
      cardano.analysisEnabled,
      true
    );

    assert.equal(
      aptos.adapter,
      "aptos"
    );

    assert.equal(
      aptos.analysisEnabled,
      true
    );
  }
);
