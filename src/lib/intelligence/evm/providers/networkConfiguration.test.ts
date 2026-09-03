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


test(
  "maps BNB and Arbitrum provider identifiers only inside provider configuration",
  () => {
    assert.deepEqual(
      getAlchemyEvmNetwork(
        "bnb"
      ),
      {
        chainId: 56,
        httpHost:
          "bnb-mainnet.g.alchemy.com",
      }
    );

    assert.deepEqual(
      getGoldRushEvmNetwork(
        "bnb"
      ),
      {
        networkId:
          "bnb",
        chainId: 56,
        chainName:
          "bsc-mainnet",
      }
    );

    assert.deepEqual(
      getAlchemyEvmNetwork(
        "arbitrum"
      ),
      {
        chainId: 42161,
        httpHost:
          "arb-mainnet.g.alchemy.com",
      }
    );

    assert.deepEqual(
      getGoldRushEvmNetwork(
        "arbitrum"
      ),
      {
        networkId:
          "arbitrum",
        chainId: 42161,
        chainName:
          "arbitrum-mainnet",
      }
    );
  }
);

test(
  "all existing EVM adapters support BNB and Arbitrum",
  () => {
    for (
      const networkId of [
        "bnb",
        "arbitrum",
      ] as const
    ) {
      const network =
        getEvmNetworkContext(
          networkId
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
  }
);
