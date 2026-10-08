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
  "routes Hyperliquid through native dual-surface engine",
  () => {
    const result =
      resolveIntelligenceNetwork(
        "hyperliquid"
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        "Hyperliquid failed live resolution."
      );
    }

    assert.equal(
      result.engine,
      "hyperliquid"
    );

    assert.equal(
      NETWORKS.hyperliquid.status,
      "live"
    );
  }
);

test(
  "Hyperliquid is live on web and mobile",
  () => {
    assert.equal(
      isLiveAnalysisNetworkId(
        "hyperliquid"
      ),
      true
    );

    assert.equal(
      getMobileNetworkSupport(
        "hyperliquid"
      ).analysisEnabled,
      true
    );
  }
);

test(
  "explicit Hyperliquid selection survives ambiguous EVM shape",
  () => {
    assert.equal(
      resolveSelectedNetworkForAddress(
        "hyperliquid",
        "evm"
      ),
      "hyperliquid"
    );
  }
);

test(
  "generic EVM addresses require explicit EVM network selection",
  () => {
    for (const selected of [
      "solana",
      "bitcoin",
      "tron",
    ] as const) {
      assert.equal(
        resolveSelectedNetworkForAddress(selected, "evm"),
        null
      );
    }

    assert.equal(
      resolveSelectedNetworkForAddress("ethereum", "evm"),
      "ethereum"
    );

    assert.equal(
      resolveSelectedNetworkForAddress("hyperliquid", "evm"),
      "hyperliquid"
    );
  }
);
