import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type AlgorandProviderId =
  "algorand-nodely";

export type AlgorandProviderErrorCode =
  | "INVALID_ADDRESS"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "MALFORMED_RESPONSE";

export type AlgorandProviderResult<T> =
  | {
      ok: true;
      providerId:
        AlgorandProviderId;
      latencyMs:
        number;
      data: T;
    }
  | {
      ok: false;
      providerId:
        AlgorandProviderId;
      latencyMs:
        number | null;
      code:
        AlgorandProviderErrorCode;
      error:
        string;
    };

export type AlgorandCoverage =
  | "complete"
  | "partial"
  | "limited"
  | "unavailable";

export type AlgorandAssetHolding = {
  assetId:
    number;

  amount:
    string;

  frozen:
    boolean | null;
};

export type AlgorandAssetAuthority = {
  assetId:
    number;

  creator:
    string | null;

  total:
    string | null;

  decimals:
    number | null;

  name:
    string | null;

  unitName:
    string | null;

  manager:
    string | null;

  reserve:
    string | null;

  freeze:
    string | null;

  clawback:
    string | null;
};

export type AlgorandApplicationLocalState = {
  applicationId:
    number;
};

export type AlgorandCreatedApplication = {
  applicationId:
    number;

  creator:
    string | null;
};

export type AlgorandPaymentEvidence = {
  receiver:
    string | null;

  amountMicroAlgos:
    string | null;

  closeRemainderTo:
    string | null;
};

export type AlgorandAssetTransferEvidence = {
  assetId:
    number | null;

  receiver:
    string | null;

  amount:
    string | null;

  explicitSender:
    string | null;

  closeTo:
    string | null;
};

export type AlgorandAssetFreezeEvidence = {
  assetId:
    number | null;

  address:
    string | null;

  frozen:
    boolean | null;
};

export type AlgorandApplicationCallEvidence = {
  applicationId:
    number | null;

  onCompletion:
    string | null;

  accounts:
    readonly string[];
};

export type AlgorandTransactionEvidence = {
  id:
    string | null;

  confirmedRound:
    number | null;

  roundTime:
    number | null;

  type:
    | "pay"
    | "keyreg"
    | "acfg"
    | "axfer"
    | "afrz"
    | "appl"
    | "stpf"
    | "hb"
    | "unknown";

  sender:
    string | null;

  rekeyTo:
    string | null;

  payment:
    AlgorandPaymentEvidence | null;

  assetTransfer:
    AlgorandAssetTransferEvidence | null;

  assetFreeze:
    AlgorandAssetFreezeEvidence | null;

  applicationCall:
    AlgorandApplicationCallEvidence | null;

  createdAssetId:
    number | null;

  createdApplicationId:
    number | null;

  innerTransactions:
    readonly AlgorandTransactionEvidence[];
};

export type AlgorandEvidenceCoverage = {
  plan:
    AnalysisDepthPlan;

  transactionLimit:
    number;

  assetLimit:
    number;

  createdAssetLimit:
    number;

  applicationLimit:
    number;

  providerRequestBudget:
    number;

  providerRequestsUsed:
    number;

  historyHasMore:
    boolean;

  assetsHaveMore:
    boolean;

  createdAssetsHaveMore:
    boolean;

  appLocalStateHasMore:
    boolean;

  createdAppsHaveMore:
    boolean;

  transportFailoverUsed:
    boolean;

  unavailableEvidence:
    readonly string[];

  coverage:
    "complete" |
    "partial";
};

export type AlgorandEvidence = {
  network:
    "algorand";

  address:
    string;

  analysisPlan:
    AnalysisDepthPlan;

  amountMicroAlgos:
    string | null;

  minBalanceMicroAlgos:
    string | null;

  authAddress:
    string | null;

  totalAssetsOptedIn:
    number | null;

  totalAppsOptedIn:
    number | null;

  assets:
    readonly AlgorandAssetHolding[];

  createdAssets:
    readonly AlgorandAssetAuthority[];

  appLocalStates:
    readonly AlgorandApplicationLocalState[];

  createdApplications:
    readonly AlgorandCreatedApplication[];

  transactions:
    readonly AlgorandTransactionEvidence[];

  coverage:
    AlgorandEvidenceCoverage;
};
