import assert from "node:assert/strict";
import test from "node:test";

import {
  NETWORKS,
  NETWORK_IDS,
} from "./registry";

test(
  "keeps thirty accepted live networks after Final Five acceptance",
  () => {
    assert.equal(
      NETWORK_IDS.length,
      31
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
      30
    );

    assert.equal(
      NETWORKS.litecoin.status,
      "live"
    );

    assert.equal(
      NETWORKS.sui.status,
      "live"
    );

    assert.equal(
      NETWORKS.ton.status,
      "live"
    );

    assert.equal(
      NETWORKS.stellar.status,
      "live"
    );

    assert.equal(
      NETWORKS.hyperliquid.status,
      "live"
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


test(
  "keeps TON live after TON Center v3 quality gates",
  () => {
    assert.equal(
      NETWORKS.ton.status,
      "live"
    );

    assert.equal(
      NETWORKS.ton.family,
      "ton"
    );

    assert.equal(
      NETWORKS.ton.nativeCurrency,
      "TON"
    );

    assert.ok(
      NETWORKS.ton
        .capabilities
        .includes(
          "addressFlows"
        )
    );

    assert.ok(
      NETWORKS.ton
        .capabilities
        .includes(
          "walletRelationships"
        )
    );

    assert.ok(
      NETWORKS.ton
        .capabilities
        .includes(
          "fundingProvenance"
        )
    );
  }
);


test(
  "keeps Stellar live after Horizon quality gates",
  () => {
    assert.equal(
      NETWORKS.stellar.status,
      "live"
    );

    assert.equal(
      NETWORKS.stellar.family,
      "stellar"
    );

    assert.equal(
      NETWORKS.stellar.nativeCurrency,
      "XLM"
    );

    assert.ok(
      NETWORKS.stellar
        .capabilities
        .includes(
          "addressFlows"
        )
    );

    assert.ok(
      NETWORKS.stellar
        .capabilities
        .includes(
          "walletRelationships"
        )
    );

    assert.ok(
      NETWORKS.stellar
        .capabilities
        .includes(
          "fundingProvenance"
        )
    );
  }
);


test(
  "keeps Hyperliquid live after dual-surface quality gates",
  () => {
    assert.equal(
      NETWORKS.hyperliquid.status,
      "live"
    );

    assert.equal(
      NETWORKS.hyperliquid.family,
      "hyperliquid"
    );

    assert.equal(
      NETWORKS.hyperliquid.nativeCurrency,
      "HYPE"
    );

    assert.deepEqual(
      NETWORKS.hyperliquid.capabilities,
      [
        "addressFlows",
      ]
    );
  }
);


test(
  "registers Cardano and Aptos as Wave A native networks",
  () => {
    assert.equal(
      NETWORKS.cardano.status,
      "live"
    );

    assert.equal(
      NETWORKS.cardano.family,
      "cardano"
    );

    assert.equal(
      NETWORKS.cardano.nativeCurrency,
      "ADA"
    );

    assert.equal(
      NETWORKS.cardano.chainId,
      null
    );

    assert.ok(
      NETWORKS.cardano
        .capabilities
        .includes(
          "assetVerification"
        )
    );

    assert.ok(
      NETWORKS.cardano
        .capabilities
        .includes(
          "addressFlows"
        )
    );

    assert.ok(
      NETWORKS.cardano
        .capabilities
        .includes(
          "walletRelationships"
        )
    );

    assert.ok(
      NETWORKS.cardano
        .capabilities
        .includes(
          "fundingIntelligence"
        )
    );

    assert.equal(
      NETWORKS.aptos.status,
      "live"
    );

    assert.equal(
      NETWORKS.aptos.family,
      "aptos"
    );

    assert.equal(
      NETWORKS.aptos.nativeCurrency,
      "APT"
    );

    assert.equal(
      NETWORKS.aptos.chainId,
      null
    );

    assert.ok(
      NETWORKS.aptos
        .capabilities
        .includes(
          "assetVerification"
        )
    );

    assert.ok(
      NETWORKS.aptos
        .capabilities
        .includes(
          "addressFlows"
        )
    );

    assert.ok(
      NETWORKS.aptos
        .capabilities
        .includes(
          "walletRelationships"
        )
    );

    assert.ok(
      NETWORKS.aptos
        .capabilities
        .includes(
          "fundingIntelligence"
        )
    );
  }
);

test(
  "keeps NEAR gated and promotes Hedera after Wave B acceptance",
  () => {
    assert.equal(
      NETWORKS.near.status,
      "development"
    );

    assert.equal(
      NETWORKS.near.family,
      "near"
    );

    assert.equal(
      NETWORKS.near.nativeCurrency,
      "NEAR"
    );

    assert.ok(
      NETWORKS.near.capabilities.includes(
        "addressFlows"
      )
    );

    assert.ok(
      NETWORKS.near.capabilities.includes(
        "assetVerification"
      )
    );

    assert.equal(
      NETWORKS.hedera.status,
      "live"
    );

    assert.equal(
      NETWORKS.hedera.family,
      "hedera"
    );

    assert.equal(
      NETWORKS.hedera.nativeCurrency,
      "HBAR"
    );

    assert.ok(
      NETWORKS.hedera.capabilities.includes(
        "addressFlows"
      )
    );

    assert.ok(
      NETWORKS.hedera.capabilities.includes(
        "assetVerification"
      )
    );
  }
);
