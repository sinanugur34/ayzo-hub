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
  "routes Stellar through live native engine",
  () => {
    const result =
      resolveIntelligenceNetwork(
        "stellar"
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        "Stellar failed live resolution."
      );
    }

    assert.equal(
      result.engine,
      "stellar"
    );

    assert.equal(
      NETWORKS.stellar.status,
      "live"
    );
  }
);

test(
  "Stellar is live on web and mobile",
  () => {
    assert.equal(
      isLiveAnalysisNetworkId(
        "stellar"
      ),
      true
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
  "address selection resolves Stellar",
  () => {
    assert.equal(
      resolveSelectedNetworkForAddress(
        "ethereum",
        "stellar"
      ),
      "stellar"
    );
  }
);
