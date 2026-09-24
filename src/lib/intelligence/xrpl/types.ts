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

  amountDrops:
    string | null;

  feeDrops:
    string | null;

  result:
    string | null;
};

export type XrplAccountEvidence = {
  account:
    XrplAccountState;

  transactions:
    readonly XrplObservedTransaction[];

  nextCursor:
    string | null;
};