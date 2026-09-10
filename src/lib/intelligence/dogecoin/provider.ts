import type {
  ProviderCapability,
  ProviderId,
} from "@/lib/providers/types";

import type {
  DogecoinAddressHistoryPage,
  DogecoinNetworkContext,
  DogecoinProviderResult,
  DogecoinTransactionEvidence,
} from "./types";

export type DogecoinAddressRequest = {
  network:
    DogecoinNetworkContext;
  address: string;
  signal?: AbortSignal;
};

export type DogecoinPaginatedAddressRequest =
  DogecoinAddressRequest & {
    limit?: number;
    cursor?:
      string | null;
  };

export type DogecoinTransactionRequest = {
  network:
    DogecoinNetworkContext;
  transactionHash: string;
  signal?: AbortSignal;
};

export interface DogecoinProviderBase {
  readonly id:
    ProviderId;

  readonly capabilities:
    readonly ProviderCapability[];

  supportsNetwork(
    network:
      DogecoinNetworkContext
  ): boolean;

  supportsCapability(
    capability:
      ProviderCapability
  ): boolean;
}

export interface DogecoinAddressTransactionsProvider
  extends DogecoinProviderBase {
  getAddressTransactions(
    request:
      DogecoinPaginatedAddressRequest
  ): Promise<
    DogecoinProviderResult<
      DogecoinAddressHistoryPage
    >
  >;
}

export interface DogecoinTransactionEvidenceProvider
  extends DogecoinProviderBase {
  getTransactionEvidence(
    request:
      DogecoinTransactionRequest
  ): Promise<
    DogecoinProviderResult<
      DogecoinTransactionEvidence
    >
  >;
}
