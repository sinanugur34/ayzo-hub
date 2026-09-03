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
  "keeps Bitcoin planned until its UTXO engine exists",
  () => {
    assert.equal(
      NETWORKS.bitcoin.status,
      "planned"
    );

    assert.equal(
      NETWORKS.bitcoin.family,
      "bitcoin"
    );

    assert.equal(
      NETWORKS.bitcoin.chainId,
      null
    );
  }
);

test(
  "keeps Polygon, Optimism, and Avalanche live after provider quality gates",
  () => {
    for (
      const [
        networkId,
        chainId,
      ] of [
        ["polygon", 137],
        ["optimism", 10],
        ["avalanche", 43114],
      ] as const
    ) {
      assert.equal(
        NETWORKS[
          networkId
        ].status,
        "live"
      );

      assert.equal(
        NETWORKS[
          networkId
        ].chainId,
        chainId
      );

      assert.ok(
        NETWORKS[
          networkId
        ].capabilities
          .length > 0
      );
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


test(
  "keeps Linea, Scroll, and Mantle live after provider quality gates",
  () => {
    for (
      const [
        networkId,
        chainId,
      ] of [
        ["linea", 59144],
        ["scroll", 534352],
        ["mantle", 5000],
      ] as const
    ) {
      assert.equal(
        NETWORKS[
          networkId
        ].status,
        "live"
      );

      assert.equal(
        NETWORKS[
          networkId
        ].chainId,
        chainId
      );

      assert.ok(
        NETWORKS[
          networkId
        ].capabilities
          .length > 0
      );
    }
  }
);


test(
  "keeps Sonic and Monad live after provider quality gates",
  () => {
    for (
      const [
        networkId,
        chainId,
      ] of [
        ["sonic", 146],
        ["monad", 143],
      ] as const
    ) {
      assert.equal(
        NETWORKS[
          networkId
        ].status,
        "live"
      );

      assert.equal(
        NETWORKS[
          networkId
        ].chainId,
        chainId
      );

      assert.ok(
        NETWORKS[
          networkId
        ].capabilities
          .length > 0
      );
    }
  }
);
