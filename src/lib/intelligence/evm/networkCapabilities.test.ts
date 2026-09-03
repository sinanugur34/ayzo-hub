import assert from "node:assert/strict";
import test from "node:test";

import {
  EVM_NETWORK_CAPABILITY_IDS,
  getEvmNetworkCapabilities,
} from "./networkCapabilities";

test(
  "maps Ethereum and Base to the complete shared EVM capability surface",
  () => {
    for (
      const networkId of [
        "ethereum",
        "base",
      ] as const
    ) {
      const capabilities =
        getEvmNetworkCapabilities(
          networkId
        );

      assert.ok(
        capabilities
      );

      assert.deepEqual(
        Object.keys(
          capabilities
        ).sort(),
        [
          ...EVM_NETWORK_CAPABILITY_IDS,
        ].sort()
      );

      assert.equal(
        capabilities.verification
          .availability,
        "available"
      );

      assert.equal(
        capabilities.holders
          .availability,
        "available"
      );

      assert.equal(
        capabilities.transactions
          .availability,
        "available"
      );

      assert.equal(
        capabilities.transfers
          .availability,
        "available"
      );

      for (
        const capability of [
          "relationships",
          "funding",
          "deployment",
          "developerHistory",
          "coordinatedBehavior",
          "walletGraph",
        ] as const
      ) {
        assert.equal(
          capabilities[
            capability
          ].availability,
          "limited"
        );

        assert.ok(
          capabilities[
            capability
          ].limitation
        );
      }
    }
  }
);

test(
  "does not claim runtime capabilities for planned networks",
  () => {
    for (
      const networkId of [
        "bnb",
        "arbitrum",
        "polygon",
        "optimism",
        "avalanche",
        "linea",
        "scroll",
        "mantle",
        "sonic",
        "monad",
      ] as const
    ) {
      assert.equal(
        getEvmNetworkCapabilities(
          networkId
        ),
        null
      );
    }
  }
);
