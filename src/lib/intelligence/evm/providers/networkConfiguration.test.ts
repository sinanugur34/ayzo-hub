import assert from "node:assert/strict";
import test from "node:test";

import {
  getEvmNetworkContext,
} from "../engine";

import {
  alchemyEvmProvider,
} from "./alchemy";

import {
  getAlchemyEvmNetwork,
} from "./alchemyNetworks";

import {
  goldRushEvmProvider,
} from "./goldrush";

import {
  goldRushTransactionsProvider,
} from "./goldrushTransactions";

import {
  goldRushTransfersProvider,
} from "./goldrushTransfers";

import {
  getGoldRushEvmNetwork,
} from "./goldrushNetworks";

test(
  "maps Base provider identifiers only inside provider configuration",
  () => {
    assert.deepEqual(
      getAlchemyEvmNetwork(
        "base"
      ),
      {
        chainId: 8453,
        httpHost:
          "base-mainnet.g.alchemy.com",
      }
    );

    assert.deepEqual(
      getGoldRushEvmNetwork(
        "base"
      ),
      {
        networkId:
          "base",
        chainId: 8453,
        chainName:
          "base-mainnet",
      }
    );
  }
);

test(
  "all existing EVM adapters support the shared Base context",
  () => {
    const network =
      getEvmNetworkContext(
        "base"
      );

    assert.ok(network);

    for (
      const provider of [
        alchemyEvmProvider,
        goldRushEvmProvider,
        goldRushTransactionsProvider,
        goldRushTransfersProvider,
      ]
    ) {
      assert.equal(
        provider.supportsNetwork(
          network
        ),
        true
      );
    }
  }
);

test(
  "preserves the Ethereum provider configuration",
  () => {
    assert.equal(
      getAlchemyEvmNetwork(
        "ethereum"
      )?.chainId,
      1
    );

    assert.equal(
      getGoldRushEvmNetwork(
        "ethereum"
      )?.chainName,
      "eth-mainnet"
    );
  }
);
