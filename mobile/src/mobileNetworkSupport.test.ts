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
  "mobile adapter registry covers all twenty-six canonical registrations",
  () => {
    assert.equal(
      NETWORK_IDS.length,
      26
    );

    assert.equal(
      Object.keys(
        MOBILE_NETWORK_ADAPTERS
      ).length,
      26
    );
  }
);

test(
  "twenty-five accepted networks are mobile live after Hedera acceptance",
  () => {
    assert.equal(
      getMobileLiveNetworkIds()
        .length,
      25
    );

    for (
      const id of
      getMobileLiveNetworkIds()
    ) {
      assert.equal(
        getMobileNetworkSupport(
          id
        ).analysisEnabled,
        true,
        `${id} must remain enabled`
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

test(
  "NEAR remains disabled while Hedera is enabled after Wave B acceptance",
  () => {
    const near =
      getMobileNetworkSupport(
        "near"
      );

    const hedera =
      getMobileNetworkSupport(
        "hedera"
      );

    assert.equal(
      near.adapter,
      "near"
    );

    assert.equal(
      near.canonicalLive,
      false
    );

    assert.equal(
      near.engineReady,
      false
    );

    assert.equal(
      near.analysisEnabled,
      false
    );

    assert.equal(
      hedera.adapter,
      "hedera"
    );

    assert.equal(
      hedera.canonicalLive,
      true
    );

    assert.equal(
      hedera.engineReady,
      true
    );

    assert.equal(
      hedera.analysisEnabled,
      true
    );
  }
);
