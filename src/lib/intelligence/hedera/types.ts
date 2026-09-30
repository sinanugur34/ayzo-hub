import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type HederaProviderId =
  | "hedera-mirror-public";

export type HederaProviderErrorCode =
  | "INVALID_ACCOUNT"
  | "INVALID_LIMIT"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "MALFORMED_RESPONSE";

export type HederaProviderResult<T> =
  | {
      ok:
        true;

      providerId:
        HederaProviderId;

      latencyMs:
        number;

      data:
        T;
    }
  | {
      ok:
        false;

      providerId:
        HederaProviderId;

      latencyMs:
        number | null;

      code:
        HederaProviderErrorCode;

      error:
        string;
    };

export type HederaAccountState = {
  accountId:
    string;

  alias:
    string | null;

  evmAddress:
    string | null;

  balanceTinybar:
    string | null;

  balanceTimestamp:
    string | null;

  deleted:
    boolean | null;

  ethereumNonce:
    string | null;

  memo:
    string | null;

  receiverSignatureRequired:
    boolean | null;

  stakedAccountId:
    string | null;

  stakedNodeId:
    string | null;

  stakePeriodStart:
    string | null;

  pendingRewardTinybar:
    string | null;

  declineReward:
    boolean | null;
};

export type HederaTokenRelationship = {
  tokenId:
    string;

  balance:
    string | null;

  automaticAssociation:
    boolean | null;

  createdTimestamp:
    string | null;

  freezeStatus:
    string | null;

  kycStatus:
    string | null;
};

export type HederaNftEvidence = {
  tokenId:
    string;

  serialNumber:
    number;

  accountId:
    string | null;

  spender:
    string | null;

  delegatingSpender:
    string | null;

  createdTimestamp:
    string | null;

  modifiedTimestamp:
    string | null;

  deleted:
    boolean | null;

  metadata:
    string | null;
};

export type HederaHbarTransfer = {
  accountId:
    string;

  amountTinybar:
    string;

  approval:
    boolean | null;
};

export type HederaTokenTransfer = {
  tokenId:
    string;

  accountId:
    string;

  amount:
    string;

  approval:
    boolean | null;
};

export type HederaNftTransfer = {
  tokenId:
    string;

  serialNumber:
    number;

  senderAccountId:
    string | null;

  receiverAccountId:
    string | null;

  approval:
    boolean | null;
};

export type HederaObservedTransaction = {
  transactionId:
    string | null;

  consensusTimestamp:
    string | null;

  name:
    string | null;

  result:
    string | null;

  chargedTxFeeTinybar:
    string | null;

  transfers:
    readonly HederaHbarTransfer[];

  tokenTransfers:
    readonly HederaTokenTransfer[];

  nftTransfers:
    readonly HederaNftTransfer[];
};

export type HederaTokenControlKeys = {
  admin:
    unknown | null;

  supply:
    unknown | null;

  wipe:
    unknown | null;

  freeze:
    unknown | null;

  kyc:
    unknown | null;

  pause:
    unknown | null;

  feeSchedule:
    unknown | null;
};

export type HederaEvidenceCoverage = {
  plan:
    AnalysisDepthPlan;

  transactionLimit:
    number;

  tokenRelationshipLimit:
    number;

  nftLimit:
    number;

  providerRequestBudget:
    number;

  providerRequestsUsed:
    number;

  historyHasMore:
    boolean;

  tokensHaveMore:
    boolean;

  nftsHaveMore:
    boolean;

  tokenControlMetadataAvailable:
    boolean;

  coverage:
    "complete" |
    "partial" |
    "unavailable";

  unavailableEvidence:
    readonly string[];
};

export type HederaMirrorEvidence = {
  account:
    HederaAccountState;

  transactions:
    readonly HederaObservedTransaction[];

  tokenRelationships:
    readonly HederaTokenRelationship[];

  nfts:
    readonly HederaNftEvidence[];

  coverage:
    HederaEvidenceCoverage;
};
