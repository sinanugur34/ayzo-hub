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
