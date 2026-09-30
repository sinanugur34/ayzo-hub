import assert from "node:assert/strict";
import test from "node:test";

import {
  NETWORKS,
  NETWORK_IDS,
} from "./registry";

test(
  "keeps twenty-two registered networks with nineteen currently live",
  () => {
    assert.equal(
      NETWORK_IDS.length,
      22
    );

    const liveNetworkCount =
      NETWORK_IDS.filter(
        networkId =>
          NETWORKS[
            networkId
          ].status === "live"
      ).length;

    assert.equal(
      liveNetworkCount,
      19
    );

    assert.equal(
      NETWORKS.litecoin.status,
      "live"
    );

    assert.equal(
      NETWORKS.sui.status,
      "live"
    );

    for (
      const networkId of [
        "ton",
        "hyperliquid",
        "stellar",
      ] as const
    ) {
      assert.equal(
        NETWORKS[
          networkId
        ].status,
        "development"
      );
    }

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
  "keeps Bitcoin live after intelligence quality gates",
  () => {
    assert.equal(
      NETWORKS.bitcoin.status,
      "live"
    );

    assert.equal(
      NETWORKS.bitcoin.family,
      "bitcoin"
    );

    assert.equal(
      NETWORKS.bitcoin.chainId,
      null
    );

    assert.equal(
      NETWORKS.bitcoin.nativeCurrency,
      "BTC"
    );

    assert.ok(
      NETWORKS.bitcoin
        .capabilities.length > 0
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


test(
  "keeps Dogecoin live after mainnet acceptance passes",
  () => {
    assert.equal(
      NETWORKS.dogecoin.status,
      "live"
    );

    assert.equal(
      NETWORKS.dogecoin.family,
      "dogecoin"
    );

    assert.equal(
      NETWORKS.dogecoin.nativeCurrency,
      "DOGE"
    );

    assert.equal(
      NETWORKS.dogecoin.chainId,
      null
    );

    assert.ok(
      NETWORKS.dogecoin
        .capabilities
        .includes(
          "addressFlows"
        )
    );
  }
);

test(
  "registers XRP Ledger as a live native network",
  () => {
    assert.equal(
      NETWORKS.xrp.status,
      "live"
    );

    assert.equal(
      NETWORKS.xrp.family,
      "xrpl"
    );

    assert.equal(
      NETWORKS.xrp.nativeCurrency,
      "XRP"
    );

    assert.equal(
      NETWORKS.xrp.chainId,
      null
    );

    assert.ok(
      NETWORKS.xrp.capabilities.includes(
        "addressFlows"
      )
    );
  }
);


test(
  "keeps Litecoin live after full UTXO quality gates",
  () => {
    assert.equal(
      NETWORKS.litecoin.status,
      "live"
    );

    assert.equal(
      NETWORKS.litecoin.family,
      "litecoin"
    );

    assert.equal(
      NETWORKS.litecoin.nativeCurrency,
      "LTC"
    );

    assert.ok(
      NETWORKS.litecoin
        .capabilities
        .includes(
          "addressFlows"
        )
    );

    assert.ok(
      NETWORKS.litecoin
        .capabilities
        .includes(
          "walletRelationships"
        )
    );

    assert.ok(
      NETWORKS.litecoin
        .capabilities
        .includes(
          "fundingIntelligence"
        )
    );

    assert.ok(
      NETWORKS.litecoin
        .capabilities
        .includes(
          "fundingProvenance"
        )
    );
  }
);


test(
  "keeps Sui live after GraphQL quality gates",
  () => {
    assert.equal(
      NETWORKS.sui.status,
      "live"
    );

    assert.equal(
      NETWORKS.sui.family,
      "sui"
    );

    assert.equal(
      NETWORKS.sui.nativeCurrency,
      "SUI"
    );

    assert.ok(
      NETWORKS.sui
        .capabilities
        .includes(
          "addressFlows"
        )
    );

    assert.ok(
      NETWORKS.sui
        .capabilities
        .includes(
          "walletRelationships"
        )
    );

    assert.ok(
      NETWORKS.sui
        .capabilities
        .includes(
          "fundingProvenance"
        )
    );
  }
);
