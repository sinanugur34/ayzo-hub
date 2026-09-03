import {
  NETWORKS,
  type NetworkId,
} from "@/lib/networks/registry";

import type {
  EvmNetworkContext,
} from "./types";

export const EVM_ENGINE_MODULES = [
  "assetVerification",
  "holderIntelligence",
  "walletRelationships",
  "fundingProvenance",
  "deploymentIntelligence",
  "developerHistory",
  "coordinatedWalletBehavior",
  "walletGraph",
] as const;

export type EvmEngineModule =
  (typeof EVM_ENGINE_MODULES)[number];

export function getEvmNetworkContext(
  networkId: NetworkId
): EvmNetworkContext | null {
  const network = NETWORKS[networkId];

  if (
    network.family !== "evm" ||
    typeof network.chainId !== "number"
  ) {
    return null;
  }

  return {
    networkId,
    name: network.name,
    chainId: network.chainId,
    nativeCurrency:
      network.nativeCurrency,
  };
}
