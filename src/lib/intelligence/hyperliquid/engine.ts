import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  buildHyperliquidDerivedAnalysis,
  type HyperliquidDerivedAnalysis,
} from "./analysis";

import {
  normalizeHyperliquidAddress,
} from "./address";

import {
  getHyperliquidEvidence,
} from "./provider";

import type {
  HyperliquidEvidence,
  HyperliquidProviderResult,
} from "./types";

export type HyperliquidIntelligence = {
  ok:
    true;

  network:
    "hyperliquid";

  address:
    string;

  analysisPlan:
    AnalysisDepthPlan;

  coverage:
    "partial" |
    "limited";

  executionSurfaces: {
    hyperCore: {
      accountValue:
        string | null;

      withdrawable:
        string | null;

      totalNotionalPosition:
        string | null;

      totalMarginUsed:
        string | null;

      role:
        string | null;

      positions:
        HyperliquidEvidence[
          "hyperCore"
        ][
          "positions"
        ];

      spotBalances:
        HyperliquidEvidence[
          "hyperCore"
        ][
          "spotBalances"
        ];

      fills:
        HyperliquidEvidence[
          "hyperCore"
        ][
          "fills"
        ];

      fundingPayments:
        HyperliquidEvidence[
          "hyperCore"
        ][
          "fundingPayments"
        ];

      portfolio:
        HyperliquidEvidence[
          "hyperCore"
        ][
          "portfolio"
        ];

      nonFundingLedger:
        HyperliquidEvidence[
          "hyperCore"
        ][
          "nonFundingLedger"
        ];
    };

    hyperEvm:
      HyperliquidEvidence[
        "hyperEvm"
      ];
  };

  derived:
    HyperliquidDerivedAnalysis;

  evidenceCoverage:
    HyperliquidEvidence[
      "coverage"
    ];

  modules: {
    hyperCoreState: {
      status:
        "complete";

      error:
        null;
    };

    positions: {
      status:
        "complete" |
        "limited";

      error:
        string | null;
    };

    tradingActivity: {
      status:
        "limited" |
        "unavailable";

      error:
        string | null;
    };

    fundingPayments: {
      status:
        "limited" |
        "unavailable";

      error:
        string | null;
    };

    portfolio: {
      status:
        "limited" |
        "unavailable";

      error:
        string | null;
    };

    nonFundingLedger: {
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

    hyperEvmState: {
      status:
        "complete";

      error:
        null;
    };
  };

  findings:
    readonly IntelligenceFinding[];

  caveats:
    readonly string[];
};

type HyperliquidFailure = {
  ok:
    false;

  network:
    "hyperliquid";

  code:
    | "INVALID_ADDRESS"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR";

  error:
    string;
};

export type HyperliquidEngineDependencies = {
  loadEvidence(
    input: {
      address:
        string;

      analysisPlan:
        AnalysisDepthPlan;
    }
  ): Promise<
    HyperliquidProviderResult
  >;
};

const DEFAULT_DEPENDENCIES:
  HyperliquidEngineDependencies = {
    loadEvidence:
      getHyperliquidEvidence,
  };

export async function runHyperliquidIntelligence(
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
    HyperliquidEngineDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  IntelligenceEngineResult<
    HyperliquidIntelligence |
    HyperliquidFailure
  >
> {
  const normalized =
    normalizeHyperliquidAddress(
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
          "hyperliquid",

        code:
          "INVALID_ADDRESS",

        error:
          "Invalid Hyperliquid account address.",
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
          "hyperliquid",

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
    buildHyperliquidDerivedAnalysis(
      data
    );

  const findings:
    IntelligenceFinding[] =
      [];

  findings.push({
    id:
      "hyperliquid-execution-surfaces",

    category:
      "coverage",

    title:
      "HyperCore and HyperEVM evidence resolved",

    severity:
      "informational",

    confidence:
      "high",

    summary:
      `AYZO resolved HyperCore account/trading state and independently verified HyperEVM chain ID ${data.hyperEvm.chainId}.`,

    caveat:
      "HyperCore exchange state and HyperEVM blockchain state are distinct execution surfaces and are reported separately.",
  });

  if (
    derived
      .hyperCore
      .openPositionCount >
    0
  ) {
    findings.push({
      id:
        "hyperliquid-open-positions",

      category:
        "asset",

      title:
        "Open HyperCore positions observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO observed ${derived.hyperCore.openPositionCount} non-zero perpetual position(s) in current HyperCore clearinghouse state.`,

      caveat:
        "Position state is account-state evidence and does not establish identity, strategy intent or future behavior.",
    });
  }

  if (
    derived
      .hyperCore
      .fundingPaymentCount >
    0
  ) {
    findings.push({
      id:
        "hyperliquid-funding-payments",

      category:
        "coverage",

      title:
        "Perpetual funding payments observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO observed ${derived.hyperCore.fundingPaymentCount} bounded HyperCore funding-payment record(s).`,

      caveat:
        "HyperCore perpetual funding payments are trading economics. They are NOT wallet-funding provenance and are never treated as evidence of who funded the wallet.",
    });
  }

  if (
    derived
      .hyperCore
      .ledgerEventCount >
    0
  ) {
    findings.push({
      id:
        "hyperliquid-non-funding-ledger",

      category:
        "funding",

      title:
        "HyperCore non-funding ledger activity observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO observed ${derived.hyperCore.ledgerEventCount} bounded non-funding ledger event(s), including ${derived.hyperCore.depositCount} deposit-like, ${derived.hyperCore.withdrawalCount} withdrawal-like and ${derived.hyperCore.transferCount} transfer-like event(s).`,

      caveat:
        "These records describe observed HyperCore ledger movements. They do not establish ultimate wallet-funding provenance, ownership, identity or control.",
    });
  }

  if (
    derived
      .hyperCore
      .counterparties
      .count >
    0
  ) {
    findings.push({
      id:
        "hyperliquid-ledger-counterparties",

      category:
        "relationship",

      title:
        "Explicit ledger counterparties observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO observed ${derived.hyperCore.counterparties.count} explicit address counterpart${derived.hyperCore.counterparties.count === 1 ? "y" : "ies"} in bounded non-funding ledger evidence.`,

      caveat:
        "Only explicit address fields returned by HyperCore are treated as counterparties. AYZO does not infer common ownership or control.",
    });
  }

  return {
    status:
      200,

    data: {
      ok:
        true,

      network:
        "hyperliquid",

      address:
        normalized,

      analysisPlan,

      coverage:
        (
          data
            .hyperCore
            .fills
            .length >
            0 ||
          data
            .hyperCore
            .positions
            .length >
            0
        )
          ? "partial"
          : "limited",

      executionSurfaces: {
        hyperCore: {
          accountValue:
            data
              .hyperCore
              .accountValue,

          withdrawable:
            data
              .hyperCore
              .withdrawable,

          totalNotionalPosition:
            data
              .hyperCore
              .totalNotionalPosition,

          totalMarginUsed:
            data
              .hyperCore
              .totalMarginUsed,

          role:
            data
              .hyperCore
              .role,

          positions:
            data
              .hyperCore
              .positions,

          spotBalances:
            data
              .hyperCore
              .spotBalances,

          fills:
            data
              .hyperCore
              .fills,

          fundingPayments:
            data
              .hyperCore
              .fundingPayments,

          portfolio:
            data
              .hyperCore
              .portfolio,

          nonFundingLedger:
            data
              .hyperCore
              .nonFundingLedger,
        },

        hyperEvm:
          data.hyperEvm,
      },

      derived,

      evidenceCoverage:
        data.coverage,

      modules: {
        hyperCoreState: {
          status:
            "complete",

          error:
            null,
        },

        positions: {
          status:
            "complete",

          error:
            null,
        },

        tradingActivity: {
          status:
            data
              .hyperCore
              .fills
              .length >
              0
              ? "limited"
              : "unavailable",

          error:
            data
              .hyperCore
              .fills
              .length >
              0
              ? `Recent fills are bounded to ${data.coverage.fillLimit} records.`
              : "No recent fill evidence was returned.",
        },

        fundingPayments: {
          status:
            data
              .hyperCore
              .fundingPayments
              .length >
              0
              ? "limited"
              : "unavailable",

          error:
            data
              .hyperCore
              .fundingPayments
              .length >
              0
              ? `Funding payments are bounded to ${data.coverage.fundingLimit} records across a ${data.coverage.fundingLookbackDays}-day lookback. These are trading funding-rate payments, not wallet funding provenance.`
              : "No bounded perpetual funding-payment evidence was returned.",
        },

        portfolio: {
          status:
            data
              .hyperCore
              .portfolio
              .length >
              0
              ? "limited"
              : "unavailable",

          error:
            "Portfolio history is provider-supplied HyperCore account performance evidence and remains bounded.",
        },

        nonFundingLedger: {
          status:
            data
              .hyperCore
              .nonFundingLedger
              .length >
              0
              ? "limited"
              : "unavailable",

          error:
            data
              .hyperCore
              .nonFundingLedger
              .length >
              0
              ? `Non-funding ledger evidence is bounded to ${data.coverage.ledgerLimit} records across a ${data.coverage.ledgerLookbackDays}-day lookback.`
              : "No bounded non-funding ledger evidence was returned.",
        },

        counterparties: {
          status:
            derived
              .hyperCore
              .counterparties
              .count >
              0
              ? "limited"
              : "unavailable",

          error:
            derived
              .hyperCore
              .counterparties
              .count >
              0
              ? null
              : "No explicit address counterparties were present in the bounded HyperCore ledger evidence.",
        },

        hyperEvmState: {
          status:
            "complete",

          error:
            null,
        },
      },

      findings,

      caveats: [
        "HyperCore and HyperEVM are separate execution surfaces and AYZO does not collapse their evidence into one generic EVM history.",
        "HyperCore fills are exchange execution evidence, not peer-to-peer counterparty or ownership evidence.",
        "HyperCore funding payments are perpetual funding-rate settlements and must not be interpreted as wallet funding provenance.",
        "HyperCore non-funding ledger updates may contain deposits, withdrawals and transfers. AYZO treats them as observed ledger movement, not proof of ultimate funding origin.",
        "The official HyperEVM JSON-RPC provides latest EVM state; AYZO does not invent indexed HyperEVM address transaction history from that RPC.",
        "A Hyperliquid address has the same 20-byte hexadecimal shape as an EVM address, so automatic detection remains EVM unless Hyperliquid is explicitly selected.",
        "AYZO makes no common-ownership, identity, intent or control inference from Hyperliquid activity.",
      ],
    },
  };
}
