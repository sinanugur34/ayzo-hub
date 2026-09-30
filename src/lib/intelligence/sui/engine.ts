import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  buildSuiDerivedAnalysis,
  type SuiDerivedAnalysis,
} from "./analysis";

import {
  normalizeSuiAddress,
} from "./address";

import {
  getSuiAnalysisPolicy,
} from "./policy";

import {
  getSuiAccountEvidence,
} from "./provider";

import type {
  SuiAccountEvidence,
  SuiProviderErrorCode,
  SuiProviderResult,
} from "./types";

export type SuiIntelligenceModuleState = {
  status:
    | "complete"
    | "limited"
    | "unavailable";

  error:
    string | null;
};

export type SuiIntelligence = {
  ok:
    true;

  network:
    "sui";

  address:
    string;

  analysisPlan:
    AnalysisDepthPlan;

  coverage:
    | "partial"
    | "limited";

  account: {
    hasObservedState:
      boolean;

    suiBalanceMist:
      string;

    chainIdentifier:
      string | null;
  };

  balances:
    SuiAccountEvidence[
      "balances"
    ];

  ownedObjects:
    SuiAccountEvidence[
      "ownedObjects"
    ];

  subjectObject:
    SuiAccountEvidence[
      "subjectObject"
    ];

  history: {
    transactions:
      SuiAccountEvidence[
        "transactions"
      ];
  };

  derived:
    SuiDerivedAnalysis;

  evidenceCoverage:
    SuiAccountEvidence[
      "coverage"
    ];

  modules: {
    accountState:
      SuiIntelligenceModuleState;

    assetBalances:
      SuiIntelligenceModuleState;

    objectInventory:
      SuiIntelligenceModuleState;

    transactionHistory:
      SuiIntelligenceModuleState;

    flow:
      SuiIntelligenceModuleState;

    counterparties:
      SuiIntelligenceModuleState;

    funding:
      SuiIntelligenceModuleState;

    subjectObject:
      SuiIntelligenceModuleState;
  };

  findings:
    readonly IntelligenceFinding[];

  caveats:
    readonly string[];
};

type SuiFailure = {
  ok:
    false;

  code:
    | "INVALID_ADDRESS"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR";

  error:
    string;

  network:
    "sui";
};

export type SuiEngineDependencies = {
  loadEvidence(
    input: {
      address:
        string;

      analysisPlan:
        AnalysisDepthPlan;
    }
  ): Promise<
    SuiProviderResult<
      SuiAccountEvidence
    >
  >;
};

const DEFAULT_DEPENDENCIES:
  SuiEngineDependencies = {
    loadEvidence:
      getSuiAccountEvidence,
  };

function statusForFailure(
  code:
    SuiProviderErrorCode
) {
  switch (
    code
  ) {
    case "INVALID_ADDRESS":
      return 400;

    case "RATE_LIMITED":
      return 429;

    case "TIMEOUT":
    case "UPSTREAM_ERROR":
      return 502;
  }
}

