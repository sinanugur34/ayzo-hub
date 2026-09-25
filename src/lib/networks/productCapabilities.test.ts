import assert from "node:assert/strict";
import test from "node:test";

import {
  getLiveNetworks,
  getProductToolsForNetwork,
} from "./productCapabilities";

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
  "maps Dogecoin and TRON address flows to wallet analysis only",
  () => {
    assert.deepEqual(
      toolIds("dogecoin"),
      ["walletAnalysis"]
    );

    assert.deepEqual(
      toolIds("tron"),
      ["walletAnalysis"]
    );
  }
);

test(
  "returns every currently live network",
  () => {
    const liveNetworks =
      getLiveNetworks();

    assert.equal(
      liveNetworks.length,
      17
    );

    assert.ok(
      liveNetworks.every(
        (network) =>
          network.status === "live"
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
