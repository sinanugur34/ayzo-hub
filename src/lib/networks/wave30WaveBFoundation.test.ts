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
  "Wave30 B registers NEAR and Hedera without changing the accepted live count",
  () => {
    assert.equal(
      NETWORK_IDS.length,
      26
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
      24
    );

    assert.equal(
      NETWORKS.near.status,
      "development"
    );

    assert.equal(
      NETWORKS.hedera.status,
      "development"
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
  "NEAR and Hedera remain unavailable through the public intelligence router",
  () => {
    for (
      const id of
      [
        "near",
        "hedera",
      ] as const
    ) {
      const result =
        resolveIntelligenceNetwork(
          id
        );

      assert.equal(
        result.ok,
        false
      );

      if (result.ok) {
        assert.fail(
          `${id} must remain gated`
        );
      }

      assert.equal(
        result.code,
        "NETWORK_NOT_AVAILABLE"
      );

      assert.equal(
        result.networkId,
        id
      );
    }
  }
);
