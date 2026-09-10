import type {
  ProviderCapability,
  ProviderId,
} from "@/lib/providers/types";

import type {
  TronAddressHistoryPage,
  TronNetworkContext,
  TronProviderResult,
} from "./types";

export type TronAddressRequest = {
  network:
    TronNetworkContext;
  address: string;
  signal?: AbortSignal;
};

export type TronPaginatedAddressRequest =
  TronAddressRequest & {
    limit?: number;
    cursor?:
      string | null;
  };

export interface TronProviderBase {
  readonly id:
    ProviderId;

  readonly capabilities:
    readonly ProviderCapability[];

  supportsNetwork(
    network:
      TronNetworkContext
  ): boolean;

  supportsCapability(
    capability:
      ProviderCapability
  ): boolean;
}

export interface TronAddressTransactionsProvider
  extends TronProviderBase {
  getAddressTransactions(
    request:
      TronPaginatedAddressRequest
  ): Promise<
    TronProviderResult<
      TronAddressHistoryPage
    >
  >;
}
