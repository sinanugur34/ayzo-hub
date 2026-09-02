import type { NetworkId } from "@/lib/networks/registry";
import type { ProviderId } from "@/lib/providers/types";

export type EvmNetworkContext = {
  networkId: NetworkId;
  name: string;
  chainId: number;
  nativeCurrency: string;
};

export type EvmProviderErrorCode =
  | "UNSUPPORTED_NETWORK"
  | "UNSUPPORTED_CAPABILITY"
  | "INVALID_ADDRESS"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR";

export type EvmProviderSuccess<T> = {
  ok: true;
  providerId: ProviderId;
  latencyMs: number;
  data: T;
};

export type EvmProviderFailure = {
  ok: false;
  providerId: ProviderId;
  latencyMs: number | null;
  code: EvmProviderErrorCode;
  error: string;
};

export type EvmProviderResult<T> =
  | EvmProviderSuccess<T>
  | EvmProviderFailure;

export type EvmTokenMetadata = {
  address: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: string | null;
  isContract: boolean;
};

export type EvmTokenHolder = {
  address: string;
  balance: string;
  percentage: number | null;
};

export type EvmTokenHolders = {
  holders: readonly EvmTokenHolder[];
  totalSupply: string | null;
  nextCursor: string | null;
};

export type EvmTransaction = {
  hash: string;
  blockNumber: number | null;
  timestamp: string | null;
  from: string | null;
  to: string | null;
  value: string | null;
};

export type EvmTransfer = {
  transactionHash: string;
  blockNumber: number | null;
  from: string | null;
  to: string | null;
  tokenAddress: string | null;
  value: string | null;
};
