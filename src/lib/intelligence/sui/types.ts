import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type SuiProviderErrorCode =
  | "INVALID_ADDRESS"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR";

export type SuiProviderResult<T> =
  | {
      ok: true;
      providerId:
        "sui-graphql";
      latencyMs:
        number;
      data:
        T;
    }
  | {
      ok: false;
      providerId:
        "sui-graphql";
      latencyMs:
        number | null;
      code:
        SuiProviderErrorCode;
      error:
        string;
    };

export type SuiCoinBalanceEvidence = {
  coinType:
    string;

  totalBalance:
    string;

  coinBalance:
    string | null;

  addressBalance:
    string | null;

  symbol:
    string | null;

  name:
    string | null;

  decimals:
    number | null;
};

export type SuiOwnedObjectEvidence = {
  objectId:
    string;

  version:
    number | null;

  digest:
    string | null;

  type:
    string | null;

  hasPublicTransfer:
    boolean | null;
};

export type SuiBalanceChangeEvidence = {
  owner:
    string | null;

  coinType:
    string | null;

  amount:
    string | null;
};

export type SuiObjectChangeEvidence = {
  objectId:
    string;

  idCreated:
    boolean;

  idDeleted:
    boolean;
};

export type SuiObservedTransaction = {
  transactionHash:
    string;

  sender:
    string | null;

  timestamp:
    string | null;

  status:
    string | null;

  balanceChanges:
    readonly SuiBalanceChangeEvidence[];

  objectChanges:
    readonly SuiObjectChangeEvidence[];
};

export type SuiSubjectObjectEvidence = {
  exists:
    boolean;

  kind:
    | "move_object"
    | "package"
    | "object"
    | null;

  objectId:
    string | null;

  version:
    number | null;

  digest:
    string | null;

  type:
    string | null;

  hasPublicTransfer:
    boolean | null;
};

export type SuiEvidenceCoverage = {
  plan:
    AnalysisDepthPlan;

  historyLimit:
    number;

  earliestHistoryLimit:
    number;

  balanceLimit:
    number;

  objectLimit:
    number;

  historyHasMore:
    boolean;

  earliestHistoryHasMore:
    boolean;

  balancesHaveMore:
    boolean;

  objectsHaveMore:
    boolean;
};

export type SuiAccountEvidence = {
  chainIdentifier:
    string | null;

  address:
    string;

  suiBalanceMist:
    string;

  balances:
    readonly SuiCoinBalanceEvidence[];

  ownedObjects:
    readonly SuiOwnedObjectEvidence[];

  transactions:
    readonly SuiObservedTransaction[];

  earliestTransactions:
    readonly SuiObservedTransaction[];

  subjectObject:
    SuiSubjectObjectEvidence;

  coverage:
    SuiEvidenceCoverage;
};
