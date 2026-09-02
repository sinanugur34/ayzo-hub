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
