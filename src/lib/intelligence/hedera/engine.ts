import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  buildHederaDerivedAnalysis,
  type HederaDerivedAnalysis,
} from "./analysis";

import {
  normalizeHederaAccountId,
} from "./address";

import {
  getHederaMirrorEvidence,
} from "./provider";

import {
  getHederaSpecialistEvidence,
  type HederaSpecialistEvidence,
} from "./providers/specialist";

import type {
  HederaMirrorEvidence,
  HederaProviderResult,
} from "./types";

type ModuleState = {
  status:
    "complete" |
    "limited" |
    "unavailable";

  error:
    string | null;
};

export type HederaIntelligence = {
  ok:
    true;

  network:
    "hedera";

  address:
    string;

  analysisPlan:
    AnalysisDepthPlan;

  coverage:
    "partial" |
    "limited";

  account:
    HederaMirrorEvidence[
      "account"
    ];

  transactions:
    HederaMirrorEvidence[
      "transactions"
    ];

  tokenRelationships:
    HederaMirrorEvidence[
      "tokenRelationships"
    ];

  nfts:
    HederaMirrorEvidence[
      "nfts"
    ];

  specialist:
    HederaSpecialistEvidence | null;

  derived:
    HederaDerivedAnalysis;

  evidenceCoverage: {
    mirror:
      HederaMirrorEvidence[
        "coverage"
      ];

    specialist:
      HederaSpecialistEvidence[
        "coverage"
      ] | null;
  };

  modules: {
    accountState:
      ModuleState;

    transactionHistory:
      ModuleState;

    hbarFlow:
      ModuleState;

    tokenRelationships:
      ModuleState;

    nftEvidence:
      ModuleState;

    tokenControls:
      ModuleState;

    staking:
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

type HederaFailure = {
  ok:
    false;

  network:
    "hedera";

  code:
    | "INVALID_ADDRESS"
    | "NOT_FOUND"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR";

  error:
    string;
};

export type HederaEngineDependencies = {
  loadEvidence(
    input: {
      accountId:
        string;

      analysisPlan:
        AnalysisDepthPlan;
    }
  ): Promise<
    HederaProviderResult<
      HederaMirrorEvidence
    >
  >;

  loadSpecialist?(
    input: {
      accountId:
        string;

      tokenIds:
        readonly string[];

      analysisPlan:
        AnalysisDepthPlan;
    }
  ): Promise<
    HederaProviderResult<
      HederaSpecialistEvidence
    >
  >;
};

const DEFAULT_DEPS:
  HederaEngineDependencies = {
    loadEvidence:
      getHederaMirrorEvidence,

    loadSpecialist:
      getHederaSpecialistEvidence,
  };

export async function runHederaIntelligence(
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
    HederaEngineDependencies =
      DEFAULT_DEPS
): Promise<
  IntelligenceEngineResult<
    HederaIntelligence |
    HederaFailure
  >
> {
  const normalized =
    normalizeHederaAccountId(
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
          "hedera",

        code:
          "INVALID_ADDRESS",

        error:
          "Invalid Hedera account ID.",
      },
    };
  }

  const result =
    await deps.loadEvidence({
      accountId:
        normalized,

      analysisPlan,
    });

  if (!result.ok) {
    return {
      status:
        result.code ===
          "INVALID_ACCOUNT"
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
          "hedera",

        code:
          result.code ===
            "INVALID_ACCOUNT"
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

  const tokenIds =
    result.data
      .tokenRelationships
      .map(
        token =>
          token.tokenId
      );

  const specialistResult =
    deps.loadSpecialist
      ? await deps.loadSpecialist({
          accountId:
            normalized,

          tokenIds,

          analysisPlan,
        })
      : null;

  const specialist =
    specialistResult?.ok
      ? specialistResult.data
      : null;

  const derived =
    buildHederaDerivedAnalysis({
      accountId:
        normalized,

      evidence:
        result.data,

      specialist,
    });

  const findings:
    IntelligenceFinding[] =
      [
        {
          id:
            "hedera-bounded-evidence",
          category:
            "coverage",
          title:
            "Bounded Hedera evidence collected",
          severity:
            "informational",
          confidence:
            "high",
          summary:
            `AYZO observed ${result.data.transactions.length} transaction(s), ${result.data.tokenRelationships.length} token relationship(s) and ${result.data.nfts.length} NFT holding record(s).`,
          caveat:
            "Mirror Node evidence is bounded and is not exhaustive lifetime history.",
        },
      ];

  if (
    derived
      .observedFunding
  ) {
    findings.push({
      id:
        "hedera-observed-funding",
      category:
        "funding",
      title:
        "Observed inbound HBAR source",
      severity:
        "informational",
      confidence:
        "medium",
      summary:
        "AYZO observed an explicit negative counter-transfer funding the analyzed account inside the bounded transaction window.",
      caveat:
        "This does not establish ultimate provenance, identity or ownership.",
    });
  }

  return {
    status:
      200,

    data: {
      ok:
        true,

      network:
        "hedera",

      address:
        normalized,

      analysisPlan,

      coverage:
        specialist
          ? "partial"
          : "limited",

      account:
        result.data
          .account,

      transactions:
        result.data
          .transactions,

      tokenRelationships:
        result.data
          .tokenRelationships,

      nfts:
        result.data.nfts,

      specialist,

      derived,

      evidenceCoverage: {
        mirror:
          result.data
            .coverage,

        specialist:
          specialist
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

        transactionHistory: {
          status:
            result.data
              .transactions
              .length >
              0
              ? "limited"
              : "unavailable",
          error:
            null,
        },

        hbarFlow: {
          status:
            derived.flow
              .transfers
              .length >
              0
              ? "limited"
              : "unavailable",
          error:
            null,
        },

        tokenRelationships: {
          status:
            result.data
              .tokenRelationships
              .length >
              0
              ? "limited"
              : "unavailable",
          error:
            null,
        },

        nftEvidence: {
          status:
            result.data
              .nfts
              .length >
              0
              ? "limited"
              : "unavailable",
          error:
            null,
        },

        tokenControls: {
          status:
            specialist
              ?.tokenMetadata
              .length
              ? "limited"
              : "unavailable",

          error:
            specialistResult &&
            !specialistResult.ok
              ? specialistResult
                  .error
              : null,
        },

        staking: {
          status:
            result.data
                .account
                .stakedNodeId ||
            result.data
                .account
                .stakedAccountId ||
            specialist
              ?.stakingRewards
              .length
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
        "AYZO reports observed Hedera evidence and does not establish ownership, identity, intent or common control.",
        "HBAR transfer relationships are derived only from explicit Mirror Node transfer entries.",
        "Hedera token control keys are authority evidence and are not proof of beneficial ownership.",
        "NFT ownership/transfer records do not establish off-chain identity.",
        "Staking relationships do not imply account ownership.",
        "Observed funding is bounded direct inbound evidence and is not proof of ultimate provenance.",
      ],
    },
  };
}
