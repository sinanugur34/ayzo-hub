export type NetworkFamily =
  | "solana"
  | "evm"
  | "bitcoin";

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
  | "developerHistory"
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
