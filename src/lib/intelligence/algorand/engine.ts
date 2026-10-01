import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  buildAlgorandDerivedAnalysis,
  type AlgorandDerivedAnalysis,
} from "./analysis";

import {
  normalizeAlgorandAddress,
} from "./address";

import {
  getAlgorandNodelyEvidence,
} from "./provider";

import {
  getAlgorandAnalysisPolicy,
} from "./policy";

import type {
  AlgorandEvidence,
  AlgorandProviderResult,
} from "./types";

type ModuleState = {
  status:
    "complete" |
    "limited" |
    "unavailable";

  error:
    string | null;
};

export type AlgorandIntelligence = {
  ok:
    true;

  network:
    "algorand";

  address:
    string;

  analysisPlan:
    AnalysisDepthPlan;

  coverage:
    "partial" |
    "limited";

  account: {
    amountMicroAlgos:
      string | null;

    minBalanceMicroAlgos:
      string | null;

    authAddress:
      string | null;
  };

  assets:
    AlgorandEvidence[
      "assets"
    ];

  createdAssets:
    AlgorandEvidence[
      "createdAssets"
    ];

  appLocalStates:
    AlgorandEvidence[
      "appLocalStates"
    ];

  createdApplications:
    AlgorandEvidence[
      "createdApplications"
    ];

  transactions:
    AlgorandEvidence[
      "transactions"
    ];

  derived:
    AlgorandDerivedAnalysis;

  evidenceCoverage:
    AlgorandEvidence[
      "coverage"
    ];

  modules: {
    accountState:
      ModuleState;

    transactionHistory:
      ModuleState;

    assets:
      ModuleState;

    assetAuthority:
      ModuleState;

    applications:
      ModuleState;

    rekey:
      ModuleState;

    innerTransactions:
      ModuleState;

    flow:
      ModuleState;

    counterparties:
      ModuleState;

    funding:
      ModuleState;

    timeline:
      ModuleState;

    graph:
      ModuleState;
  };

  findings:
    readonly IntelligenceFinding[];

  caveats:
    readonly string[];
};

type AlgorandFailure = {
  ok:
    false;

  network:
    "algorand";

  code:
    | "INVALID_ADDRESS"
    | "NOT_FOUND"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR";

  error:
    string;
};

export type AlgorandEngineDependencies = {
  loadEvidence(
    input: {
      address:
        string;

      analysisPlan:
        AnalysisDepthPlan;
    }
  ): Promise<
    AlgorandProviderResult<
      AlgorandEvidence
    >
  >;
};

const DEFAULT_DEPENDENCIES:
  AlgorandEngineDependencies = {
    loadEvidence:
      getAlgorandNodelyEvidence,
  };

