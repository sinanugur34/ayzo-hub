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
  "routes Aptos through live native engine",
  () => {
    const result =
      resolveIntelligenceNetwork(
        "aptos"
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        "Aptos failed live resolution."
      );
    }

    assert.equal(
      result.engine,
      "aptos"
    );

    assert.equal(
      NETWORKS.aptos.status,
      "live"
    );
  }
);

test(
  "Aptos is live on web and mobile",
  () => {
    assert.equal(
      isLiveAnalysisNetworkId(
        "aptos"
      ),
      true
    );

    assert.equal(
      getMobileNetworkSupport(
        "aptos"
      ).analysisEnabled,
      true
    );
  }
);

test(
  "Aptos requires explicit selection for ambiguous hexadecimal addresses",
  () => {
    assert.equal(
      resolveSelectedNetworkForAddress(
        "aptos",
        "aptos"
      ),
      "aptos"
    );

    assert.equal(
      resolveSelectedNetworkForAddress(
        "ethereum",
        "aptos"
      ),
      null
    );
  }
);
