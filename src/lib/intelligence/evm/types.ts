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
  | "INVALID_TOKEN_ADDRESS"
  | "INVALID_TRANSACTION_HASH"
  | "CALL_REVERTED"
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
  isErc20: boolean;
};

export type EvmTokenHolder = {
  address: string;
  balance: string;
  percentage: number | null;
};

export type EvmTokenHolders = {
  holders: readonly EvmTokenHolder[];
  totalSupply: string | null;
  totalCount: number | null;
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

export type EvmTransactionsPage = {
  transactions: readonly EvmTransaction[];
  nextCursor: string | null;
};

export type EvmTransfer = {
  transactionHash: string;
  blockNumber: number | null;
  timestamp: string | null;
  from: string;
  to: string;
  tokenAddress: string;
  value: string;
};

export type EvmTransfersPage = {
  transfers: readonly EvmTransfer[];
  nextCursor: string | null;
};

export type EvmContractCode = {
  address: string;
  code: string;
  isContract: boolean;
};

export type EvmContractVerification = {
  networkId: NetworkId;
  address: string;
  isContract: boolean;
  providerId: ProviderId;
  latencyMs: number;
};

export type EvmContractDeploymentEvidence = {
  contractAddress: string;
  deployerAddress: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: string | null;

  creationKind:
    "top_level_create";

  evidenceKind:
    "transaction_receipt";
};

export type EvmContractDeploymentCoverage = {
  historicalCodeSearch: boolean;
  topLevelCreateReceipts: boolean;
  internalCreate: boolean;
  create2: boolean;
  limitation: string | null;
};

export type EvmContractDeploymentLookup = {
  contractAddress: string;
  isContract: boolean;

  firstObservedCodeBlock:
    number | null;

  deployment:
    EvmContractDeploymentEvidence | null;

  coverage:
    EvmContractDeploymentCoverage;
};

export type EvmContractCall = {
  address: string;
  data: string;
  blockTag: string;
  result: string;
};


export type EvmTransactionReceipt = {
  transactionHash: string;
  blockNumber: number;
  from: string;
  to: string | null;
  contractAddress: string | null;
  success: boolean | null;
};
