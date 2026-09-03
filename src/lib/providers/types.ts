import type { NetworkId } from "@/lib/networks/registry";

export type ProviderId =
  | "goldrush"
  | "alchemy";

export type ProviderKind =
  | "indexed-data"
  | "rpc";

export type ProviderRuntimeStatus =
  | "healthy"
  | "degraded"
  | "unavailable"
  | "unknown";

export type ProviderCapability =
  | "contractCode"
  | "contractCall"
  | "contractDeployment"
  | "transactionReceipt"
  | "tokenMetadata"
  | "tokenHolders"
  | "historicalTokenHolders"
  | "transactions"
  | "tokenTransfers"
  | "internalTransactions"
  | "rpc"
  | "trace";

export type ProviderDefinition = {
  id: ProviderId;
  name: string;
  kind: ProviderKind;
  role: "primary" | "fallback";
};

export type ProviderHealthSnapshot = {
  providerId: ProviderId;
  networkId: NetworkId;
  status: ProviderRuntimeStatus;
  checkedAt: string;
  latencyMs: number | null;
  error: string | null;
};

export type ProviderCapabilityState = {
  providerId: ProviderId;
  networkId: NetworkId;
  capability: ProviderCapability;
  supported: boolean;
};
