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
  "twenty-one networks are mobile live after Stellar promotion",
  () => {
    assert.equal(
      getMobileLiveNetworkIds()
        .length,
      21
    );

    assert.equal(
      getMobileNetworkSupport(
        "stellar"
      ).analysisEnabled,
      true
    );
  }
);

test(
  "Stellar uses dedicated native mobile adapter",
  () => {
    const support =
      getMobileNetworkSupport(
        "stellar"
      );

    assert.equal(
      support.adapter,
      "stellar"
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
  "Hyperliquid remains hidden",
  () => {
    assert.equal(
      getMobileNetworkSupport(
        "hyperliquid"
      ).analysisEnabled,
      false
    );
  }
);
