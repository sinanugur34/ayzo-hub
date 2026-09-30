import type {
  ProviderId,
} from "@/lib/providers/types";

export type LitecoinNetworkContext = {
  networkId: "litecoin";
  name: "Litecoin";
  nativeCurrency: "LTC";
};

export type LitecoinProviderErrorCode =
  | "UNSUPPORTED_NETWORK"
  | "UNSUPPORTED_CAPABILITY"
  | "INVALID_ADDRESS"
  | "INVALID_TRANSACTION_HASH"
  | "INVALID_CURSOR"
  | "INVALID_LIMIT"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR";

export type LitecoinProviderSuccess<T> = {
  ok: true;
  providerId: ProviderId;
  latencyMs: number;
  data: T;
};

export type LitecoinProviderFailure = {
  ok: false;
  providerId: ProviderId;
  latencyMs: number | null;
  code: LitecoinProviderErrorCode;
  error: string;
};

export type LitecoinProviderResult<T> =
  | LitecoinProviderSuccess<T>
  | LitecoinProviderFailure;

export type LitecoinAddressTransaction = {
  transactionHash: string;
  blockHeight: number | null;
  timestamp: string | null;
};

export type LitecoinAddressHistoryPage = {
  transactions:
    readonly LitecoinAddressTransaction[];
  nextCursor: string | null;
};

export type LitecoinTransactionInput = {
  previousTransactionHash:
    string | null;
  previousOutputIndex:
    number | null;
  valueLitoshi:
    string | null;
  addresses:
    readonly string[];
  coinbase:
    boolean;
};

export type LitecoinTransactionOutput = {
  index: number;
  valueLitoshi: string;
  scriptHex: string | null;
  addresses:
    readonly string[];
};

export type LitecoinTransactionEvidence = {
  transactionHash: string;
  blockHash: string | null;
  blockHeight: number | null;
  confirmed: boolean;
  confirmations: number | null;
  timestamp: string | null;
  valueLitoshi: string | null;
  valueInLitoshi: string | null;
  feesLitoshi: string | null;
  inputs:
    readonly LitecoinTransactionInput[];
  outputs:
    readonly LitecoinTransactionOutput[];
};
