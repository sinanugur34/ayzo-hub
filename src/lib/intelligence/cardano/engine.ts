import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  buildCardanoDerivedAnalysis,
  type CardanoDerivedAnalysis,
} from "./analysis";

import {
  isCardanoPaymentAddress,
} from "./address";

import {
  getCardanoEvidence,
} from "./provider";

import type {
  CardanoEvidence,
  CardanoProviderResult,
} from "./types";

export type CardanoIntelligence = {
  ok:
    true;

  network:
    "cardano";

  address:
    string;

  analysisPlan:
    AnalysisDepthPlan;

  coverage:
    "partial" |
    "limited";

  account:
    CardanoEvidence[
      "addressState"
    ];

  history: {
    transactions:
      CardanoEvidence[
        "recentTransactions"
      ];

    earliestTransactions:
      CardanoEvidence[
        "earliestTransactions"
      ];
  };

  utxos:
    CardanoEvidence[
      "utxos"
    ];

  canonicalTransactions:
    CardanoEvidence[
      "canonicalTransactions"
    ];

  stake:
    CardanoEvidence[
      "stake"
    ];

  derived:
    CardanoDerivedAnalysis;

  evidenceCoverage:
    CardanoEvidence[
      "coverage"
    ];

  modules: {
    accountState:
      ModuleState;

    history:
      ModuleState;

    canonicalEvidence:
      ModuleState;

    utxos:
      ModuleState;

    assets:
      ModuleState;

    staking:
      ModuleState;

    flow:
      ModuleState;

    counterparties:
      ModuleState;

    funding:
      ModuleState;
  };

  findings:
    readonly IntelligenceFinding[];

  caveats:
    readonly string[];
};

type ModuleState = {
  status:
    "complete" |
    "limited" |
    "unavailable";

  error:
    string | null;
};

type CardanoFailure = {
  ok:
    false;

  network:
    "cardano";

  code:
    | "INVALID_ADDRESS"
    | "NOT_FOUND"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR";

  error:
    string;
};

export type CardanoEngineDependencies = {
  loadEvidence(
    input: {
      address:
        string;

      analysisPlan:
        AnalysisDepthPlan;
    }
  ): Promise<
    CardanoProviderResult<
      CardanoEvidence
    >
  >;
};

const DEFAULT_DEPENDENCIES:
  CardanoEngineDependencies = {
    loadEvidence:
      getCardanoEvidence,
  };

export async function runCardanoIntelligence(
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
    CardanoEngineDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  IntelligenceEngineResult<
    CardanoIntelligence |
    CardanoFailure
  >
> {
  const normalized =
    address
      .trim()
      .toLowerCase();

  if (
    !isCardanoPaymentAddress(
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
          "cardano",
        code:
          "INVALID_ADDRESS",
        error:
          "Invalid Cardano mainnet payment address.",
      },
    };
  }

  const result =
    await deps.loadEvidence({
      address:
        normalized,
      analysisPlan,
    });

  if (!result.ok) {
    return {
      status:
        result.code ===
          "INVALID_ADDRESS"
          ? 400
          : result.code ===
              "NOT_FOUND"
            ? 404
            : result.code ===
                "RATE_LIMITED"
              ? 429
              : 502,
      data: {
        ok:
          false,
        network:
          "cardano",
        code:
          result.code ===
            "INVALID_ADDRESS"
            ? "INVALID_ADDRESS"
            : result.code ===
                "NOT_FOUND"
              ? "NOT_FOUND"
              : result.code ===
                  "RATE_LIMITED"
                ? "RATE_LIMITED"
                : "UPSTREAM_ERROR",
        error:
          result.error,
      },
    };
  }

  const evidence =
    result.data;

  const derived =
    buildCardanoDerivedAnalysis({
      address:
        normalized,
      evidence,
    });

  const findings:
    IntelligenceFinding[] =
      [];

  findings.push({
    id:
      "cardano-bounded-evidence",
    category:
      "coverage",
    title:
      "Bounded Cardano mainnet evidence collected",
    severity:
      "informational",
    confidence:
      "high",
    summary:
      `AYZO observed ${evidence.recentTransactions.length} transaction reference(s), ${evidence.utxos.length} UTXO(s), ${evidence.addressState.assets.length} native asset(s), and ${evidence.canonicalTransactions.length} canonical transaction sample(s).`,
    caveat:
      "Cardano evidence is plan-bounded and is not exhaustive lifetime history.",
  });

  if (
    derived
      .observedFunding
  ) {
    findings.push({
      id:
        "cardano-observed-funding",
      category:
        "funding",
      title:
        "Observed inbound Cardano funding source",
      severity:
        "informational",
      confidence:
        "medium",
      summary:
        "AYZO observed one explicit inbound source inside the bounded canonical transaction sample.",
      caveat:
        "Observed funding is not proof of the original or ultimate source of funds and does not establish ownership.",
    });
  }

  const canonicalRequested =
    evidence
      .coverage
      .canonicalRequested;

  const canonicalVerified =
    evidence
      .coverage
      .canonicalVerified;

  const coverage =
    canonicalRequested >
      0 &&
    canonicalVerified ===
      canonicalRequested
      ? "partial" as const
      : "limited" as const;

  return {
    status:
      200,
    data: {
      ok:
        true,
      network:
        "cardano",
      address:
        normalized,
      analysisPlan,
      coverage,
      account:
        evidence.addressState,
      history: {
        transactions:
          evidence
            .recentTransactions,
        earliestTransactions:
          evidence
            .earliestTransactions,
      },
      utxos:
        evidence.utxos,
      canonicalTransactions:
        evidence
          .canonicalTransactions,
      stake:
        evidence.stake,
      derived,
      evidenceCoverage:
        evidence.coverage,
      modules: {
        accountState: {
          status:
            "complete",
          error:
            null,
        },
        history: {
          status:
            evidence
              .recentTransactions
              .length >
              0
              ? "limited"
              : "unavailable",
          error:
            null,
        },
        canonicalEvidence: {
          status:
            canonicalVerified ===
              canonicalRequested &&
            canonicalRequested >
              0
              ? "complete"
              : canonicalVerified >
                  0
                ? "limited"
                : "unavailable",
          error:
            null,
        },
        utxos: {
          status:
            "limited",
          error:
            null,
        },
        assets: {
          status:
            "limited",
          error:
            null,
        },
        staking: {
          status:
            evidence.stake
              ? "limited"
              : "unavailable",
          error:
            null,
        },
        flow: {
          status:
            canonicalVerified >
              0
              ? "limited"
              : "unavailable",
          error:
            null,
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
            null,
        },
        funding: {
          status:
            derived
              .observedFunding
              ? "limited"
              : "unavailable",
          error:
            null,
        },
      },
      findings,
      caveats: [
        "AYZO reports observed Cardano on-chain evidence and does not establish ownership, identity, intent, or control.",
        "Cardano transaction and UTXO evidence is intentionally bounded according to the current analysis plan.",
        "AYZO does not infer Cardano change ownership.",
        "Observed funding means an explicit inbound source inside the bounded canonical evidence window; it is not proof of ultimate provenance.",
        "Delegation and stake relationships do not imply wallet ownership.",
      ],
    },
  };
}
