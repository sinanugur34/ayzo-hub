export type NetworkFamily =
  | "solana"
  | "evm"
  | "bitcoin"
  | "dogecoin"
  | "tron"
  | "xrpl"
  | "litecoin"
  | "sui"
  | "ton"
  | "hyperliquid"
  | "stellar"
  | "cardano"
  | "aptos";

export type NetworkStatus =
  | "live"
  | "development"
  | "planned";

export type NetworkCapability =
  | "assetVerification"
  | "holderIntelligence"
  | "walletRelationships"
  | "fundingIntelligence"
  | "fundingProvenance"
  | "deploymentIntelligence"
  | "developerHistory"
  | "coordinatedWalletBehavior"
  | "walletGraph"
  | "historicalChanges"
  | "addressFlows";

export type NetworkDefinition = {
  id: string;
  name: string;
  shortName: string;
  family: NetworkFamily;
  status: NetworkStatus;
  chainId: number | null;
  nativeCurrency: string;
  explorerUrl: string;
  capabilities: readonly NetworkCapability[];
};
