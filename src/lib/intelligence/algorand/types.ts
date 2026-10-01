import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type AlgorandCoverage =
  | "complete"
  | "limited"
  | "unavailable";

export type AlgorandAssetHolding = {
  assetId: number;
  amount: string;
  frozen?: boolean;
};

export type AlgorandTransactionEvidence = {
  id: string;
  confirmedRound?: number;
  roundTime?: number;
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
  sender?: string;
  rekeyTo?: string;
  innerTransactionCount: number;
};

export type AlgorandEvidence = {
  network: "algorand";
  address: string;
  analysisPlan: AnalysisDepthPlan;
  amountMicroAlgos: string | null;
  authAddress: string | null;
  assets:
    readonly AlgorandAssetHolding[];
  transactions:
    readonly AlgorandTransactionEvidence[];
  coverage: {
    accountState: AlgorandCoverage;
    transactionHistory: AlgorandCoverage;
    assets: AlgorandCoverage;
    applications: AlgorandCoverage;
    rekey: AlgorandCoverage;
    innerTransactions: AlgorandCoverage;
    flow: AlgorandCoverage;
    counterparties: AlgorandCoverage;
    funding: AlgorandCoverage;
  };
};
