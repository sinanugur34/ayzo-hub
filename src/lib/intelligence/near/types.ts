import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  NearAccountKind,
} from "./address";

export type NearProviderId =
  | "near-rpc"
  | "near-nearblocks";

export type NearProviderErrorCode =
  | "INVALID_ACCOUNT"
  | "INVALID_LIMIT"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "MALFORMED_RESPONSE";

export type NearProviderResult<T> =
  | {
      ok:
        true;

      providerId:
        NearProviderId;

      latencyMs:
        number;

      data:
        T;
    }
  | {
      ok:
        false;

      providerId:
        NearProviderId;

      latencyMs:
        number | null;

      code:
        NearProviderErrorCode;

      error:
        string;
    };

export type NearAccountState = {
  accountId:
    string;

  accountKind:
    NearAccountKind;

  amountYoctoNear:
    string;

  lockedYoctoNear:
    string;

  storageUsage:
    number | null;

  storagePaidAt:
    number | null;

  codeHash:
    string | null;

  blockHeight:
    number | null;

  blockHash:
    string | null;
};

export type NearAccessKeyPermission =
  | {
      type:
        "full-access";
    }
  | {
      type:
        "function-call";

      allowanceYoctoNear:
        string | null;

      receiverId:
        string | null;

      methodNames:
        readonly string[];
    }
  | {
      type:
        "unknown";
    };

export type NearAccessKeyEvidence = {
  publicKey:
    string;

  nonce:
    number | null;

  permission:
    NearAccessKeyPermission;
};

export type NearActionType =
  | "Transfer"
  | "FunctionCall"
  | "CreateAccount"
  | "DeleteAccount"
  | "AddKey"
  | "DeleteKey"
  | "Stake"
  | "DeployContract"
  | "unknown";

export type NearObservedAction = {
  type:
    NearActionType;

  senderId:
    string | null;

  receiverId:
    string | null;

  transactionHash:
    string | null;

  receiptId:
    string | null;

  blockHeight:
    number | null;

  blockTimestamp:
    string | null;

  methodName:
    string | null;

  depositYoctoNear:
    string | null;

  publicKey:
    string | null;
};


export type NearIndexedTransaction = {
  transactionHash:
    string;

  signerId:
    string | null;

  receiverId:
    string | null;

  blockHeight:
    number | null;

  blockTimestamp:
    string | null;

  actions:
    readonly NearObservedAction[];
};

export type NearReceiptEvidence = {
  receiptId:
    string;

  predecessorId:
    string | null;

  receiverId:
    string | null;

  transactionHash:
    string | null;

  blockHeight:
    number | null;

  blockTimestamp:
    string | null;

  actions:
    readonly NearObservedAction[];
};

export type NearIndexedEvidence = {
  transactions:
    readonly NearIndexedTransaction[];

  receipts:
    readonly NearReceiptEvidence[];

  coverage: {
    transactionLimit:
      number;

    receiptLimit:
      number;

    providerRequestsUsed:
      number;

    historyAvailable:
      boolean;

    receiptsAvailable:
      boolean;

    truncated:
      boolean;

    unavailableEvidence:
      readonly string[];
  };
};

export type NearEvidenceCoverage = {
  plan:
    AnalysisDepthPlan;

  accessKeyLimit:
    number;

  transactionLimit:
    number;

  receiptLimit:
    number;

  fungibleTokenLimit:
    number;

  providerRequestBudget:
    number;

  providerRequestsUsed:
    number;

  indexedHistoryAvailable:
    boolean;

  coverage:
    "complete" |
    "partial" |
    "unavailable";

  unavailableEvidence:
    readonly string[];
};

export type NearRpcEvidence = {
  account:
    NearAccountState;

  accessKeys:
    readonly NearAccessKeyEvidence[];

  coverage:
    NearEvidenceCoverage;
};
