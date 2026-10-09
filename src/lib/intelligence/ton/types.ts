import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type TonMessageEvidence = {
  source:
    string | null;

  destination:
    string | null;

  valueNano:
    string;

  hash:
    string | null;

  opcode:
    number | null;

  bounced:
    boolean | null;
};

export type TonTransactionEvidence = {
  transactionHash:
    string;

  logicalTime:
    string | null;

  timestamp:
    string | null;

  totalFeesNano:
    string;

  aborted:
    boolean | null;

  endStatus:
    string | null;

  inbound:
    TonMessageEvidence | null;

  outbound:
    readonly TonMessageEvidence[];
};

export type TonJettonWalletEvidence = {
  walletAddress:
    string;

  owner:
    string | null;

  jettonMaster:
    string;

  balance:
    string;

  lastTransactionLt:
    string | null;

  name:
    string | null;

  symbol:
    string | null;

  validMetadata:
    boolean | null;

  scamMetadata:
    boolean | null;
};

export type TonJettonTransferEvidence = {
  transactionHash:
    string;

  transactionLt:
    string | null;

  timestamp:
    string | null;

  amount:
    string;

  jettonMaster:
    string;

  source:
    string | null;

  sourceWallet:
    string | null;

  destination:
    string | null;

  aborted:
    boolean | null;
};

export type TonAccountEvidence = {
  address:
    string;

  status:
    string | null;

  balanceNano:
    string;

  codeHash:
    string | null;

  interfaces:
    readonly string[];

  suspended:
    boolean | null;

  lastTransactionHash:
    string | null;

  lastTransactionLt:
    string | null;
};

export type TonEvidence = {
  account:
    TonAccountEvidence;

  transactions:
    readonly TonTransactionEvidence[];

  earliestTransactions:
    readonly TonTransactionEvidence[];

  jettonWallets:
    readonly TonJettonWalletEvidence[];

  jettonTransfers:
    readonly TonJettonTransferEvidence[];

  coverage: {
    jettonTransfersAvailable?: boolean;
    plan:
      AnalysisDepthPlan;

    historyLimit:
      number;

    earliestHistoryLimit:
      number;

    jettonWalletLimit:
      number;

    jettonTransferLimit:
      number;

    provider:
      "toncenter-v3";
  };
};

export type TonProviderResult =
  | {
      ok:
        true;

      providerId:
        "toncenter-v3";

      latencyMs:
        number;

      data:
        TonEvidence;
    }
  | {
      ok:
        false;

      providerId:
        "toncenter-v3";

      latencyMs:
        number | null;

      code:
        | "INVALID_ADDRESS"
        | "RATE_LIMITED"
        | "TIMEOUT"
        | "UPSTREAM_ERROR";

      error:
        string;
    };
