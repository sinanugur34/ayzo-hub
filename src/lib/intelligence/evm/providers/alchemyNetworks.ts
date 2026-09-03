import type {
  NetworkId,
} from "@/lib/networks/registry";

export type AlchemyEvmNetworkConfig = {
  chainId: number;
  httpHost: string;
};

export const ALCHEMY_EVM_NETWORKS = {
  ethereum: {
    chainId: 1,
    httpHost:
      "eth-mainnet.g.alchemy.com",
  },

  base: {
    chainId: 8453,
    httpHost:
      "base-mainnet.g.alchemy.com",
  },

  bnb: {
    chainId: 56,
    httpHost:
      "bnb-mainnet.g.alchemy.com",
  },

  arbitrum: {
    chainId: 42161,
    httpHost:
      "arb-mainnet.g.alchemy.com",
  },

  polygon: {
    chainId: 137,
    httpHost:
      "polygon-mainnet.g.alchemy.com",
  },

  optimism: {
    chainId: 10,
    httpHost:
      "opt-mainnet.g.alchemy.com",
  },

  avalanche: {
    chainId: 43114,
    httpHost:
      "avax-mainnet.g.alchemy.com",
  },

} as const satisfies Partial<
  Record<
    NetworkId,
    AlchemyEvmNetworkConfig
  >
>;

export function getAlchemyEvmNetwork(
  networkId: NetworkId
): AlchemyEvmNetworkConfig | null {
  return (
    ALCHEMY_EVM_NETWORKS[
      networkId as keyof typeof ALCHEMY_EVM_NETWORKS
    ] ?? null
  );
}
