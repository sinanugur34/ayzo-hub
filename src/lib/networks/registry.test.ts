import assert from "node:assert/strict";
import test from "node:test";

import {
  NETWORKS,
  NETWORK_IDS,
} from "./registry";

test(
  "keeps the fourteen-network registry authoritative",
  () => {
    assert.equal(
      NETWORK_IDS.length,
      14
    );

    assert.equal(
      NETWORKS.solana.status,
      "live"
    );

    assert.equal(
      NETWORKS.ethereum.status,
      "live"
    );

    assert.equal(
      NETWORKS.base.status,
      "live"
    );

    assert.equal(
      NETWORKS.base.family,
      "evm"
    );

    assert.equal(
      NETWORKS.base.chainId,
      8453
    );
  }
);

test(
  "keeps unvalidated rollout networks planned",
  () => {
    for (
      const networkId of [
        "polygon",
        "optimism",
        "avalanche",
        "linea",
        "scroll",
        "mantle",
        "sonic",
        "monad",
        "bitcoin",
      ] as const
    ) {
      assert.equal(
        NETWORKS[
          networkId
        ].status,
        "planned"
      );

      if (
        NETWORKS[
          networkId
        ].family === "evm"
      ) {
        assert.deepEqual(
          NETWORKS[
            networkId
          ].capabilities,
          []
        );
      }
    }
  }
);


test(
  "keeps BNB and Arbitrum live after provider quality gates",
  () => {
    assert.equal(
      NETWORKS.bnb.status,
      "live"
    );

    assert.equal(
      NETWORKS.bnb.chainId,
      56
    );

    assert.equal(
      NETWORKS.bnb.nativeCurrency,
      "BNB"
    );

    assert.equal(
      NETWORKS.arbitrum.status,
      "live"
    );

    assert.equal(
      NETWORKS.arbitrum.chainId,
      42161
    );

    assert.equal(
      NETWORKS.arbitrum.nativeCurrency,
      "ETH"
    );
  }
);
