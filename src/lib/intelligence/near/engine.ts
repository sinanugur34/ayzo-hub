import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  buildNearDerivedAnalysis,
  type NearDerivedAnalysis,
} from "./analysis";

import {
  normalizeNearAccountId,
} from "./address";

import {
  getNearRpcEvidence,
} from "./provider";

import {
  getNearIndexedEvidence,
  type NearIndexedEvidence,
} from "./providers/nearblocks";

import type {
  NearProviderResult,
  NearRpcEvidence,
} from "./types";

type ModuleState = {
  status:
    "complete" |
    "limited" |
    "unavailable";

  error:
    string | null;
};

export type NearIntelligence = {
  ok:
    true;

  network:
    "near";

  address:
    string;

  analysisPlan:
    AnalysisDepthPlan;

  coverage:
    "partial" |
    "limited";

  account:
    NearRpcEvidence[
      "account"
    ];

  accessKeys:
    NearRpcEvidence[
      "accessKeys"
    ];

  history: {
    transactions:
      NearIndexedEvidence[
        "transactions"
      ];

    receipts:
      NearIndexedEvidence[
        "receipts"
      ];
  };

  derived:
    NearDerivedAnalysis;

  evidenceCoverage: {
    rpc:
      NearRpcEvidence[
        "coverage"
      ];

    indexed:
      NearIndexedEvidence[
        "coverage"
      ] | null;
  };

  modules: {
    accountState:
      ModuleState;

    accessKeys:
      ModuleState;

    history:
      ModuleState;

    receipts:
      ModuleState;

    contractCalls:
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

type NearFailure = {
  ok:
    false;

  network:
    "near";

  code:
    | "INVALID_ADDRESS"
    | "NOT_FOUND"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR";

  error:
    string;
};

export type NearEngineDependencies = {
  loadRpc(
    input: {
      accountId:
        string;

      analysisPlan:
        AnalysisDepthPlan;
    }
  ): Promise<
    NearProviderResult<
      NearRpcEvidence
    >
  >;

  loadIndexed?(
    input: {
      accountId:
        string;

      analysisPlan:
        AnalysisDepthPlan;
    }
  ): Promise<
    NearProviderResult<
      NearIndexedEvidence
    >
  >;
};

const DEFAULT_DEPENDENCIES:
  NearEngineDependencies = {
    loadRpc:
      getNearRpcEvidence,

    loadIndexed:
      getNearIndexedEvidence,
  };

export async function runNearIntelligence(
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
    NearEngineDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  IntelligenceEngineResult<
    NearIntelligence |
    NearFailure
  >
> {
  const normalized =
    normalizeNearAccountId(
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
          "near",

        code:
          "INVALID_ADDRESS",

        error:
          "Invalid NEAR account ID.",
      },
    };
  }

  const rpc =
    await deps.loadRpc({
      accountId:
        normalized,

      analysisPlan,
    });

  if (!rpc.ok) {
    return {
      status:
        rpc.code ===
          "INVALID_ACCOUNT"
          ? 400
          : rpc.code ===
              "NOT_FOUND"
            ? 404
            : rpc.code ===
                "RATE_LIMITED"
              ? 429
              : 502,

      data: {
        ok:
          false,

        network:
          "near",

        code:
          rpc.code ===
            "INVALID_ACCOUNT"
            ? "INVALID_ADDRESS"
            : rpc.code ===
                "NOT_FOUND"
              ? "NOT_FOUND"
              : rpc.code ===
                  "RATE_LIMITED"
                ? "RATE_LIMITED"
                : "UPSTREAM_ERROR",

        error:
          rpc.error,
      },
    };
  }

  const indexedResult =
    deps.loadIndexed
      ? await deps.loadIndexed({
          accountId:
            normalized,

          analysisPlan,
        })
      : null;

  const indexed =
    indexedResult?.ok
      ? indexedResult.data
      : null;

  const derived =
    buildNearDerivedAnalysis({
      accountId:
        normalized,

      rpc:
        rpc.data,

      indexed,
    });

  const findings:
    IntelligenceFinding[] =
      [
        {
          id:
            "near-native-state",
          category:
            "coverage",
          title:
            "Native NEAR account state collected",
          severity:
            "informational",
          confidence:
            "high",
          summary:
            `AYZO observed ${rpc.data.accessKeys.length} access key(s) and ${indexed?.transactions.length ?? 0} bounded indexed transaction(s).`,
          caveat:
            "Indexed activity is bounded and does not represent exhaustive lifetime history.",
        },
      ];

  if (
    derived
      .observedFunding
  ) {
    findings.push({
      id:
        "near-observed-funding",
      category:
        "funding",
      title:
        "Observed inbound NEAR source",
      severity:
        "informational",
      confidence:
        "medium",
      summary:
        "AYZO observed an explicit inbound account inside the bounded indexed evidence window.",
      caveat:
        "Observed inbound evidence is not proof of the original or ultimate source of funds and does not establish ownership.",
    });
  }

  const indexedAvailable =
    indexed !== null;

  return {
    status:
      200,

    data: {
      ok:
        true,

      network:
        "near",

      address:
        normalized,

      analysisPlan,

      coverage:
        indexedAvailable
          ? "partial"
          : "limited",

      account:
        rpc.data.account,

      accessKeys:
        rpc.data
          .accessKeys,

      history: {
        transactions:
          indexed
            ?.transactions ??
          [],

        receipts:
          indexed
            ?.receipts ??
          [],
      },

      derived,

      evidenceCoverage: {
        rpc:
          rpc.data.coverage,

        indexed:
          indexed
            ?.coverage ??
          null,
      },

      modules: {
        accountState: {
          status:
            "complete",
          error:
            null,
        },

        accessKeys: {
          status:
            rpc.data
              .accessKeys
              .length >
              0
              ? "limited"
              : "unavailable",
          error:
            null,
        },

        history: {
          status:
            indexedAvailable
              ? "limited"
              : "unavailable",

          error:
            indexedResult &&
            !indexedResult.ok
              ? indexedResult
                  .error
              : null,
        },

        receipts: {
          status:
            indexed
              ?.coverage
              .receiptsAvailable
              ? "limited"
              : "unavailable",

          error:
            null,
        },

        contractCalls: {
          status:
            derived
              .specialist
              .functionCallMethods
              .length >
              0
              ? "limited"
              : "unavailable",
          error:
            null,
        },

        flow: {
          status:
            derived
              .flow
              .transfers
              .length >
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
        "AYZO reports observed NEAR chain evidence and does not establish ownership, identity, intent, or common control.",
        "Signed transactions, actions and receipts remain distinct evidence surfaces.",
        "Contract method names are observed evidence; AYZO does not infer method intent.",
        "Access-key permissions are authority evidence and are not proof of beneficial ownership.",
        "NearBlocks indexed history is intentionally bounded.",
        "Observed funding means the earliest explicit inbound source inside the bounded evidence window, not ultimate provenance.",
      ],
    },
  };
}
