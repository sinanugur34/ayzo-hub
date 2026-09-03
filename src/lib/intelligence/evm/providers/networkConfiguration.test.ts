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

test(
  "maps Polygon, Optimism, and Avalanche provider identifiers only inside provider configuration",
  () => {
    // K3 live gates use each network's canonical native USDC:
    // Polygon  0x3c499c542cef5e3811e1192ce70d8cc03d5c3359
    // Optimism 0x0b2c639c533813f4aa9d7837caf62653d097ff85
    // Avalanche 0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e
    const expected = [
      {
        networkId:
          "polygon",
        chainId: 137,
        httpHost:
          "polygon-mainnet.g.alchemy.com",
        chainName:
          "matic-mainnet",
      },
      {
        networkId:
          "optimism",
        chainId: 10,
        httpHost:
          "opt-mainnet.g.alchemy.com",
        chainName:
          "optimism-mainnet",
      },
      {
        networkId:
          "avalanche",
        chainId: 43114,
        httpHost:
          "avax-mainnet.g.alchemy.com",
        chainName:
          "avalanche-mainnet",
      },
    ] as const;

    for (const config of expected) {
      assert.deepEqual(
        getAlchemyEvmNetwork(
          config.networkId
        ),
        {
          chainId:
            config.chainId,
          httpHost:
            config.httpHost,
        }
      );

      assert.deepEqual(
        getGoldRushEvmNetwork(
          config.networkId
        ),
        {
          networkId:
            config.networkId,
          chainId:
            config.chainId,
          chainName:
            config.chainName,
        }
      );
    }
  }
);

test(
  "all existing EVM adapters support Polygon, Optimism, and Avalanche",
  () => {
    for (
      const networkId of [
        "polygon",
        "optimism",
        "avalanche",
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


test(
  "maps Linea, Scroll, and Mantle provider configuration",
  () => {
    const expected = [
      {
        networkId:
          "linea",
        chainId:
          59144,
        httpHost:
          "linea-mainnet.g.alchemy.com",
        chainName:
          "linea-mainnet",
      },
      {
        networkId:
          "scroll",
        chainId:
          534352,
        httpHost:
          "scroll-mainnet.g.alchemy.com",
        chainName:
          "scroll-mainnet",
      },
      {
        networkId:
          "mantle",
        chainId:
          5000,
        httpHost:
          "mantle-mainnet.g.alchemy.com",
        chainName:
          "mantle-mainnet",
      },
    ] as const;

    for (const config of expected) {
      assert.deepEqual(
        getAlchemyEvmNetwork(
          config.networkId
        ),
        {
          chainId:
            config.chainId,
          httpHost:
            config.httpHost,
        }
      );

      assert.deepEqual(
        getGoldRushEvmNetwork(
          config.networkId
        ),
        {
          networkId:
            config.networkId,
          chainId:
            config.chainId,
          chainName:
            config.chainName,
        }
      );
    }
  }
);

test(
  "all existing EVM adapters support Linea, Scroll, and Mantle",
  () => {
    for (
      const networkId of [
        "linea",
        "scroll",
        "mantle",
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


test(
  "maps Sonic and Monad provider configuration",
  () => {
    const expected = [
      {
        networkId:
          "sonic",
        chainId:
          146,
        httpHost:
          "sonic-mainnet.g.alchemy.com",
        chainName:
          "sonic-mainnet",
      },
      {
        networkId:
          "monad",
        chainId:
          143,
        httpHost:
          "monad-mainnet.g.alchemy.com",
        chainName:
          "monad-mainnet",
      },
    ] as const;

    for (const config of expected) {
      assert.deepEqual(
        getAlchemyEvmNetwork(
          config.networkId
        ),
        {
          chainId:
            config.chainId,
          httpHost:
            config.httpHost,
        }
      );

      assert.deepEqual(
        getGoldRushEvmNetwork(
          config.networkId
        ),
        {
          networkId:
            config.networkId,
          chainId:
            config.chainId,
          chainName:
            config.chainName,
        }
      );
    }
  }
);

test(
  "all existing EVM adapters support Sonic and Monad",
  () => {
    for (
      const networkId of [
        "sonic",
        "monad",
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
