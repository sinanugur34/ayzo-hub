import type {
  ProviderCapability,
  ProviderId,
} from "@/lib/providers/types";

import type {
  BitcoinAddressHistoryPage,
  BitcoinNetworkContext,
  BitcoinProviderResult,
  BitcoinTransactionEvidence,
} from "./types";

export type BitcoinAddressRequest = {
  network: BitcoinNetworkContext;
  address: string;
  signal?: AbortSignal;
};

export type BitcoinPaginatedAddressRequest =
  BitcoinAddressRequest & {
    limit?: number;
    cursor?: string | null;
  };

export type BitcoinTransactionRequest = {
  network: BitcoinNetworkContext;
  transactionHash: string;
  signal?: AbortSignal;
};

export interface BitcoinProviderBase {
  readonly id: ProviderId;

  readonly capabilities:
    readonly ProviderCapability[];

  supportsNetwork(
    network: BitcoinNetworkContext
  ): boolean;

  supportsCapability(
    capability: ProviderCapability
  ): boolean;
}

export interface BitcoinAddressTransactionsProvider
  extends BitcoinProviderBase {
  getAddressTransactions(
    request: BitcoinPaginatedAddressRequest
  ): Promise<
    BitcoinProviderResult<
      BitcoinAddressHistoryPage
    >
  >;
}

export interface BitcoinTransactionEvidenceProvider
  extends BitcoinProviderBase {
  getTransactionEvidence(
    request: BitcoinTransactionRequest
  ): Promise<
    BitcoinProviderResult<
      BitcoinTransactionEvidence
    >
  >;
}
