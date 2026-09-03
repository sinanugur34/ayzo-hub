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

export type AddressKind =
  | "evm"
  | "solana"
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

  return NETWORKS[
    selectedNetwork
  ].family === "evm"
    ? selectedNetwork
    : "ethereum";
}
