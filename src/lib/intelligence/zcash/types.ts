import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type ZcashProviderId =
  | "zcash-blockchair"
  | "zcash-nownodes";

export type ZcashProviderErrorCode =
  | "INVALID_ADDRESS"
  | "INVALID_TRANSACTION_HASH"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "MALFORMED_RESPONSE";

export type ZcashProviderResult<T> =
  | {
      ok: true;
      providerId:
        ZcashProviderId;
      latencyMs:
        number;
      data:
        T;
    }
  | {
      ok: false;
      providerId:
        ZcashProviderId;
      latencyMs:
        number | null;
      code:
        ZcashProviderErrorCode;
      error:
        string;
    };

export type ZcashEvidenceCoverage =
  | "complete"
  | "partial"
  | "limited"
  | "unavailable";

export type ZcashTransparentUtxo = {
  txid:
    string;

  height:
    number | null;

  outputIndex:
    number;

  zatoshis:
    string;
};

export type ZcashTransparentTransaction = {
  txid:
    string;

  height:
    number | null;

  timestamp:
    string | null;
};

export type ZcashTransparentInput = {
  previousTransactionHash:
    string | null;

  previousOutputIndex:
    number | null;

  address:
    string | null;

  valueZatoshis:
    string | null;
};

export type ZcashTransparentOutput = {
  index:
    number | null;

  address:
    string | null;

  valueZatoshis:
    string | null;
};

export type ZcashCanonicalTransaction = {
  txid:
    string;

  height:
    number | null;

  timestamp:
    string | null;

  coinbase:
    boolean | null;

  inputs:
    readonly ZcashTransparentInput[];

  outputs:
    readonly ZcashTransparentOutput[];
};

export type ZcashEvidenceMeta = {
  plan:
    AnalysisDepthPlan;

  historyLimit:
    number;

  canonicalSampleLimit:
    number;

  utxoLimit:
    number;

  providerRequestBudget:
    number;

  providerRequestsUsed:
    number;

  historyHasMore:
    boolean;

  utxosHaveMore:
    boolean;

  canonicalRequested:
    number;

  canonicalVerified:
    number;

  canonicalUnavailable:
    number;
};

export type ZcashEvidence = {
  network:
    "zcash";

  address:
    string;

  addressKind:
    | "transparent-p2pkh"
    | "transparent-p2sh";

  analysisPlan:
    AnalysisDepthPlan;

  balanceZatoshis:
    string | null;

  totalReceivedZatoshis:
    string | null;

  totalSpentZatoshis:
    string | null;

  transactions:
    readonly ZcashTransparentTransaction[];

  utxos:
    readonly ZcashTransparentUtxo[];

  canonicalTransactions:
    readonly ZcashCanonicalTransaction[];

  coverage:
    ZcashEvidenceMeta;
};
