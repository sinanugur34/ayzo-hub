import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  buildZcashDerivedAnalysis,
  type ZcashDerivedAnalysis,
} from "./analysis";

import {
  getZcashAddressKind,
  isZcashShieldedOrUnifiedAddress,
  normalizeZcashTransparentAddress,
} from "./address";

import {
  getZcashResilientEvidence,
} from "./resilience";

import {
  getZcashAnalysisPolicy,
} from "./policy";

import type {
  ZcashEvidence,
  ZcashProviderResult,
} from "./types";

type ModuleState = {
  status:
    "complete" |
    "limited" |
    "unavailable";

  error:
    string | null;
};

export type ZcashIntelligence = {
  ok:
    true;

  network:
    "zcash";

  address:
    string;

  addressKind:
    ZcashEvidence[
      "addressKind"
    ];

  analysisPlan:
    AnalysisDepthPlan;

  coverage:
    "partial" |
    "limited";

  balanceZatoshis:
    string | null;

  totalReceivedZatoshis:
    string | null;

  totalSpentZatoshis:
    string | null;

  transactions:
    ZcashEvidence[
      "transactions"
    ];

  utxos:
    ZcashEvidence[
      "utxos"
    ];

  canonicalTransactions:
    ZcashEvidence[
      "canonicalTransactions"
    ];

  derived:
    ZcashDerivedAnalysis;

  evidenceCoverage:
    ZcashEvidence[
      "coverage"
    ];

  modules: {
    addressState:
      ModuleState;

    transactionHistory:
      ModuleState;

    utxos:
      ModuleState;

    canonicalEvidence:
      ModuleState;

    transparentFlow:
      ModuleState;

    counterparties:
      ModuleState;

    funding:
      ModuleState;

    privacyBoundary:
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

type ZcashFailure = {
  ok:
    false;

  network:
    "zcash";

  code:
    | "INVALID_ADDRESS"
    | "SHIELDED_ADDRESS_NOT_PUBLICLY_TRACEABLE"
    | "NOT_FOUND"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR";

  error:
    string;
};

export type ZcashEngineDependencies = {
  loadEvidence(
    input: {
      address:
        string;

      analysisPlan:
        AnalysisDepthPlan;
    }
  ): Promise<
    ZcashProviderResult<
      ZcashEvidence
    >
  >;
};

const DEFAULT_DEPENDENCIES:
  ZcashEngineDependencies = {
    loadEvidence:
      getZcashResilientEvidence,
  };

export async function runZcashIntelligence(
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
    ZcashEngineDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  IntelligenceEngineResult<
    ZcashIntelligence |
    ZcashFailure
  >
> {
  if (
    isZcashShieldedOrUnifiedAddress(
      address
    )
  ) {
    return {
      status:
        400,

      data: {
        ok:
          false,

        network:
          "zcash",

        code:
          "SHIELDED_ADDRESS_NOT_PUBLICLY_TRACEABLE",

        error:
          "AYZO does not infer hidden Zcash shielded sender, recipient, amount, ownership, or funding evidence from a shielded or unified address.",
      },
    };
  }

  const normalized =
    normalizeZcashTransparentAddress(
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
          "zcash",

        code:
          "INVALID_ADDRESS",

        error:
          "Invalid Zcash transparent mainnet address.",
      },
    };
  }

  const addressKind =
    getZcashAddressKind(
      normalized
    );

  if (
    addressKind !==
      "transparent-p2pkh" &&
    addressKind !==
      "transparent-p2sh"
  ) {
    return {
      status:
        400,

      data: {
        ok:
          false,

        network:
          "zcash",

        code:
          "INVALID_ADDRESS",

        error:
          "Unsupported Zcash transparent address family.",
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
          "INVALID_ADDRESS" ||
        evidenceResult.code ===
          "INVALID_TRANSACTION_HASH"
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
          "zcash",

        code:
          evidenceResult.code ===
            "INVALID_ADDRESS" ||
          evidenceResult.code ===
            "INVALID_TRANSACTION_HASH"
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
    getZcashAnalysisPolicy(
      analysisPlan
    );

  const derived =
    buildZcashDerivedAnalysis({
      address:
        normalized,

      evidence,

      policy,
    });

  const findings:
    IntelligenceFinding[] = [
      {
        id:
          "zcash-transparent-bounded-evidence",

        category:
          "coverage",

        title:
          "Bounded Zcash transparent evidence collected",

        severity:
          "informational",

        confidence:
          "high",

        summary:
          `AYZO observed ${evidence.transactions.length} transparent transaction reference(s), ${evidence.utxos.length} UTXO(s), and verified ${evidence.coverage.canonicalVerified}/${evidence.coverage.canonicalRequested} canonical transaction sample(s).`,

        caveat:
          "This analysis covers public transparent evidence only and does not reveal hidden shielded sender, recipient, or amount data.",
      },
    ];

  if (
    derived
      .observedFunding
  ) {
    findings.push({
      id:
        "zcash-transparent-observed-funding",

      category:
        "funding",

      title:
        "Observed transparent Zcash funding evidence",

      severity:
        "informational",

      confidence:
        "medium",

      summary:
        "AYZO observed a canonical transaction with one explicit external transparent input source funding the analyzed transparent address.",

      caveat:
        "This is bounded direct public evidence only. It does not establish beneficial ownership, ultimate provenance, or hidden shielded funding.",
    });
  }

  if (
    derived
      .privacyBoundary
      .unresolvedInputCount >
      0 ||
    derived
      .privacyBoundary
      .unresolvedOutputCount >
      0
  ) {
    findings.push({
      id:
        "zcash-public-privacy-boundary",

      category:
        "coverage",

      title:
        "Unresolved Zcash transaction boundary observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        "One or more canonical transaction components did not expose a checksum-valid transparent counterparty address.",

      caveat:
        "AYZO does not classify unresolved components as a specific shielded sender, recipient, amount, identity, or owner. Missing transparent address evidence may reflect privacy-preserving protocol activity or provider limitations.",
    });
  }

  const requested =
    evidence
      .coverage
      .canonicalRequested;

  const verified =
    evidence
      .coverage
      .canonicalVerified;

  const hasCanonical =
    verified > 0;

  const canonicalComplete =
    requested > 0 &&
    verified ===
      requested;

  return {
    status:
      200,

    data: {
      ok:
        true,

      network:
        "zcash",

      address:
        normalized,

      addressKind,

      analysisPlan,

      coverage:
        canonicalComplete &&
        !evidence
          .coverage
          .historyHasMore &&
        !evidence
          .coverage
          .utxosHaveMore
          ? "partial"
          : "limited",

      balanceZatoshis:
        evidence
          .balanceZatoshis,

      totalReceivedZatoshis:
        evidence
          .totalReceivedZatoshis,

      totalSpentZatoshis:
        evidence
          .totalSpentZatoshis,

      transactions:
        evidence
          .transactions,

      utxos:
        evidence.utxos,

      canonicalTransactions:
        evidence
          .canonicalTransactions,

      derived,

      evidenceCoverage:
        evidence
          .coverage,

      modules: {
        addressState: {
          status:
            "complete",

          error:
            null,
        },

        transactionHistory: {
          status:
            evidence
              .coverage
              .historyHasMore
              ? "limited"
              : "complete",

          error:
            evidence
              .coverage
              .historyHasMore
              ? "Additional transparent Zcash transaction history exists outside the selected plan window."
              : null,
        },

        utxos: {
          status:
            evidence
              .coverage
              .utxosHaveMore
              ? "limited"
              : "complete",

          error:
            evidence
              .coverage
              .utxosHaveMore
              ? "Additional transparent Zcash UTXOs exist outside the selected plan window."
              : null,
        },

        canonicalEvidence: {
          status:
            canonicalComplete
              ? "complete"
              : hasCanonical
                ? "limited"
                : "unavailable",

          error:
            canonicalComplete
              ? null
              : hasCanonical
                ? "Canonical transparent transaction evidence was only partially available."
                : "No canonical transparent transaction evidence was verified.",
        },

        transparentFlow: {
          status:
            hasCanonical
              ? "limited"
              : "unavailable",

          error:
            hasCanonical
              ? "Flow contains only explicit public transparent input/output evidence inside the bounded canonical sample."
              : "Canonical transaction evidence was unavailable.",
        },

        counterparties: {
          status:
            hasCanonical
              ? "limited"
              : "unavailable",

          error:
            hasCanonical
              ? "Counterparties are explicit checksum-valid transparent addresses only."
              : "Canonical transaction evidence was unavailable.",
        },

        funding: {
          status:
            derived
              .observedFunding
              ? "limited"
              : hasCanonical
                ? "limited"
                : "unavailable",

          error:
            derived
              .observedFunding
              ? "Observed funding is restricted to a conservative single-source fully transparent canonical case."
              : hasCanonical
                ? "No safely attributable direct transparent funding source was observed."
                : "Canonical transaction evidence was unavailable.",
        },

        privacyBoundary: {
          status:
            hasCanonical
              ? "limited"
              : "unavailable",

          error:
            hasCanonical
              ? "Privacy-boundary reporting identifies unresolved public components only and never reconstructs hidden shielded evidence."
              : "Canonical transaction evidence was unavailable.",
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
              ? "Timeline is bounded to the selected canonical sample."
              : "No canonical timeline evidence was available.",
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
              ? "Graph contains explicit transparent transaction relationships only."
              : "No explicit transparent relationship edges were observed.",
        },
      },

      findings,

      caveats: [
        "AYZO analyzes only publicly observable Zcash transparent evidence for address relationships.",
        "AYZO never infers hidden shielded sender, recipient, transferred amount, identity, ownership, or intent.",
        "An unresolved canonical input or output is not automatically classified as shielded activity.",
        "Transparent input co-occurrence does not establish common ownership or control.",
        "Transparent output relationships do not establish beneficial ownership of recipient addresses.",
        "Outgoing totals include explicit non-target transparent outputs only and are not presented as wallet-level net spend.",
        "Observed funding is intentionally conservative and requires one explicit external transparent source with no unresolved transparent input evidence inside that canonical transaction.",
        "All history, UTXO, canonical, graph, and timeline evidence remains bounded according to the selected AYZO plan.",
      ],
    },
  };
}