export async function runAlgorandIntelligence(
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
    AlgorandEngineDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  IntelligenceEngineResult<
    AlgorandIntelligence |
    AlgorandFailure
  >
> {
  const normalized =
    normalizeAlgorandAddress(
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
          "algorand",

        code:
          "INVALID_ADDRESS",

        error:
          "Invalid Algorand account address.",
      },
    };
  }

  const evidenceResult =
    await deps.loadEvidence({
      address:
        normalized,

      analysisPlan,
    });

  if (
    !evidenceResult.ok
  ) {
    return {
      status:
        evidenceResult.code ===
          "INVALID_ADDRESS"
          ? 400
          : evidenceResult.code ===
              "NOT_FOUND"
            ? 404
            : evidenceResult.code ===
                "RATE_LIMITED"
              ? 429
              : 502,

      data: {
        ok:
          false,

        network:
          "algorand",

        code:
          evidenceResult.code ===
            "INVALID_ADDRESS"
            ? "INVALID_ADDRESS"
            : evidenceResult.code ===
                "NOT_FOUND"
              ? "NOT_FOUND"
              : evidenceResult.code ===
                  "RATE_LIMITED"
                ? "RATE_LIMITED"
                : "UPSTREAM_ERROR",

        error:
          evidenceResult.error,
      },
    };
  }

  const evidence =
    evidenceResult.data;

  const policy =
    getAlgorandAnalysisPolicy(
      analysisPlan
    );

  const derived =
    buildAlgorandDerivedAnalysis({
      address:
        normalized,

      evidence,

      policy,
    });

  const findings:
    IntelligenceFinding[] =
      [
        {
          id:
            "algorand-bounded-native-evidence",

          category:
            "coverage",

          title:
            "Bounded Algorand native evidence collected",

          severity:
            "informational",

          confidence:
            "high",

          summary:
            `AYZO observed ${evidence.transactions.length} account transaction(s), ${evidence.assets.length} ASA holding(s), ${evidence.createdAssets.length} created ASA record(s), and ${evidence.createdApplications.length} created application record(s).`,

          caveat:
            "Algorand evidence is plan-bounded and does not claim exhaustive lifetime activity.",
        },
      ];

  if (
    derived
      .observedFunding
  ) {
    findings.push({
      id:
        "algorand-observed-funding",

      category:
        "funding",

      title:
        "Observed Algorand funding evidence",

      severity:
        "informational",

      confidence:
        "medium",

      summary:
        "AYZO observed an explicit inbound ALGO payment inside the bounded account history window.",

      caveat:
        "This is observed direct funding evidence and is not proof of the original or ultimate funding source.",
    });
  }

  if (
    evidence.authAddress ||
    derived
      .authority
      .observedRekeys
      .length >
      0
  ) {
    findings.push({
      id:
        "algorand-rekey-authority",

      category:
        "relationship",

      title:
        "Algorand authorization evidence observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        "AYZO observed explicit Algorand rekey or current authorization-address evidence.",

      caveat:
        "Rekey and auth-address evidence describes signing authority and does not establish beneficial ownership or real-world identity.",
    });
  }

  const historyLimited =
    evidence
      .coverage
      .historyHasMore;

  const assetLimited =
    evidence
      .coverage
      .assetsHaveMore;

  const appLimited =
    evidence
      .coverage
      .appLocalStateHasMore ||
    evidence
      .coverage
      .createdAppsHaveMore;

  const unavailable =
    new Set(
      evidence
        .coverage
        .unavailableEvidence
    );

  return {
    status:
      200,

    data: {
      ok:
        true,

      network:
        "algorand",

      address:
        normalized,

      analysisPlan,

      coverage:
        evidence
          .coverage
          .coverage ===
          "complete"
          ? "partial"
          : "limited",

      account: {
        amountMicroAlgos:
          evidence
            .amountMicroAlgos,

        minBalanceMicroAlgos:
          evidence
            .minBalanceMicroAlgos,

        authAddress:
          evidence
            .authAddress,
      },

      assets:
        evidence.assets,

      createdAssets:
        evidence
          .createdAssets,

      appLocalStates:
        evidence
          .appLocalStates,

      createdApplications:
        evidence
          .createdApplications,

      transactions:
        evidence
          .transactions,

      derived,

      evidenceCoverage:
        evidence
          .coverage,

      modules: {
        accountState: {
          status:
            "complete",

          error:
            null,
        },

        transactionHistory: {
          status:
            unavailable.has(
              "transaction_history"
            )
              ? "unavailable"
              : historyLimited
                ? "limited"
                : "complete",

          error:
            unavailable.has(
              "transaction_history"
            )
              ? "Algorand transaction history provider evidence was unavailable."
              : historyLimited
                ? "Additional Algorand transaction history exists outside the selected plan window."
                : null,
        },

        assets: {
          status:
            unavailable.has(
              "asset_holdings"
            )
              ? "unavailable"
              : assetLimited
                ? "limited"
                : "complete",

          error:
            unavailable.has(
              "asset_holdings"
            )
              ? "Algorand ASA holding evidence was unavailable."
              : null,
        },

        assetAuthority: {
          status:
            unavailable.has(
              "created_assets"
            )
              ? "unavailable"
              : evidence
                  .coverage
                  .createdAssetsHaveMore
                ? "limited"
                : "complete",

          error:
            unavailable.has(
              "created_assets"
            )
              ? "Algorand created-asset authority evidence was unavailable."
              : null,
        },

        applications: {
          status:
            unavailable.has(
              "application_local_state"
            ) &&
            unavailable.has(
              "created_applications"
            )
              ? "unavailable"
              : appLimited
                ? "limited"
                : "complete",

          error:
            null,
        },

        rekey: {
          status:
            unavailable.has(
              "transaction_history"
            )
              ? "unavailable"
              : historyLimited
                ? "limited"
                : "complete",

          error:
            null,
        },

        innerTransactions: {
          status:
            unavailable.has(
              "transaction_history"
            )
              ? "unavailable"
              : historyLimited
                ? "limited"
                : "complete",

          error:
            null,
        },

        flow: {
          status:
            unavailable.has(
              "transaction_history"
            )
              ? "unavailable"
              : "limited",

          error:
            "Flow is derived only from explicit payment and ASA transfer evidence inside the bounded transaction window.",
        },

        counterparties: {
          status:
            unavailable.has(
              "transaction_history"
            )
              ? "unavailable"
              : "limited",

          error:
            "Counterparties are derived only from explicit sender, receiver and close-address evidence.",
        },

        funding: {
          status:
            derived
              .observedFunding
              ? "limited"
              : unavailable.has(
                  "transaction_history"
                )
                ? "unavailable"
                : "limited",

          error:
            derived
              .observedFunding
              ? "Funding is bounded to explicit inbound ALGO payment evidence."
              : "No explicit inbound ALGO funding source was observed inside the bounded transaction window.",
        },

        timeline: {
          status:
            derived
              .timeline
              .events
              .length >
              0
              ? "limited"
              : "unavailable",

          error:
            derived
              .timeline
              .events
              .length >
              0
              ? "Timeline is bounded by the selected plan."
              : "No transaction timeline evidence was available.",
        },

        graph: {
          status:
            derived
              .graph
              .edges
              .length >
              0
              ? "limited"
              : "unavailable",

          error:
            derived
              .graph
              .edges
              .length >
              0
              ? "Graph includes only explicit bounded transfer relationships."
              : "No explicit relationship edges were observed.",
        },
      },

      findings,

      caveats: [
        "AYZO reports observed Algorand on-chain evidence and does not establish ownership, identity, intent, criminality, or common control.",
        "Algorand rekey and auth-address evidence represents signing authority, not beneficial ownership.",
        "ASA manager, reserve, freeze and clawback addresses are explicit protocol control fields and do not establish real-world identity.",
        "ASA holdings do not imply creator or controller status.",
        "Application calls and arguments are not converted into inferred user intent.",
        "Inner transactions are preserved as explicit application execution evidence.",
        "Observed funding is bounded direct inbound ALGO evidence and is not proof of ultimate provenance.",
        "Nodely backup endpoints provide transport resilience but are not represented as an independent evidence provider.",
      ],
    },
  };
}
