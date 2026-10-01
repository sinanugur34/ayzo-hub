import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type ZcashEvidenceCoverage =
  | "complete"
  | "limited"
  | "unavailable";

export type ZcashTransparentUtxo = {
  txid: string;
  height: number;
  outputIndex: number;
  zatoshis: string;
  scriptHex?: string;
};

export type ZcashTransparentTransaction = {
  txid: string;
  height?: number;
  timestamp?: number;
};

export type ZcashEvidence = {
  network: "zcash";
  address: string;
  addressKind:
    | "transparent-p2pkh"
    | "transparent-p2sh";
  analysisPlan: AnalysisDepthPlan;
  balanceZatoshis: string | null;
  totalReceivedZatoshis: string | null;
  utxos:
    readonly ZcashTransparentUtxo[];
  transactions:
    readonly ZcashTransparentTransaction[];
  coverage: {
    balance: ZcashEvidenceCoverage;
    history: ZcashEvidenceCoverage;
    utxos: ZcashEvidenceCoverage;
    canonicalTransactions: ZcashEvidenceCoverage;
    flow: ZcashEvidenceCoverage;
    counterparties: ZcashEvidenceCoverage;
    funding: ZcashEvidenceCoverage;
  };
};
