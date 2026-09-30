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
  "routes Cardano through live native engine",
  () => {
    const result =
      resolveIntelligenceNetwork(
        "cardano"
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        "Cardano failed live resolution."
      );
    }

    assert.equal(
      result.engine,
      "cardano"
    );

    assert.equal(
      NETWORKS.cardano.status,
      "live"
    );
  }
);

test(
  "Cardano is live on web and mobile",
  () => {
    assert.equal(
      isLiveAnalysisNetworkId(
        "cardano"
      ),
      true
    );

    assert.equal(
      getMobileNetworkSupport(
        "cardano"
      ).analysisEnabled,
      true
    );
  }
);

test(
  "detected Cardano address kind resolves Cardano",
  () => {
    assert.equal(
      resolveSelectedNetworkForAddress(
        "ethereum",
        "cardano"
      ),
      "cardano"
    );
  }
);
