import assert from "node:assert/strict";
import test from "node:test";

import {
  NETWORKS,
  NETWORK_IDS,
} from "./registry";

import {
  resolveIntelligenceNetwork,
} from "../intelligence/router";

test(
  "Wave30 B promotes Hedera while NEAR remains deferred",
  () => {
    assert.equal(
      NETWORK_IDS.length,
      28
    );

    const live =
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id]
            .status ===
          "live"
      );

    assert.equal(
      live.length,
      25
    );

    assert.equal(
      NETWORKS.near.status,
      "development"
    );

    assert.equal(
      NETWORKS.hedera.status,
      "live"
    );
  }
);

test(
  "NEAR has a dedicated native family and conservative evidence capabilities",
  () => {
    assert.equal(
      NETWORKS.near.family,
      "near"
    );

    assert.equal(
      NETWORKS.near.chainId,
      null
    );

    assert.equal(
      NETWORKS.near.nativeCurrency,
      "NEAR"
    );

    assert.ok(
      NETWORKS.near.capabilities.includes(
        "assetVerification"
      )
    );

    assert.ok(
      NETWORKS.near.capabilities.includes(
        "addressFlows"
      )
    );

    assert.ok(
      NETWORKS.near.capabilities.includes(
        "walletRelationships"
      )
    );

    assert.ok(
      NETWORKS.near.capabilities.includes(
        "fundingIntelligence"
      )
    );
  }
);

test(
  "Hedera has a dedicated native family and conservative evidence capabilities",
  () => {
    assert.equal(
      NETWORKS.hedera.family,
      "hedera"
    );

    assert.equal(
      NETWORKS.hedera.chainId,
      null
    );

    assert.equal(
      NETWORKS.hedera.nativeCurrency,
      "HBAR"
    );

    assert.ok(
      NETWORKS.hedera.capabilities.includes(
        "assetVerification"
      )
    );

    assert.ok(
      NETWORKS.hedera.capabilities.includes(
        "addressFlows"
      )
    );

    assert.ok(
      NETWORKS.hedera.capabilities.includes(
        "walletRelationships"
      )
    );

    assert.ok(
      NETWORKS.hedera.capabilities.includes(
        "fundingIntelligence"
      )
    );
  }
);

test(
  "NEAR remains unavailable through the public intelligence router",
  () => {
    const result =
      resolveIntelligenceNetwork(
        "near"
      );

    assert.equal(
      result.ok,
      false
    );

    if (result.ok) {
      assert.fail(
        "NEAR must remain deferred."
      );
    }

    assert.equal(
      result.code,
      "NETWORK_NOT_AVAILABLE"
    );

    assert.equal(
      result.networkId,
      "near"
    );
  }
);

test(
  "Hedera resolves through the public intelligence router after acceptance",
  () => {
    const result =
      resolveIntelligenceNetwork(
        "hedera"
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        "Hedera must resolve after acceptance."
      );
    }

    assert.equal(
      result.networkId,
      "hedera"
    );

    assert.equal(
      result.engine,
      "hedera"
    );

    assert.equal(
      result.network.family,
      "hedera"
    );
  }
);