export async function runSuiIntelligence(
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
    SuiEngineDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  IntelligenceEngineResult<
    SuiIntelligence |
    SuiFailure
  >
> {
  const normalized =
    normalizeSuiAddress(
      address
    );

  if (!normalized) {
    return {
      status:
        400,

      data: {
        ok:
          false,

        code:
          "INVALID_ADDRESS",

        error:
          "Invalid Sui address.",

        network:
          "sui",
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
        statusForFailure(
          evidence.code
        ),

      data: {
        ok:
          false,

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

        network:
          "sui",
      },
    };
  }

  const data =
    evidence.data;

  const derived =
    buildSuiDerivedAnalysis({
      address:
        normalized,

      evidence:
        data,
    });

  const hasObservedState =
    data.transactions.length >
      0 ||
    data.balances.some(
      balance => {
        try {
          return (
            BigInt(
              balance
                .totalBalance
            ) >
            0n
          );
        } catch {
          return false;
        }
      }
    ) ||
    data.ownedObjects.length >
      0 ||
    data.subjectObject
      .exists;

  const findings:
    IntelligenceFinding[] =
      [];

  findings.push({
    id:
      "sui-bounded-evidence",

    category:
      "coverage",

    title:
      "Bounded Sui mainnet evidence collected",

    severity:
      "informational",

    confidence:
      "high",

    summary:
      `AYZO observed ${data.transactions.length} affected transaction(s), ${data.balances.length} coin balance type(s), and ${data.ownedObjects.length} owned object sample(s) at ${analysisPlan} depth.`,

    caveat:
      "Sui transaction, balance and object queries are intentionally bounded and are not exhaustive lifetime history.",
  });

  if (
    data.subjectObject
      .exists
  ) {
    findings.push({
      id:
        "sui-subject-object",

      category:
        "asset",

      title:
        data.subjectObject
          .kind ===
            "package"
          ? "Sui Move package observed"
          : "Sui object observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        data.subjectObject
          .kind ===
            "package"
          ? "The supplied Sui address resolves to an on-chain Move package."
          : `The supplied address resolves to an on-chain Sui object${data.subjectObject.type ? ` of type ${data.subjectObject.type}` : ""}.`,

      caveat:
        "An object or package address is an on-chain identifier; it does not by itself establish real-world ownership or control.",
    });
  }

  if (
    derived.assets
      .positiveBalanceCount >
    0
  ) {
    findings.push({
      id:
        "sui-assets",

      category:
        "asset",

      title:
        "Coin balances observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO observed ${derived.assets.positiveBalanceCount} positive coin balance type(s) in the bounded Sui balance query.`,

      caveat:
        "Balance presence does not establish investment intent, endorsement, beneficial ownership or acquisition method.",
    });
  }

  if (
    derived
      .observedFunding
  ) {
    findings.push({
      id:
        "sui-observed-funding",

      category:
        "funding",

      title:
        "Observed inbound SUI evidence",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `An early transaction in the bounded evidence window shows a positive SUI balance change and was sent by ${derived.observedFunding.observedSender}.`,

      caveat:
        "The transaction sender is observed on-chain evidence, not a claim of ultimate funding origin, ownership or control.",
    });
  }

  const policy =
    getSuiAnalysisPolicy(
      analysisPlan
    );

  return {
    status:
      200,

    data: {
      ok:
        true,

      network:
        "sui",

      address:
        normalized,

      analysisPlan,

      coverage:
        hasObservedState
          ? "partial"
          : "limited",

      account: {
        hasObservedState,

        suiBalanceMist:
          data
            .suiBalanceMist,

        chainIdentifier:
          data
            .chainIdentifier,
      },

      balances:
        data.balances,

      ownedObjects:
        data
          .ownedObjects,

      subjectObject:
        data
          .subjectObject,

      history: {
        transactions:
          data.transactions,
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

        assetBalances: {
          status:
            data.coverage
              .balancesHaveMore
              ? "limited"
              : "complete",

          error:
            data.coverage
              .balancesHaveMore
              ? `Balance evidence is bounded to ${policy.balanceLimit} coin types for the current plan.`
              : null,
        },

        objectInventory: {
          status:
            data.coverage
              .objectsHaveMore
              ? "limited"
              : "complete",

          error:
            data.coverage
              .objectsHaveMore
              ? `Owned-object evidence is bounded to ${policy.objectLimit} objects for the current plan.`
              : null,
        },

        transactionHistory: {
          status:
            data.coverage
              .historyHasMore
              ? "limited"
              : "complete",

          error:
            data.coverage
              .historyHasMore
              ? `Transaction evidence is bounded to ${policy.historyLimit} recent affected transactions for the current plan.`
              : null,
        },

        flow: {
          status:
            data.transactions.length >
              0
              ? "limited"
              : "unavailable",

          error:
            data.transactions.length >
              0
              ? "Flow is derived only from signed Sui balance changes in the bounded transaction window."
              : "No transaction balance-change evidence was observed.",
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
              ? "Relationships are observed transaction-sender and affected-address evidence only."
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
              ? `Funding evidence is bounded to the first ${policy.earliestHistoryLimit} affected transactions returned by the indexed query.`
              : "No bounded inbound SUI funding observation was resolved.",
        },

        subjectObject: {
          status:
            data
              .subjectObject
              .exists
              ? "complete"
              : "limited",

          error:
            data
              .subjectObject
              .exists
              ? null
              : "The supplied address did not resolve to a current object or package; it may represent an account address.",
        },
      },

      findings,

      caveats: [
        "Sui is object-centric. Account addresses, object IDs and package IDs share the same address representation, so AYZO reports the observed role instead of assuming one.",
        "AYZO uses finalized/indexed Sui mainnet evidence and does not infer real-world identity, common ownership, intent or control.",
        "Affected-address transaction history is bounded by the current plan and is not exhaustive lifetime history.",
        "Balance changes are signed per address/object and coin type. AYZO does not aggregate unlike assets into a single monetary value.",
        "Observed transaction senders are evidence participants; they are not automatically the ultimate source of funds.",
      ],
    },
  };
}
