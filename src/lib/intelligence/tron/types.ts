import type {
  ProviderId,
} from "@/lib/providers/types";

export type TronNetworkContext = {
  networkId: "tron";
  name: "TRON";
  nativeCurrency: "TRX";
};

export type TronProviderErrorCode =
  | "UNSUPPORTED_NETWORK"
  | "UNSUPPORTED_CAPABILITY"
  | "INVALID_ADDRESS"
  | "INVALID_TRANSACTION_HASH"
  | "INVALID_CURSOR"
  | "INVALID_LIMIT"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR";

export type TronProviderSuccess<T> = {
  ok: true;
  providerId: ProviderId;
  latencyMs: number;
  data: T;
};

export type TronProviderFailure = {
  ok: false;
  providerId: ProviderId;
  latencyMs: number | null;
  code: TronProviderErrorCode;
  error: string;
};

export type TronProviderResult<T> =
  | TronProviderSuccess<T>
  | TronProviderFailure;

export type TronAddressTransaction = {
  transactionHash: string;
  blockHeight: number | null;
  timestamp: string | null;
  confirmed: boolean;
};

export type TronAddressHistoryPage = {
  transactions:
    readonly TronAddressTransaction[];
  nextCursor: string | null;
};
