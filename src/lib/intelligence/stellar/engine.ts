import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  buildStellarDerivedAnalysis,
  type StellarDerivedAnalysis,
} from "./analysis";

import {
  isStellarAccountAddress,
} from "./address";

import {
  getStellarEvidence,
} from "./provider";

import type {
  StellarEvidence,
  StellarProviderResult,
} from "./types";

export type StellarIntelligence = {
  ok:
    true;

  network:
    "stellar";

  address:
    string;

  analysisPlan:
    AnalysisDepthPlan;

  coverage:
    "partial" |
    "limited";

  account:
    StellarEvidence[
      "account"
    ];

  history: {
    transactions:
      StellarEvidence[
        "transactions"
      ];

    payments:
      StellarEvidence[
        "payments"
      ];

    operations:
      StellarEvidence[
        "operations"
      ];
  };

  market: {
    offers:
      StellarEvidence[
        "offers"
      ];

    trades:
      StellarEvidence[
        "trades"
      ];
  };

  derived:
    StellarDerivedAnalysis;

  evidenceCoverage:
    StellarEvidence[
      "coverage"
    ];

  modules: {
    accountState: {
      status:
        "complete";

      error:
        null;
    };

    assets: {
      status:
        "complete" |
        "limited";

      error:
        string | null;
    };

    transactionHistory: {
      status:
        "limited" |
        "unavailable";

      error:
        string | null;
    };

    payments: {
      status:
        "limited" |
        "unavailable";

      error:
        string | null;
    };

    relationships: {
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

    marketActivity: {
      status:
        "limited" |
        "unavailable";

      error:
        string | null;
    };
  };

  findings:
    readonly IntelligenceFinding[];

  caveats:
    readonly string[];
};

type StellarFailure = {
  ok:
    false;

  network:
    "stellar";

  code:
    | "INVALID_ADDRESS"
    | "NOT_FOUND"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR";

  error:
    string;
};

export type StellarEngineDependencies = {
  loadEvidence(
    input: {
      address:
        string;

      analysisPlan:
        AnalysisDepthPlan;
    }
  ): Promise<
    StellarProviderResult
  >;
};

const DEFAULT_DEPENDENCIES:
  StellarEngineDependencies = {
    loadEvidence:
      getStellarEvidence,
  };

export async function runStellarIntelligence(
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
    StellarEngineDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  IntelligenceEngineResult<
    StellarIntelligence |
    StellarFailure
  >
> {
  const normalized =
    address
      .trim()
      .toUpperCase();

  if (
    !isStellarAccountAddress(
      normalized
    )
  ) {
    return {
      status:
        400,

      data: {
        ok:
          false,

        network:
          "stellar",

        code:
          "INVALID_ADDRESS",

        error:
          "Invalid Stellar account address.",
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
          "NOT_FOUND"
          ? 404
          : evidence.code ===
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
          "stellar",

        code:
          evidence.code ===
            "NOT_FOUND"
            ? "NOT_FOUND"
            : evidence.code ===
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
    buildStellarDerivedAnalysis({
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
      "stellar-account-state",

    category:
      "coverage",

    title:
      "Stellar account state observed",

    severity:
      "informational",

    confidence:
      "high",

    summary:
      `AYZO observed ${data.account.balances.length} balance/trustline record(s), ${data.account.signers.length} signer(s), ${data.transactions.length} transaction(s), and ${data.payments.length} payment-related operation(s) in the bounded evidence window.`,

    caveat:
      "Horizon history is indexed and retention-bounded; this report must not be interpreted as guaranteed exhaustive lifetime history.",
  });

  if (
    derived.trustlines
      .count >
    0
  ) {
    findings.push({
      id:
        "stellar-trustlines",

      category:
        "asset",

      title:
        "Issued-asset trustlines observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `The account has ${derived.trustlines.count} issued-asset balance/trustline record(s) involving ${derived.trustlines.issuerCount} observed issuer account(s).`,

      caveat:
        "A Stellar trustline permits holding an issued asset; it does not prove endorsement, investment intent or issuer trustworthiness.",
    });
  }

  if (
    derived
      .observedFunding
  ) {
    findings.push({
      id:
        "stellar-observed-funding",

      category:
        "funding",

      title:
        "Observed early inbound account funding",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `An early bounded Stellar payment/create-account record identifies ${derived.observedFunding.sourceAddress} as a direct observed source.`,

      caveat:
        "This is direct ledger evidence in the retained Horizon window, not a claim of ultimate source, common ownership or real-world identity.",
    });
  }

  return {
    status:
      200,

    data: {
      ok:
        true,

      network:
        "stellar",

      address:
        normalized,

      analysisPlan,

      coverage:
        (
          data.transactions
            .length >
            0 ||
          data.payments
            .length >
            0
        )
          ? "partial"
          : "limited",

      account:
        data.account,

      history: {
        transactions:
          data.transactions,

        payments:
          data.payments,

        operations:
          data.operations,
      },

      market: {
        offers:
          data.offers,

        trades:
          data.trades,
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

        assets: {
          status:
            "complete",

          error:
            null,
        },

        transactionHistory: {
          status:
            data.transactions
              .length >
              0
              ? "limited"
              : "unavailable",

          error:
            "Horizon transaction evidence is plan-bounded and provider-retention-bounded.",
        },

        payments: {
          status:
            data.payments
              .length >
              0
              ? "limited"
              : "unavailable",

          error:
            "Payment evidence is bounded to the active analysis plan and Horizon retention.",
        },

        relationships: {
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
              ? "Relationships represent direct observed payment/create-account participants only."
              : "No direct bounded payment relationship was observed.",
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
              ? "Funding evidence is the earliest matching direct inbound observation in the bounded retained payment window."
              : "No direct inbound funding observation was resolved.",
        },

        marketActivity: {
          status:
            (
              data.offers
                .length >
                0 ||
              data.trades
                .length >
                0
            )
              ? "limited"
              : "unavailable",

          error:
            "Offers are current account offers; trade history is a bounded Horizon evidence sample.",
        },
      },

      findings,

      caveats: [
        "Stellar account balances include native XLM and issued-asset trustlines; unlike assets are never combined into one value.",
        "Issuer relationships are derived only from explicit asset issuer fields in account trustlines.",
        "Signers and thresholds describe account authorization configuration; AYZO does not infer the real-world identity of signers.",
        "Horizon indexed historical data may be retention-bounded and should not be described as guaranteed exhaustive lifetime history.",
        "Observed funding is direct ledger evidence from the retained bounded window, not proof of ultimate source or common ownership.",
      ],
    },
  };
}
