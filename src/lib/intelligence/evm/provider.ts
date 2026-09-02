import type {
  ProviderCapability,
  ProviderId,
} from "@/lib/providers/types";

import type {
  EvmContractCall,
  EvmContractCode,
  EvmNetworkContext,
  EvmProviderResult,
  EvmTokenHolders,
  EvmTokenMetadata,
  EvmTransaction,
  EvmTransactionsPage,
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

export type EvmContractCallRequest =
  EvmAddressRequest & {
    data: string;
    blockTag?: string;
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

export interface EvmProviderBase {
  readonly id: ProviderId;

  readonly capabilities:
    readonly ProviderCapability[];

  supportsNetwork(
    network: EvmNetworkContext
  ): boolean;

  supportsCapability(
    capability: ProviderCapability
  ): boolean;
}

export interface EvmContractCodeProvider
  extends EvmProviderBase {
  getContractCode(
    request: EvmAddressRequest
  ): Promise<
    EvmProviderResult<EvmContractCode>
  >;
}

export interface EvmContractCallProvider
  extends EvmProviderBase {
  callContract(
    request: EvmContractCallRequest
  ): Promise<
    EvmProviderResult<EvmContractCall>
  >;
}

export interface EvmTokenMetadataProvider
  extends EvmProviderBase {
  getTokenMetadata(
    request: EvmAddressRequest
  ): Promise<
    EvmProviderResult<EvmTokenMetadata>
  >;
}

export interface EvmTokenHoldersProvider
  extends EvmProviderBase {
  getTokenHolders(
    request: EvmPaginatedAddressRequest
  ): Promise<
    EvmProviderResult<EvmTokenHolders>
  >;
}

export interface EvmTransactionsProvider
  extends EvmProviderBase {
  getTransactions(
    request: EvmPaginatedAddressRequest
  ): Promise<
    EvmProviderResult<
      EvmTransactionsPage
    >
  >;
}

export interface EvmTransfersProvider
  extends EvmProviderBase {
  getTokenTransfers(
    request: EvmPaginatedAddressRequest
  ): Promise<
    EvmProviderResult<
      readonly EvmTransfer[]
    >
  >;
}

export interface EvmTraceProvider
  extends EvmProviderBase {
  traceTransaction(
    request: EvmTraceRequest
  ): Promise<
    EvmProviderResult<EvmTraceResult>
  >;
}
