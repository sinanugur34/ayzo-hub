import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type CardanoProviderId =
  | "cardano-blockfrost"
  | "cardano-koios";

export type CardanoProviderErrorCode =
  | "INVALID_ADDRESS"
  | "INVALID_TRANSACTION_HASH"
  | "INVALID_LIMIT"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "MALFORMED_RESPONSE";

export type CardanoProviderResult<T> =
  | {
      ok:
        true;

      providerId:
        CardanoProviderId;

      latencyMs:
        number;

      data:
        T;
    }
  | {
      ok:
        false;

      providerId:
        CardanoProviderId;

      latencyMs:
        number | null;

      code:
        CardanoProviderErrorCode;

      error:
        string;
    };

export type CardanoAssetAmount = {
  unit:
    string;

  quantity:
    string;

  policyId:
    string | null;

  assetNameHex:
    string | null;
};

export type CardanoAddressState = {
  address:
    string;

  stakeAddress:
    string | null;

  script:
    boolean | null;

  nativeBalanceLovelace:
    string;

  assets:
    readonly CardanoAssetAmount[];
};

export type CardanoTransactionSummary = {
  transactionHash:
    string;

  blockHeight:
    number | null;

  blockTime:
    string | null;
};

export type CardanoTransactionInput = {
  address:
    string | null;

  transactionHash:
    string | null;

  outputIndex:
    number | null;

  amounts:
    readonly CardanoAssetAmount[];
};

export type CardanoTransactionOutput = {
  address:
    string | null;

  outputIndex:
    number | null;

  amounts:
    readonly CardanoAssetAmount[];
};

export type CardanoCanonicalTransaction = {
  transactionHash:
    string;

  blockHash:
    string | null;

  blockHeight:
    number | null;

  blockTime:
    string | null;

  feeLovelace:
    string | null;

  validContract:
    boolean | null;

  inputs:
    readonly CardanoTransactionInput[];

  outputs:
    readonly CardanoTransactionOutput[];
};

export type CardanoUtxoEvidence = {
  transactionHash:
    string;

  outputIndex:
    number;

  blockHash:
    string | null;

  amounts:
    readonly CardanoAssetAmount[];

  datumHash:
    string | null;

  inlineDatum:
    string | null;

  referenceScriptHash:
    string | null;
};

export type CardanoStakeEvidence = {
  stakeAddress:
    string;

  active:
    boolean | null;

  poolId:
    string | null;

  controlledAmount:
    string | null;

  rewardsAvailable:
    string | null;

  withdrawalsTotal:
    string | null;

  reservesSum:
    string | null;

  treasurySum:
    string | null;
};

export type CardanoEvidenceCoverage = {
  plan:
    AnalysisDepthPlan;

  historyLimit:
    number;

  earliestHistoryLimit:
    number;

  utxoLimit:
    number;

  assetLimit:
    number;

  canonicalSampleLimit:
    number;

  canonicalRequested:
    number;

  canonicalVerified:
    number;

  canonicalUnavailable:
    number;

  historyHasMore:
    boolean;

  utxosHaveMore:
    boolean;

  providerRequestBudget:
    number;

  providerRequestsUsed:
    number;

  primaryProvider:
    CardanoProviderId;

  fallbackProvider:
    CardanoProviderId | null;

  fallbackUsed:
    boolean;
};

export type CardanoEvidence = {
  addressState:
    CardanoAddressState;

  recentTransactions:
    readonly CardanoTransactionSummary[];

  earliestTransactions:
    readonly CardanoTransactionSummary[];

  utxos:
    readonly CardanoUtxoEvidence[];

  canonicalTransactions:
    readonly CardanoCanonicalTransaction[];

  stake:
    CardanoStakeEvidence | null;

  coverage:
    CardanoEvidenceCoverage;
};
