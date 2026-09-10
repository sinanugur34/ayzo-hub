import type {
  ProviderId,
} from "@/lib/providers/types";

export type DogecoinNetworkContext = {
  networkId: "dogecoin";
  name: "Dogecoin";
  nativeCurrency: "DOGE";
};

export type DogecoinProviderErrorCode =
  | "UNSUPPORTED_NETWORK"
  | "UNSUPPORTED_CAPABILITY"
  | "INVALID_ADDRESS"
  | "INVALID_TRANSACTION_HASH"
  | "INVALID_CURSOR"
  | "INVALID_LIMIT"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR";

export type DogecoinProviderSuccess<T> = {
  ok: true;
  providerId: ProviderId;
  latencyMs: number;
  data: T;
};

export type DogecoinProviderFailure = {
  ok: false;
  providerId: ProviderId;
  latencyMs: number | null;
  code: DogecoinProviderErrorCode;
  error: string;
};

export type DogecoinProviderResult<T> =
  | DogecoinProviderSuccess<T>
  | DogecoinProviderFailure;

export type DogecoinAddressTransaction = {
  transactionHash: string;
  blockHeight: number | null;
  timestamp: string | null;
};

export type DogecoinAddressHistoryPage = {
  transactions:
    readonly DogecoinAddressTransaction[];
  nextCursor: string | null;
};

export type DogecoinTransactionInput = {
  previousTransactionHash:
    string | null;
  previousOutputIndex:
    number | null;
  valueKoinu:
    string | null;
  addresses:
    readonly string[];
  coinbase:
    boolean;
};

export type DogecoinTransactionOutput = {
  index: number;
  valueKoinu: string;
  scriptHex: string | null;
  addresses:
    readonly string[];
};

export type DogecoinTransactionEvidence = {
  transactionHash: string;
  blockHash: string | null;
  blockHeight: number | null;
  confirmed: boolean;
  confirmations: number | null;
  timestamp: string | null;
  valueKoinu: string | null;
  valueInKoinu: string | null;
  feesKoinu: string | null;
  inputs:
    readonly DogecoinTransactionInput[];
  outputs:
    readonly DogecoinTransactionOutput[];
};
