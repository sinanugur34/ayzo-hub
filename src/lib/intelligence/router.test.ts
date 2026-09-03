import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveIntelligenceNetwork,
} from "./router";

test(
  "resolves Solana and Ethereum as live intelligence networks",
  () => {
    const solana =
      resolveIntelligenceNetwork(
        "solana"
      );

    assert.equal(
      solana.ok,
      true
    );

    if (!solana.ok) {
      throw new Error(
        "Expected Solana to resolve."
      );
    }

    assert.equal(
      solana.engine,
      "solana"
    );

    const ethereum =
      resolveIntelligenceNetwork(
        "ethereum"
      );

    assert.equal(
      ethereum.ok,
      true
    );

    if (!ethereum.ok) {
      throw new Error(
        "Expected Ethereum to resolve."
      );
    }

    assert.equal(
      ethereum.engine,
      "evm"
    );

    assert.equal(
      ethereum.networkId,
      "ethereum"
    );

    assert.equal(
      ethereum.network.status,
      "live"
    );

  }
);

test(
  "keeps planned EVM networks unavailable",
  () => {
    for (
      const network of [
      ]
    ) {
      const result =
        resolveIntelligenceNetwork(
          network
        );

      assert.equal(
        result.ok,
        false
      );

      if (result.ok) {
        throw new Error(
          `${network} unexpectedly resolved as live.`
        );
      }

      assert.equal(
        result.code,
        "NETWORK_NOT_AVAILABLE"
      );
    }
  }
);

test(
  "keeps Bitcoin unavailable until its engine is live",
  () => {
    const result =
      resolveIntelligenceNetwork(
        "bitcoin"
      );

    assert.equal(
      result.ok,
      false
    );

    if (result.ok) {
      throw new Error(
        "Bitcoin unexpectedly resolved as live."
      );
    }

    assert.equal(
      result.code,
      "NETWORK_NOT_AVAILABLE"
    );
  }
);

test(
  "rejects unsupported and missing networks",
  () => {
    const unsupported =
      resolveIntelligenceNetwork(
        "not-a-network"
      );

    assert.equal(
      unsupported.ok,
      false
    );

    if (unsupported.ok) {
      throw new Error(
        "Unsupported network unexpectedly resolved."
      );
    }

    assert.equal(
      unsupported.code,
      "INVALID_NETWORK"
    );

    const missing =
      resolveIntelligenceNetwork(
        undefined
      );

    assert.equal(
      missing.ok,
      false
    );

    if (missing.ok) {
      throw new Error(
        "Missing network unexpectedly resolved."
      );
    }

    assert.equal(
      missing.code,
      "INVALID_NETWORK"
    );
  }
);

test(
  "normalizes network identifiers before resolution",
  () => {
    const result =
      resolveIntelligenceNetwork(
        "  ETHEREUM  "
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      throw new Error(
        "Normalized Ethereum identifier did not resolve."
      );
    }

    assert.equal(
      result.networkId,
      "ethereum"
    );
  }
);


test(
  "resolves Base through the shared EVM engine",
  () => {
    const result =
      resolveIntelligenceNetwork(
        "base"
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      throw new Error(
        "Expected Base to resolve."
      );
    }

    assert.equal(
      result.engine,
      "evm"
    );

    assert.equal(
      result.network.chainId,
      8453
    );

    assert.equal(
      result.network.status,
      "live"
    );
  }
);


test(
  "resolves BNB and Arbitrum through the shared EVM engine",
  () => {
    for (
      const [
        networkId,
        chainId,
      ] of [
        ["bnb", 56],
        ["arbitrum", 42161],
      ] as const
    ) {
      const result =
        resolveIntelligenceNetwork(
          networkId
        );

      assert.equal(
        result.ok,
        true
      );

      if (!result.ok) {
        throw new Error(
          `Expected ${networkId} to resolve.`
        );
      }

      assert.equal(
        result.engine,
        "evm"
      );

      assert.equal(
        result.network.chainId,
        chainId
      );

      assert.equal(
        result.network.status,
        "live"
      );
    }
  }
);

test(
  "resolves Polygon, Optimism, and Avalanche through the shared EVM engine",
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
      const result =
        resolveIntelligenceNetwork(
          networkId
        );

      assert.equal(
        result.ok,
        true
      );

      if (!result.ok) {
        throw new Error(
          `Expected ${networkId} to resolve.`
        );
      }

      assert.equal(
        result.engine,
        "evm"
      );

      assert.equal(
        result.network.chainId,
        chainId
      );

      assert.equal(
        result.network.status,
        "live"
      );
    }
  }
);


test(
  "resolves Linea, Scroll, and Mantle through the shared EVM engine",
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
      const result =
        resolveIntelligenceNetwork(
          networkId
        );

      assert.equal(
        result.ok,
        true
      );

      if (!result.ok) {
        throw new Error(
          `Expected ${networkId} to resolve`
        );
      }

      assert.equal(
        result.engine,
        "evm"
      );

      assert.equal(
        result.network.chainId,
        chainId
      );

      assert.equal(
        result.network.status,
        "live"
      );
    }
  }
);


test(
  "resolves Sonic and Monad through the shared EVM engine",
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
      const result =
        resolveIntelligenceNetwork(
          networkId
        );

      assert.equal(
        result.ok,
        true
      );

      if (!result.ok) {
        throw new Error(
          `Expected ${networkId} to resolve`
        );
      }

      assert.equal(
        result.engine,
        "evm"
      );

      assert.equal(
        result.network.chainId,
        chainId
      );

      assert.equal(
        result.network.status,
        "live"
      );
    }
  }
);
