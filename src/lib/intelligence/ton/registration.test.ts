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
  "routes TON through live native engine",
  () => {
    const result =
      resolveIntelligenceNetwork(
        "ton"
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        "TON failed live resolution."
      );
    }

    assert.equal(
      result.engine,
      "ton"
    );

    assert.equal(
      NETWORKS.ton.status,
      "live"
    );
  }
);

test(
  "TON is live on web and mobile",
  () => {
    assert.equal(
      isLiveAnalysisNetworkId(
        "ton"
      ),
      true
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
  "address selection resolves TON",
  () => {
    assert.equal(
      resolveSelectedNetworkForAddress(
        "ethereum",
        "ton"
      ),
      "ton"
    );
  }
);
