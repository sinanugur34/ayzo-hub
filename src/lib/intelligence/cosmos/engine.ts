import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  buildCosmosSdkDerivedAnalysis,
  type CosmosSdkDerivedAnalysis,
  type CosmosSdkEvidence,
  type CosmosSdkProviderResult,
} from "@/lib/intelligence/cosmosSdk";

import {
  normalizeCosmosAddress,
} from "./address";

import {
  getCosmosHubEvidence,
} from "./provider";

export type CosmosIntelligence = {
  ok:
    true;

  network:
    "cosmos";

  address:
    string;

  analysisPlan:
    AnalysisDepthPlan;

  coverage:
    "partial" |
    "limited";

  accountNumber:
    string | null;

  sequence:
    string | null;

  balances:
    CosmosSdkEvidence[
      "balances"
    ];

  delegations:
    CosmosSdkEvidence[
      "delegations"
    ];

  rewards:
    CosmosSdkEvidence[
      "rewards"
    ];

  transactions:
    CosmosSdkEvidence[
      "transactions"
    ];

  derived:
    CosmosSdkDerivedAnalysis;

  evidenceCoverage:
    CosmosSdkEvidence[
      "coverage"
    ];

  findings:
    readonly IntelligenceFinding[];

  caveats:
    readonly string[];
};

type Failure = {
  ok:
    false;

  network:
    "cosmos";

  code:
    | "INVALID_ADDRESS"
    | "NOT_FOUND"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR";

  error:
    string;
};

export async function runCosmosIntelligence(
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
  deps: {
    loadEvidence?:
      (
        input: {
          address:
            string;

          analysisPlan:
            AnalysisDepthPlan;
        }
      ) => Promise<
        CosmosSdkProviderResult
      >;
  } = {}
): Promise<
  IntelligenceEngineResult<
    CosmosIntelligence |
    Failure
  >
> {
  const normalized =
    normalizeCosmosAddress(
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
          "cosmos",

        code:
          "INVALID_ADDRESS",

        error:
          "Invalid Cosmos Hub mainnet account address.",
      },
    };
  }

  const result =
    await (
      deps.loadEvidence ??
      getCosmosHubEvidence
    )({
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
          "cosmos",

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
    buildCosmosSdkDerivedAnalysis({
      evidence,

      nativeDenom:
        "uatom",
    });

  const findings:
    IntelligenceFinding[] = [
      {
        id:
          "cosmos-native-evidence",

        category:
          "coverage",

        title:
          "Cosmos Hub native evidence collected",

        severity:
          "informational",

        confidence:
          "high",

        summary:
          `AYZO observed ${evidence.transactions.length} bounded transaction(s), ${evidence.balances.length} balance denomination(s), and ${evidence.delegations.length} delegation(s).`,

        caveat:
          "Cosmos Hub history and message evidence remains bounded by provider retention and the selected plan.",
      },
    ];

  return {
    status:
      200,

    data: {
      ok:
        true,

      network:
        "cosmos",

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

      accountNumber:
        evidence
          .accountNumber,

      sequence:
        evidence.sequence,

      balances:
        evidence.balances,

      delegations:
        evidence
          .delegations,

      rewards:
        evidence.rewards,

      transactions:
        evidence
          .transactions,

      derived,

      evidenceCoverage:
        evidence.coverage,

      findings,

      caveats: [
        "Delegation to a validator does not establish ownership, employment, control, or identity.",
        "IBC transfer evidence preserves source-channel semantics and does not imply common ownership across chains.",
        "Counterparties are derived only from explicit transaction message participants.",
        "Observed funding is the earliest explicit inbound native transfer inside the bounded evidence window and is not proof of ultimate origin.",
      ],
    },
  };
}
