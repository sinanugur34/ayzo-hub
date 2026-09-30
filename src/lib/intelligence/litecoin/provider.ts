import type {
  ProviderCapability,
  ProviderId,
} from "@/lib/providers/types";

import type {
  LitecoinAddressHistoryPage,
  LitecoinNetworkContext,
  LitecoinProviderResult,
  LitecoinTransactionEvidence,
} from "./types";

export type LitecoinAddressRequest = {
  network:
    LitecoinNetworkContext;
  address: string;
  signal?: AbortSignal;
};

export type LitecoinPaginatedAddressRequest =
  LitecoinAddressRequest & {
    limit?: number;
    cursor?:
      string | null;
  };

export type LitecoinTransactionRequest = {
  network:
    LitecoinNetworkContext;
  transactionHash: string;
  signal?: AbortSignal;
};

export interface LitecoinProviderBase {
  readonly id:
    ProviderId;

  readonly capabilities:
    readonly ProviderCapability[];

  supportsNetwork(
    network:
      LitecoinNetworkContext
  ): boolean;

  supportsCapability(
    capability:
      ProviderCapability
  ): boolean;
}

export interface LitecoinAddressTransactionsProvider
  extends LitecoinProviderBase {
  getAddressTransactions(
    request:
      LitecoinPaginatedAddressRequest
  ): Promise<
    LitecoinProviderResult<
      LitecoinAddressHistoryPage
    >
  >;
}

export interface LitecoinTransactionEvidenceProvider
  extends LitecoinProviderBase {
  getTransactionEvidence(
    request:
      LitecoinTransactionRequest
  ): Promise<
    LitecoinProviderResult<
      LitecoinTransactionEvidence
    >
  >;
}
