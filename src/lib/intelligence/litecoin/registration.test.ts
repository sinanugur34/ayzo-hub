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
  "routes Litecoin through live native engine",
  () => {
    const result =
      resolveIntelligenceNetwork(
        "litecoin"
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        "Litecoin failed live resolution."
      );
    }

    assert.equal(
      result.engine,
      "litecoin"
    );

    assert.equal(
      NETWORKS.litecoin.status,
      "live"
    );
  }
);

test(
  "Litecoin is live on web and mobile",
  () => {
    assert.equal(
      isLiveAnalysisNetworkId(
        "litecoin"
      ),
      true
    );

    assert.equal(
      getMobileNetworkSupport(
        "litecoin"
      ).analysisEnabled,
      true
    );
  }
);

test(
  "address selection resolves Litecoin",
  () => {
    assert.equal(
      resolveSelectedNetworkForAddress(
        "ethereum",
        "litecoin"
      ),
      "litecoin"
    );
  }
);
