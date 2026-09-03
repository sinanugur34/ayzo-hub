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
