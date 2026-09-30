import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  buildAptosDerivedAnalysis,
  type AptosDerivedAnalysis,
} from "./analysis";

import {
  normalizeAptosAddress,
} from "./address";

import {
  getAptosEvidence,
} from "./provider";

import type {
  AptosEvidence,
  AptosProviderResult,
} from "./types";

type ModuleState = {
  status:
    "complete" |
    "limited" |
    "unavailable";

  error:
    string | null;
};

export type AptosIntelligence = {
  ok:
    true;

  network:
    "aptos";

  address:
    string;

  analysisPlan:
    AnalysisDepthPlan;

  coverage:
    "partial" |
    "limited";

  account:
    AptosEvidence[
      "account"
    ];

  aptBalanceOctas:
    string;

  fungibleAssets:
    AptosEvidence[
      "fungibleAssets"
    ];

  resources:
    AptosEvidence[
      "resources"
    ];

  objects:
    AptosEvidence[
      "objects"
    ];

  history: {
    transactions:
      AptosEvidence[
        "transactions"
      ];

    earliestTransactions:
      AptosEvidence[
        "earliestTransactions"
      ];
  };

  derived:
    AptosDerivedAnalysis;

  evidenceCoverage:
    AptosEvidence[
      "coverage"
    ];

  modules: {
    accountState:
      ModuleState;

    transactionHistory:
      ModuleState;

    moveResources:
      ModuleState;

    fungibleAssets:
      ModuleState;

    objects:
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

type AptosFailure = {
  ok:
    false;

  network:
    "aptos";

  code:
    | "INVALID_ADDRESS"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR";

  error:
    string;
};

export type AptosEngineDependencies = {
  loadEvidence(
    input: {
      address:
        string;

      analysisPlan:
        AnalysisDepthPlan;
    }
  ): Promise<
    AptosProviderResult<
      AptosEvidence
    >
  >;
};

const DEFAULT_DEPENDENCIES:
  AptosEngineDependencies = {
    loadEvidence:
      getAptosEvidence,
  };

export async function runAptosIntelligence(
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
    AptosEngineDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  IntelligenceEngineResult<
    AptosIntelligence |
    AptosFailure
  >
> {
  const normalized =
    normalizeAptosAddress(
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
          "aptos",
        code:
          "INVALID_ADDRESS",
        error:
          "Invalid Aptos address.",
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
              "RATE_LIMITED"
            ? 429
            : 502,
      data: {
        ok:
          false,
        network:
          "aptos",
        code:
          result.code ===
            "INVALID_ADDRESS"
            ? "INVALID_ADDRESS"
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
    buildAptosDerivedAnalysis({
      address:
        normalized,
      evidence,
    });

  const findings:
    IntelligenceFinding[] =
      [];

  findings.push({
    id:
      "aptos-bounded-evidence",
    category:
      "coverage",
    title:
      "Bounded Aptos mainnet evidence collected",
    severity:
      "informational",
    confidence:
      "high",
    summary:
      `AYZO observed ${evidence.transactions.length} account transaction(s) and ${evidence.resources.length} Move resource(s) at ${analysisPlan} depth.`,
    caveat:
      "Fullnode historical data may be pruned and this evidence window is intentionally bounded.",
  });

  return {
    status:
      200,
    data: {
      ok:
        true,
      network:
        "aptos",
      address:
        normalized,
      analysisPlan,
      coverage:
        "limited",
      account:
        evidence.account,
      aptBalanceOctas:
        evidence
          .aptBalanceOctas,
      fungibleAssets:
        evidence
          .fungibleAssets,
      resources:
        evidence.resources,
      objects:
        evidence.objects,
      history: {
        transactions:
          evidence.transactions,
        earliestTransactions:
          evidence
            .earliestTransactions,
      },
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
        transactionHistory: {
          status:
            evidence
              .transactions
              .length >
              0
              ? "limited"
              : "unavailable",
          error:
            null,
        },
        moveResources: {
          status:
            evidence
              .resources
              .length >
              0
              ? "limited"
              : "unavailable",
          error:
            null,
        },
        fungibleAssets: {
          status:
            evidence
              .fungibleAssets
              .length >
              0
              ? "limited"
              : "unavailable",
          error:
            null,
        },
        objects: {
          status:
            evidence
              .objects
              .length >
              0
              ? "limited"
              : "unavailable",
          error:
            null,
        },
        flow: {
          status:
            "unavailable",
          error:
            "APT and fungible-asset transfer derivation requires indexed transfer evidence.",
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
            "unavailable",
          error:
            "Observed Aptos funding requires explicit indexed transfer evidence.",
        },
      },
      findings,
      caveats: [
        "AYZO reports observed Aptos on-chain evidence and does not establish ownership, identity, intent, or control.",
        "Aptos fullnode account history may be pruned.",
        "Move module interaction does not imply ownership of the module or counterparty account.",
        "Fungible assets, objects, transfer flow, and observed funding remain unavailable until indexed evidence is connected.",
      ],
    },
  };
}
