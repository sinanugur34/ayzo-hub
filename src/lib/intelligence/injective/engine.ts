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
  normalizeInjectiveAddress,
} from "./address";

import {
  getInjectiveEvidence,
} from "./provider";

export type InjectiveIntelligence = {
  ok:
    true;

  network:
    "injective";

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
    "injective";

  code:
    | "INVALID_ADDRESS"
    | "NOT_FOUND"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR";

  error:
    string;
};

export async function runInjectiveIntelligence(
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
    InjectiveIntelligence |
    Failure
  >
> {
  const normalized =
    normalizeInjectiveAddress(
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
          "injective",

        code:
          "INVALID_ADDRESS",

        error:
          "Invalid Injective mainnet account address.",
      },
    };
  }

  const result =
    await (
      deps.loadEvidence ??
      getInjectiveEvidence
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
          "injective",

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
        "inj",
    });

  const findings:
    IntelligenceFinding[] = [
      {
        id:
          "injective-native-evidence",

        category:
          "coverage",

        title:
          "Injective native evidence collected",

        severity:
          "informational",

        confidence:
          "high",

        summary:
          `AYZO observed ${evidence.transactions.length} bounded native transaction(s), ${evidence.balances.length} balance denomination(s), and ${evidence.delegations.length} delegation(s).`,

        caveat:
          "Injective remains native Cosmos-module evidence and is not flattened into generic EVM semantics.",
      },
    ];

  if (
    derived.modules
      .exchangeMessageCount >
      0 ||
    derived.modules
      .wasmMessageCount >
      0 ||
    derived.modules
      .tokenFactoryMessageCount >
      0
  ) {
    findings.push({
      id:
        "injective-native-modules",

      category:
        "activity",

      title:
        "Injective module activity observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        "Explicit exchange, CosmWasm, or token-factory message types were observed in the bounded native transaction window.",

      caveat:
        "Module activity describes explicit protocol calls and does not establish intent, identity, ownership, or financial outcome.",
    });
  }

  return {
    status:
      200,

    data: {
      ok:
        true,

      network:
        "injective",

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
        "Injective native Cosmos messages remain distinct from EVM-compatible activity.",
        "Exchange or module calls are explicit activity evidence, not proof of trade intent or profitability.",
        "Token-factory authority or contract interaction does not establish beneficial ownership or real-world identity.",
        "Delegation does not establish ownership or control of a validator.",
        "Observed funding is bounded direct evidence and not proof of ultimate origin.",
      ],
    },
  };
}
