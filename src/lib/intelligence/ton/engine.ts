import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  buildTonDerivedAnalysis,
  type TonDerivedAnalysis,
} from "./analysis";

import {
  normalizeTonAddress,
} from "./address";

import {
  getTonEvidence,
} from "./provider";

import type {
  TonEvidence,
  TonProviderResult,
} from "./types";

export type TonIntelligence = {
  ok:
    true;

  network:
    "ton";

  address:
    string;

  analysisPlan:
    AnalysisDepthPlan;

  coverage:
    | "partial"
    | "limited";

  account:
    TonEvidence[
      "account"
    ];

  history: {
    transactions:
      TonEvidence[
        "transactions"
      ];
  };

  jettons: {
    wallets:
      TonEvidence[
        "jettonWallets"
      ];

    transfers:
      TonEvidence[
        "jettonTransfers"
      ];
  };

  derived:
    TonDerivedAnalysis;

  evidenceCoverage:
    TonEvidence[
      "coverage"
    ];

  modules: {
    accountState: {
      status:
        "complete" |
        "limited";

      error:
        string | null;
    };

    transactionHistory: {
      status:
        "complete" |
        "limited";

      error:
        string | null;
    };

    flow: {
      status:
        "limited" |
        "unavailable";

      error:
        string | null;
    };

    counterparties: {
      status:
        "limited" |
        "unavailable";

      error:
        string | null;
    };

    funding: {
      status:
        "limited" |
        "unavailable";

      error:
        string | null;
    };

    jettons: {
      status:
        "complete" |
        "limited";

      error:
        string | null;
    };
  };

  findings:
    readonly IntelligenceFinding[];

  caveats:
    readonly string[];
};

type TonFailure = {
  ok:
    false;

  network:
    "ton";

  code:
    | "INVALID_ADDRESS"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR";

  error:
    string;
};

export type TonEngineDependencies = {
  loadEvidence(
    input: {
      address:
        string;

      analysisPlan:
        AnalysisDepthPlan;
    }
  ): Promise<
    TonProviderResult
  >;
};

const DEFAULT_DEPENDENCIES:
  TonEngineDependencies = {
    loadEvidence:
      getTonEvidence,
  };

export async function runTonIntelligence(
  {
    address,
    analysisPlan =
      "free",
  }: {
    address:
      string;

    analysisPlan?:
      AnalysisDepthPlan;
  },

  deps:
    TonEngineDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  IntelligenceEngineResult<
    TonIntelligence |
    TonFailure
  >
> {
  const normalized =
    normalizeTonAddress(
      address
    );

  if (!normalized) {
    return {
      status:
        400,

      data: {
        ok:
          false,

        network:
          "ton",

        code:
          "INVALID_ADDRESS",

        error:
          "Invalid TON mainnet address.",
      },
    };
  }

  const evidence =
    await deps.loadEvidence({
      address:
        normalized,

      analysisPlan,
    });

  if (!evidence.ok) {
    return {
      status:
        evidence.code ===
          "RATE_LIMITED"
          ? 429
          : evidence.code ===
              "INVALID_ADDRESS"
            ? 400
            : 502,

      data: {
        ok:
          false,

        network:
          "ton",

        code:
          evidence.code ===
            "RATE_LIMITED"
            ? "RATE_LIMITED"
            : evidence.code ===
                "INVALID_ADDRESS"
              ? "INVALID_ADDRESS"
              : "UPSTREAM_ERROR",

        error:
          evidence.error,
      },
    };
  }

  const data =
    evidence.data;

  const derived =
    buildTonDerivedAnalysis({
      address:
        normalized,

      evidence:
        data,
    });

  const findings:
    IntelligenceFinding[] =
      [];

  findings.push({
    id:
      "ton-account-state",

    category:
      "coverage",

    title:
      "TON account state observed",

    severity:
      "informational",

    confidence:
      "high",

    summary:
      `TON Center reports account status ${data.account.status ?? "unknown"}, ${data.transactions.length} bounded transaction(s), and ${data.jettonWallets.length} non-zero Jetton wallet sample(s).`,

    caveat:
      "Indexed account evidence is bounded by the selected AYZO plan and does not represent exhaustive lifetime activity.",
  });

  if (
    derived
      .observedFunding
  ) {
    findings.push({
      id:
        "ton-observed-funding",

      category:
        "funding",

      title:
        "Observed inbound TON evidence",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `An early bounded transaction shows inbound TON from ${derived.observedFunding.sourceAddress}.`,

      caveat:
        "The observed message source is direct on-chain evidence, not a claim of ultimate funding origin, beneficial ownership or control.",
    });
  }

  if (
    derived
      .jettons
      .walletCount >
    0
  ) {
    findings.push({
      id:
        "ton-jettons",

      category:
        "asset",

      title:
        "Jetton holdings observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO observed ${derived.jettons.positiveBalanceCount} positive Jetton balance(s) across ${derived.jettons.masterCount} Jetton master address(es).`,

      caveat:
        "Jetton names, symbols and metadata are descriptive only. AYZO does not treat token metadata as proof of authenticity.",
    });
  }

  return {
    status:
      200,

    data: {
      ok:
        true,

      network:
        "ton",

      address:
        normalized,

      analysisPlan,

      coverage:
        data.transactions
          .length >
          0 ||
        data.jettonWallets
          .length >
          0
          ? "partial"
          : "limited",

      account:
        data.account,

      history: {
        transactions:
          data.transactions,
      },

      jettons: {
        wallets:
          data
            .jettonWallets,

        transfers:
          data
            .jettonTransfers,
      },

      derived,

      evidenceCoverage:
        data.coverage,

      modules: {
        accountState: {
          status:
            "complete",

          error:
            null,
        },

        transactionHistory: {
          status:
            "limited",

          error:
            `Transaction history is bounded to ${data.coverage.historyLimit} recent indexed transactions.`,
        },

        flow: {
          status:
            data.transactions
              .length >
              0
              ? "limited"
              : "unavailable",

          error:
            data.transactions
              .length >
              0
              ? "TON flow is derived from bounded inbound and outbound message evidence."
              : "No transaction-message evidence was observed.",
        },

        counterparties: {
          status:
            derived
              .counterparties
              .count >
              0
              ? "limited"
              : "unavailable",

          error:
            derived
              .counterparties
              .count >
              0
              ? "Relationships are direct observed message or Jetton-transfer participants only."
              : "No direct relationship evidence was observed.",
        },

        funding: {
          status:
            derived
              .observedFunding
              ? "limited"
              : "unavailable",

          error:
            derived
              .observedFunding
              ? `Funding evidence is bounded to ${data.coverage.earliestHistoryLimit} earliest indexed transactions.`
              : "No bounded inbound TON funding observation was resolved.",
        },

        jettons: {
          status:
            "limited",

          error:
            `Jetton holdings and transfers are bounded to ${data.coverage.jettonWalletLimit} wallets and ${data.coverage.jettonTransferLimit} transfers.`,
        },
      },

      findings,

      caveats: [
        "TON is message-driven: one user action can produce multiple internal messages and transactions.",
        "AYZO reports direct observed message relationships and does not infer common ownership or real-world identity.",
        "Jettons use separate Jetton master and Jetton wallet contracts; token metadata is not proof of authenticity.",
        "Transaction, Jetton wallet and transfer queries are intentionally bounded according to the active plan.",
        "Observed funding identifies an early direct inbound message in the bounded evidence window, not the ultimate origin of funds.",
      ],
    },
  };
}
