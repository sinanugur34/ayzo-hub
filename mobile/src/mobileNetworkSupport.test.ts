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
  "only the twenty-four accepted networks are mobile live",
  () => {
    assert.equal(
      getMobileLiveNetworkIds()
        .length,
      24
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
  "NEAR and Hedera adapters are registered but remain disabled before Wave B acceptance",
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
      false
    );

    assert.equal(
      hedera.engineReady,
      false
    );

    assert.equal(
      hedera.analysisEnabled,
      false
    );
  }
);
