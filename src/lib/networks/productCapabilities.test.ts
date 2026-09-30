import assert from "node:assert/strict";
import test from "node:test";

import {
  getLiveNetworks,
  getProductToolsForNetwork,
} from "./productCapabilities";

import {
  NETWORKS,
  NETWORK_IDS,
} from "./registry";

function toolIds(
  networkId: Parameters<
    typeof getProductToolsForNetwork
  >[0]
) {
  return getProductToolsForNetwork(
    networkId
  ).map((tool) => tool.id);
}

test(
  "exposes all four product tools for Ethereum and Solana",
  () => {
    const expected = [
      "tokenAnalysis",
      "walletAnalysis",
      "fundingTrace",
      "connections",
    ];

    assert.deepEqual(
      toolIds("ethereum"),
      expected
    );

    assert.deepEqual(
      toolIds("solana"),
      expected
    );
  }
);

test(
  "maps Bitcoin capabilities to wallet, funding, and connections tools",
  () => {
    assert.deepEqual(
      toolIds("bitcoin"),
      [
        "walletAnalysis",
        "fundingTrace",
        "connections",
      ]
    );
  }
);

test(
  "maps Dogecoin Litecoin and TRON evidence to wallet funding and connections tools",
  () => {
    const expected = [
      "walletAnalysis",
      "fundingTrace",
      "connections",
    ];

    assert.deepEqual(
      toolIds("dogecoin"),
      expected
    );

    assert.deepEqual(
      toolIds("litecoin"),
      expected
    );

    assert.deepEqual(
      toolIds("tron"),
      expected
    );
  }
);

test(
  "returns every currently live canonical network",
  () => {
    const liveNetworks =
      getLiveNetworks();

    const canonicalLiveIds =
      NETWORK_IDS.filter(
        networkId =>
          NETWORKS[
            networkId
          ].status ===
          "live"
      );

    assert.deepEqual(
      liveNetworks
        .map(
          network =>
            network.id
        )
        .sort(),
      [
        ...canonicalLiveIds,
      ].sort()
    );

    assert.ok(
      liveNetworks.every(
        network =>
          network.status ===
          "live"
      )
    );
  }
);

test(
  "maps XRP Ledger evidence to wallet and connection analysis",
  () => {
    assert.deepEqual(
      toolIds("xrp"),
      [
        "walletAnalysis",
        "fundingTrace",
        "connections",
      ]
    );
  }
);
