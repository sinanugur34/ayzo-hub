import type {
  NetworkId,
} from "@/lib/networks/registry";

export type GoldRushEvmNetworkConfig = {
  networkId: NetworkId;
  chainId: number;
  chainName: string;
};

const GOLDRUSH_EVM_NETWORKS:
  Partial<
    Record<
      NetworkId,
      GoldRushEvmNetworkConfig
    >
  > = {
  ethereum: {
    networkId: "ethereum",
    chainId: 1,
    chainName: "eth-mainnet",
  },

  base: {
    networkId: "base",
    chainId: 8453,
    chainName: "base-mainnet",
  },

  bnb: {
    networkId: "bnb",
    chainId: 56,
    chainName: "bsc-mainnet",
  },

  arbitrum: {
    networkId: "arbitrum",
    chainId: 42161,
    chainName: "arbitrum-mainnet",
  },

  polygon: {
    networkId: "polygon",
    chainId: 137,
    chainName: "matic-mainnet",
  },

  optimism: {
    networkId: "optimism",
    chainId: 10,
    chainName: "optimism-mainnet",
  },

  avalanche: {
    networkId: "avalanche",
    chainId: 43114,
    chainName: "avalanche-mainnet",
  },


  linea: {
    networkId: "linea",
    chainId: 59144,
    chainName: "linea-mainnet",
  },

  scroll: {
    networkId: "scroll",
    chainId: 534352,
    chainName: "scroll-mainnet",
  },

  mantle: {
    networkId: "mantle",
    chainId: 5000,
    chainName: "mantle-mainnet",
  },


  sonic: {
    networkId: "sonic",
    chainId: 146,
    chainName: "sonic-mainnet",
  },

  monad: {
    networkId: "monad",
    chainId: 143,
    chainName: "monad-mainnet",
  },

};

export function getGoldRushEvmNetwork(
  networkId: NetworkId
): GoldRushEvmNetworkConfig | null {
  return (
    GOLDRUSH_EVM_NETWORKS[
      networkId
    ] ?? null
  );
}
