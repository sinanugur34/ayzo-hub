import assert from "node:assert/strict";
import test from "node:test";

import {
  NETWORKS,
} from "@/lib/networks/registry";

import {
  resolveIntelligenceNetwork,
} from "@/lib/intelligence/router";

import {
  isLiveAnalysisNetworkId,
  resolveSelectedNetworkForAddress,
} from "@/lib/networks/addressSelection";

import {
  getMobileNetworkSupport,
} from "../../../../mobile/src/mobileNetworkSupport";

test(
  "routes Sui through live native engine",
  () => {
    const result =
      resolveIntelligenceNetwork(
        "sui"
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        "Sui failed live resolution."
      );
    }

    assert.equal(
      result.engine,
      "sui"
    );

    assert.equal(
      NETWORKS.sui.status,
      "live"
    );
  }
);

test(
  "Sui is live on web and mobile",
  () => {
    assert.equal(
      isLiveAnalysisNetworkId(
        "sui"
      ),
      true
    );

    assert.equal(
      getMobileNetworkSupport(
        "sui"
      ).analysisEnabled,
      true
    );
  }
);

test(
  "explicit address selection resolves Sui",
  () => {
    assert.equal(
      resolveSelectedNetworkForAddress(
        "ethereum",
        "sui"
      ),
      "sui"
    );
  }
);
