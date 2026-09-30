import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type StellarBalanceEvidence = {
  assetType:
    string;

  assetCode:
    string | null;

  assetIssuer:
    string | null;

  balance:
    string;

  limit:
    string | null;

  authorized:
    boolean | null;

  authorizedToMaintainLiabilities:
    boolean | null;

  clawbackEnabled:
    boolean | null;
};

export type StellarSignerEvidence = {
  key:
    string;

  type:
    string;

  weight:
    number;
};

export type StellarTransactionEvidence = {
  hash:
    string;

  ledger:
    number | null;

  createdAt:
    string | null;

  sourceAccount:
    string | null;

  feeCharged:
    string | null;

  operationCount:
    number | null;

  successful:
    boolean | null;
};

export type StellarPaymentEvidence = {
  id:
    string;

  type:
    string;

  transactionHash:
    string | null;

  createdAt:
    string | null;

  source:
    string | null;

  destination:
    string | null;

  funder:
    string | null;

  createdAccount:
    string | null;

  amount:
    string | null;

  startingBalance:
    string | null;

  assetType:
    string | null;

  assetCode:
    string | null;

  assetIssuer:
    string | null;
};

export type StellarOperationEvidence = {
  id:
    string;

  type:
    string;

  transactionHash:
    string | null;

  createdAt:
    string | null;

  sourceAccount:
    string | null;
};

export type StellarOfferEvidence = {
  id:
    string;

  seller:
    string | null;

  amount:
    string | null;

  price:
    string | null;

  buying:
    string | null;

  selling:
    string | null;
};

export type StellarTradeEvidence = {
  id:
    string;

  ledgerCloseTime:
    string | null;

  baseAccount:
    string | null;

  counterAccount:
    string | null;

  baseAmount:
    string | null;

  counterAmount:
    string | null;

  baseAsset:
    string | null;

  counterAsset:
    string | null;
};

export type StellarEvidence = {
  account: {
    id:
      string;

    sequence:
      string | null;

    subentryCount:
      number | null;

    inflationDestination:
      string | null;

    homeDomain:
      string | null;

    lastModifiedLedger:
      number | null;

    lastModifiedTime:
      string | null;

    thresholds: {
      low:
        number | null;

      medium:
        number | null;

      high:
        number | null;
    };

    flags: {
      authRequired:
        boolean | null;

      authRevocable:
        boolean | null;

      authImmutable:
        boolean | null;

      authClawbackEnabled:
        boolean | null;
    };

    balances:
      readonly StellarBalanceEvidence[];

    signers:
      readonly StellarSignerEvidence[];
  };

  transactions:
    readonly StellarTransactionEvidence[];

  payments:
    readonly StellarPaymentEvidence[];

  earliestPayments:
    readonly StellarPaymentEvidence[];

  operations:
    readonly StellarOperationEvidence[];

  offers:
    readonly StellarOfferEvidence[];

  trades:
    readonly StellarTradeEvidence[];

  coverage: {
    plan:
      AnalysisDepthPlan;

    transactionLimit:
      number;

    paymentLimit:
      number;

    earliestPaymentLimit:
      number;

    operationLimit:
      number;

    offerLimit:
      number;

    tradeLimit:
      number;

    provider:
      "stellar-horizon";
  };
};

export type StellarProviderResult =
  | {
      ok:
        true;

      providerId:
        "stellar-horizon";

      latencyMs:
        number;

      data:
        StellarEvidence;
    }
  | {
      ok:
        false;

      providerId:
        "stellar-horizon";

      latencyMs:
        number | null;

      code:
        | "INVALID_ADDRESS"
        | "NOT_FOUND"
        | "RATE_LIMITED"
        | "TIMEOUT"
        | "UPSTREAM_ERROR";

      error:
        string;
    };
