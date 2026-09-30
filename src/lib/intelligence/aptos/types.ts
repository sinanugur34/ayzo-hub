import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type AptosProviderId =
  | "aptos-fullnode"
  | "aptos-indexer";

export type AptosProviderErrorCode =
  | "INVALID_ADDRESS"
  | "INVALID_LIMIT"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "MALFORMED_RESPONSE";

export type AptosProviderResult<T> =
  | {
      ok:
        true;

      providerId:
        AptosProviderId;

      latencyMs:
        number;

      data:
        T;
    }
  | {
      ok:
        false;

      providerId:
        AptosProviderId;

      latencyMs:
        number | null;

      code:
        AptosProviderErrorCode;

      error:
        string;
    };

export type AptosAccountState = {
  address:
    string;

  sequenceNumber:
    string | null;

  authenticationKey:
    string | null;

  statelessCompatible:
    boolean;
};

export type AptosFungibleAssetBalance = {
  assetType:
    string;

  metadataAddress:
    string | null;

  amount:
    string;

  symbol:
    string | null;

  name:
    string | null;

  decimals:
    number | null;
};

export type AptosMoveResourceEvidence = {
  type:
    string;

  moduleAddress:
    string | null;

  moduleName:
    string | null;

  structName:
    string | null;
};

export type AptosObjectEvidence = {
  objectAddress:
    string;

  ownerAddress:
    string | null;

  stateKeyHash:
    string | null;
};

export type AptosEventEvidence = {
  type:
    string | null;

  accountAddress:
    string | null;

  sequenceNumber:
    string | null;

  creationNumber:
    string | null;

  data:
    Readonly<
      Record<
        string,
        unknown
      >
    > | null;
};

export type AptosChangeEvidence = {
  type:
    string;

  address:
    string | null;

  stateKeyHash:
    string | null;

  resource:
    string | null;
};

export type AptosObservedTransaction = {
  transactionHash:
    string;

  version:
    string | null;

  timestamp:
    string | null;

  sender:
    string | null;

  success:
    boolean | null;

  vmStatus:
    string | null;

  gasUsed:
    string | null;

  gasUnitPrice:
    string | null;

  sequenceNumber:
    string | null;

  replayProtectionNonce:
    string | null;

  moduleAddress:
    string | null;

  moduleName:
    string | null;

  functionName:
    string | null;

  payloadArguments:
    readonly unknown[];

  events:
    readonly AptosEventEvidence[];

  changes:
    readonly AptosChangeEvidence[];
};

export type AptosEvidenceCoverage = {
  plan:
    AnalysisDepthPlan;

  transactionLimit:
    number;

  earliestTransactionLimit:
    number;

  fungibleAssetLimit:
    number;

  resourceLimit:
    number;

  objectLimit:
    number;

  eventLimit:
    number;

  providerRequestBudget:
    number;

  providerRequestsUsed:
    number;

  transactionHistoryMayBePruned:
    boolean;

  transactionHistoryHasMore:
    boolean;
};

export type AptosEvidence = {
  chainId:
    number | null;

  ledgerVersion:
    string | null;

  account:
    AptosAccountState;

  aptBalanceOctas:
    string;

  fungibleAssets:
    readonly AptosFungibleAssetBalance[];

  resources:
    readonly AptosMoveResourceEvidence[];

  objects:
    readonly AptosObjectEvidence[];

  transactions:
    readonly AptosObservedTransaction[];

  earliestTransactions:
    readonly AptosObservedTransaction[];

  coverage:
    AptosEvidenceCoverage;
};
