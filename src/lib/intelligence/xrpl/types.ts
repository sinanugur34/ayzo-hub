import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type XrplProviderErrorCode =
  | "INVALID_ADDRESS"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR";

export type XrplProviderResult<T> =
  | {
      ok: true;
      providerId:
        "xrpl-public";
      latencyMs:
        number;
      data:
        T;
    }
  | {
      ok: false;
      providerId:
        "xrpl-public";
      latencyMs:
        number | null;
      code:
        XrplProviderErrorCode;
      error:
        string;
    };

export type XrplAccountState = {
  exists:
    boolean;

  balanceDrops:
    string | null;

  sequence:
    number | null;

  ownerCount:
    number | null;

  flags:
    number | null;

  ledgerIndex:
    number | null;

  domain:
    string | null;

  regularKey:
    string | null;

  transferRate:
    number | null;

  tickSize:
    number | null;
};

export type XrplIssuedAmount = {
  currency:
    string;

  issuer:
    string;

  value:
    string;
};

export type XrplObservedTransaction = {
  transactionHash:
    string;

  ledgerIndex:
    number | null;

  timestamp:
    string | null;

  validated:
    boolean;

  transactionType:
    string | null;

  source:
    string | null;

  destination:
    string | null;

  destinationTag:
    number | null;

  sourceTag:
    number | null;

  amountDrops:
    string | null;

  issuedAmount:
    XrplIssuedAmount | null;

  feeDrops:
    string | null;

  result:
    string | null;
};

export type XrplTrustLine = {
  counterparty:
    string;

  currency:
    string;

  balance:
    string;

  limit:
    string | null;

  peerLimit:
    string | null;

  noRipple:
    boolean | null;

  noRipplePeer:
    boolean | null;

  authorized:
    boolean | null;

  peerAuthorized:
    boolean | null;

  freeze:
    boolean | null;

  freezePeer:
    boolean | null;
};

export type XrplAccountObject = {
  ledgerEntryType:
    string;

  index:
    string | null;

  flags:
    number | null;
};

export type XrplSigner = {
  account:
    string;

  weight:
    number;
};

export type XrplSignerList = {
  quorum:
    number;

  signers:
    readonly XrplSigner[];
};

export type XrplFundingEvidence = {
  source:
    string;

  destination:
    string;

  transactionHash:
    string;

  ledgerIndex:
    number | null;

  timestamp:
    string | null;

  amountDrops:
    string | null;

  result:
    string | null;
};

export type XrplEvidenceAvailability = {
  trustLines:
    boolean;

  accountObjects:
    boolean;

  earliestHistory:
    boolean;
};

export type XrplEvidenceCoverage = {
  plan:
    AnalysisDepthPlan;

  historyLimit:
    number;

  earliestHistoryLimit:
    number;

  trustLineLimit:
    number;

  accountObjectLimit:
    number;

  historyHasMore:
    boolean;

  trustLinesHaveMore:
    boolean;

  accountObjectsHaveMore:
    boolean;
};

export type XrplAccountEvidence = {
  account:
    XrplAccountState;

  transactions:
    readonly XrplObservedTransaction[];

  nextCursor:
    string | null;

  trustLines:
    readonly XrplTrustLine[];

  accountObjects:
    readonly XrplAccountObject[];

  signerLists:
    readonly XrplSignerList[];

  firstObservedFunding:
    XrplFundingEvidence | null;

  availability:
    XrplEvidenceAvailability;

  coverage:
    XrplEvidenceCoverage;
};