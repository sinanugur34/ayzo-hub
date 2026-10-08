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
  | "litecoin"
  | "sui"
  | "ton"
  | "stellar"
  | "tron"
  | "xrp"
  | "cardano"
  | "aptos"
  | "invalid";

export function shouldPreserveEvmAddress(
  address: string,
  targetNetwork: NetworkId
): boolean {
  return (
    /^0x[0-9a-fA-F]{40}$/.test(address.trim()) &&
    NETWORKS[targetNetwork].family === "evm"
  );
}

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
  | "litecoin"
  | "sui"
  | "ton"
  | "stellar"
  | "tron"
  | "xrp"
  | "cardano"
  | "aptos"
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
    "litecoin"
  ) {
    return "litecoin";
  }

  if (
    addressKind ===
    "sui"
  ) {
    return "sui";
  }

  if (
    addressKind ===
    "ton"
  ) {
    return "ton";
  }

  if (
    addressKind ===
    "stellar"
  ) {
    return "stellar";
  }

  if (
    addressKind ===
    "tron"
  ) {
    return "tron";
  }

  if (
    addressKind ===
    "xrp"
  ) {
    return "xrp";
  }

  if (
    addressKind ===
    "cardano"
  ) {
    return "cardano";
  }

  /*
   * Aptos and Sui can both use 0x-prefixed hexadecimal forms.
   * Never auto-switch a generic 0x address into Aptos.
   * Preserve Aptos only when it was explicitly selected.
   */
  if (
    addressKind ===
      "aptos"
  ) {
    return selectedNetwork ===
      "aptos"
      ? "aptos"
      : null;
  }

  /*
   * Hyperliquid and EVM share the same 20-byte 0x address shape.
   * Automatic detection remains EVM, but an explicit
   * Hyperliquid selection must be preserved.
   */
  if (
    addressKind ===
      "evm" &&
    selectedNetwork ===
      "hyperliquid"
  ) {
    return selectedNetwork;
  }

  if (addressKind === "evm") {
    return NETWORKS[selectedNetwork].family === "evm"
      ? selectedNetwork
      : null;
  }

  return "solana";
}
