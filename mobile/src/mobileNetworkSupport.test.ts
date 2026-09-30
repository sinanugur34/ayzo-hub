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
  "mobile adapter registry covers all twenty-two canonical networks",
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
  "all twenty-two canonical networks are mobile live",
  () => {
    assert.equal(
      getMobileLiveNetworkIds()
        .length,
      22
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
