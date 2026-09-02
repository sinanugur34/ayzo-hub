import type {
  ProviderCapability,
  ProviderId,
} from "@/lib/providers/types";

import type {
  EvmNetworkContext,
  EvmProviderResult,
  EvmTokenHolders,
  EvmTokenMetadata,
  EvmTransaction,
  EvmTransfer,
} from "./types";

export type EvmAddressRequest = {
  network: EvmNetworkContext;
  address: string;
  signal?: AbortSignal;
};

export type EvmPaginatedAddressRequest =
  EvmAddressRequest & {
    limit?: number;
    cursor?: string | null;
  };

export type EvmTraceRequest = {
  network: EvmNetworkContext;
  transactionHash: string;
  signal?: AbortSignal;
};

export type EvmTraceResult = {
  transactionHash: string;
  calls: readonly Record<string, unknown>[];
};

export interface EvmDataProvider {
  readonly id: ProviderId;

  readonly capabilities:
    readonly ProviderCapability[];

  supportsNetwork(
    network: EvmNetworkContext
  ): boolean;

  supportsCapability(
    capability: ProviderCapability
  ): boolean;

  getTokenMetadata(
    request: EvmAddressRequest
  ): Promise<
    EvmProviderResult<EvmTokenMetadata>
  >;

  getTokenHolders(
    request: EvmPaginatedAddressRequest
  ): Promise<
    EvmProviderResult<EvmTokenHolders>
  >;

  getTransactions(
    request: EvmPaginatedAddressRequest
  ): Promise<
    EvmProviderResult<
      readonly EvmTransaction[]
    >
  >;

  getTokenTransfers(
    request: EvmPaginatedAddressRequest
  ): Promise<
    EvmProviderResult<
      readonly EvmTransfer[]
    >
  >;

  traceTransaction(
    request: EvmTraceRequest
  ): Promise<
    EvmProviderResult<EvmTraceResult>
  >;
}
