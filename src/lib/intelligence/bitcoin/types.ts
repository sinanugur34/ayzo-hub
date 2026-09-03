import type {
  ProviderId,
} from "@/lib/providers/types";

export type BitcoinNetworkContext = {
  networkId: "bitcoin";
  name: string;
  nativeCurrency: "BTC";
};

export type BitcoinProviderErrorCode =
  | "UNSUPPORTED_NETWORK"
  | "UNSUPPORTED_CAPABILITY"
  | "INVALID_ADDRESS"
  | "INVALID_TRANSACTION_HASH"
  | "INVALID_CURSOR"
  | "INVALID_LIMIT"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR";

export type BitcoinProviderSuccess<T> = {
  ok: true;
  providerId: ProviderId;
  latencyMs: number;
  data: T;
};

export type BitcoinProviderFailure = {
  ok: false;
  providerId: ProviderId;
  latencyMs: number | null;
  code: BitcoinProviderErrorCode;
  error: string;
};

export type BitcoinProviderResult<T> =
  | BitcoinProviderSuccess<T>
  | BitcoinProviderFailure;

export type BitcoinAddressTransaction = {
  transactionHash: string;
  blockHeight: number | null;
  timestamp: string | null;
};

export type BitcoinAddressHistoryPage = {
  transactions:
    readonly BitcoinAddressTransaction[];
  nextCursor: string | null;
};

export type BitcoinPrevoutEvidence = {
  valueSats: string;
  scriptPubKey: string | null;
};

export type BitcoinPrevoutStatus =
  | "resolved"
  | "coinbase"
  | "omitted"
  | "unavailable";

export type BitcoinTransactionInput = {
  previousTransactionHash:
    string | null;
  previousOutputIndex:
    number | null;
  prevout:
    BitcoinPrevoutEvidence | null;
  prevoutStatus:
    BitcoinPrevoutStatus;
};

export type BitcoinTransactionOutput = {
  index: number;
  valueSats: string;
  scriptPubKey: string | null;
};

export type BitcoinPrevoutCoverage = {
  eligible: number;
  attempted: number;
  resolved: number;
  unavailable: number;
  omitted: number;
  complete: boolean;
};

export type BitcoinTransactionEvidence = {
  transactionHash: string;
  witnessHash: string | null;
  blockHash: string | null;
  confirmed: boolean;
  confirmations: number | null;
  inputs:
    readonly BitcoinTransactionInput[];
  outputs:
    readonly BitcoinTransactionOutput[];
  prevoutCoverage:
    BitcoinPrevoutCoverage;
};
