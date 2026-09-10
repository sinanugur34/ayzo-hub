import {
  NETWORKS,
  type NetworkId,
} from "./registry";

export type LiveAnalysisNetworkId = {
  [K in NetworkId]:
    (typeof NETWORKS)[K]["status"] extends "live"
      ? K
      : never;
}[NetworkId];

export type LiveEvmNetworkId = {
  [K in LiveAnalysisNetworkId]:
    (typeof NETWORKS)[K]["family"] extends "evm"
      ? K
      : never;
}[LiveAnalysisNetworkId];

export type EvmNetworkId = {
  [K in NetworkId]:
    (typeof NETWORKS)[K]["family"] extends "evm"
      ? K
      : never;
}[NetworkId];

export function isLiveAnalysisNetworkId(
  networkId: NetworkId
): networkId is LiveAnalysisNetworkId {
  return NETWORKS[
    networkId
  ].status === "live";
}

export type AddressKind =
  | "evm"
  | "solana"
  | "bitcoin"
  | "dogecoin"
  | "tron"
  | "invalid";

export function resolveSelectedNetworkForAddress<
  TNetwork extends NetworkId,
>(
  selectedNetwork:
    TNetwork,
  addressKind:
    AddressKind
):
  | TNetwork
  | "solana"
  | "ethereum"
  | "bitcoin"
  | "dogecoin"
  | "tron"
  | null {
  if (
    addressKind ===
    "invalid"
  ) {
    return null;
  }

  if (
    addressKind ===
    "solana"
  ) {
    return "solana";
  }

  if (
    addressKind ===
    "bitcoin"
  ) {
    return "bitcoin";
  }

  if (
    addressKind ===
    "dogecoin"
  ) {
    return "dogecoin";
  }

  if (
    addressKind ===
    "tron"
  ) {
    return "tron";
  }

  return NETWORKS[
    selectedNetwork
  ].family === "evm"
    ? selectedNetwork
    : "ethereum";
}
