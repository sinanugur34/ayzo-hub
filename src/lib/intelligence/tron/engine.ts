import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  buildTronDerivedAnalysis,
  type TronDerivedAnalysis,
} from "./analysis";

import {
  isTronAddress,
} from "./address";

import {
  getTronAnalysisPolicy,
} from "./policy";

import {
  tronGridProvider,
} from "./providers/trongrid";

import {
  tronGridCanonicalProvider,
} from "./providers/tronGridCanonical";

import type {
  TronPaginatedAddressRequest,
  TronTransactionRequest,
} from "./provider";

import type {
  TronAddressHistoryPage,
  TronNetworkContext,
  TronProviderErrorCode,
  TronProviderResult,
  TronTransactionEvidence,
} from "./types";

const TRON_NETWORK:
  TronNetworkContext = {
    networkId:
      "tron",

    name:
      "TRON",

    nativeCurrency:
      "TRX",
  };

export type TronIntelligenceModuleState = {
  status:
    | "complete"
    | "limited"
    | "unavailable";

  error:
    string | null;
};

export type TronIntelligence = {
  ok:
    true;

  network:
    "tron";

  address:
    string;

  analysisPlan:
    AnalysisDepthPlan;

  coverage:
    | "partial"
    | "limited";

  history:
    TronAddressHistoryPage;

  /*
   * Backward-compatible newest canonical
   * transaction for existing report surfaces.
   */
  canonicalTransaction:
    TronTransactionEvidence | null;

  canonicalTransactions:
    readonly TronTransactionEvidence[];

  derived:
    TronDerivedAnalysis;

  evidenceCoverage: {
    historyLimit:
      number;

    canonicalSampleLimit:
      number;

    historyHasMore:
      boolean;
  };

  modules: {
    addressHistory:
      TronIntelligenceModuleState;

    canonicalTransactionEvidence:
      TronIntelligenceModuleState;

    flow:
      TronIntelligenceModuleState;

    counterparties:
      TronIntelligenceModuleState;

    funding:
      TronIntelligenceModuleState;

    contractInteractions:
      TronIntelligenceModuleState;

    resources:
      TronIntelligenceModuleState;
  };

  findings:
    readonly IntelligenceFinding[];

  caveats:
    readonly string[];
};

type TronIntelligenceError = {
  ok:
    false;

  code:
    | "INVALID_ADDRESS"
    | "NETWORK_NOT_AVAILABLE"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR";

  error:
    string;

  network:
    "tron";
};

export type TronEngineDependencies = {
  getAddressTransactions(
    request:
      TronPaginatedAddressRequest
  ): Promise<
    TronProviderResult<
      TronAddressHistoryPage
    >
  >;

  getTransactionEvidence(
    request:
      TronTransactionRequest
  ): Promise<
    TronProviderResult<
      TronTransactionEvidence
    >
  >;
};

const DEFAULT_DEPENDENCIES:
  TronEngineDependencies = {
    getAddressTransactions:
      request =>
        tronGridProvider
          .getAddressTransactions(
            request
          ),

    getTransactionEvidence:
      request =>
        tronGridCanonicalProvider
          .getTransactionEvidence(
            request
          ),
  };

function providerFailureStatus(
  code:
    TronProviderErrorCode
): number {
  switch (code) {
    case "INVALID_ADDRESS":
    case "INVALID_TRANSACTION_HASH":
    case "INVALID_CURSOR":
    case "INVALID_LIMIT":
      return 400;

    case "RATE_LIMITED":
      return 429;

    case "UNSUPPORTED_NETWORK":
    case "UNSUPPORTED_CAPABILITY":
      return 503;

    case "TIMEOUT":
    case "UPSTREAM_ERROR":
      return 502;
  }
}

function intelligenceErrorCode(
  code:
    TronProviderErrorCode
):
  | "INVALID_ADDRESS"
  | "NETWORK_NOT_AVAILABLE"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR" {
  switch (code) {
    case "INVALID_ADDRESS":
    case "INVALID_TRANSACTION_HASH":
    case "INVALID_CURSOR":
    case "INVALID_LIMIT":
      return "INVALID_ADDRESS";

    case "UNSUPPORTED_NETWORK":
    case "UNSUPPORTED_CAPABILITY":
      return "NETWORK_NOT_AVAILABLE";

    case "RATE_LIMITED":
      return "RATE_LIMITED";

    case "TIMEOUT":
    case "UPSTREAM_ERROR":
      return "UPSTREAM_ERROR";
  }
}

function emptyDerived(
  requested:
    number
): TronDerivedAnalysis {
  return {
    flow: {
      incomingTransactionCount:
        0,

      outgoingTransactionCount:
        0,

      selfTransactionCount:
        0,

      contractInteractionCount:
        0,

      observedTransactionCount:
        0,

      incomingSun:
        "0",

      outgoingSun:
        "0",
    },

    counterparties: {
      count:
        0,

      items:
        [],
    },

    observedFunding:
      null,

    contractTypes:
      [],

    resources: {
      feeSun:
        "0",

      energyFeeSun:
        "0",

      netFeeSun:
        "0",

      energyUsageTotal:
        0,

      netUsage:
        0,

      successfulCanonicalCount:
        0,

      unsuccessfulCanonicalCount:
        0,
    },

    canonicalCoverage: {
      requested,

      verified:
        0,

      unavailable:
        requested,
    },
  };
}

export async function runTronIntelligence(
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
    TronEngineDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  IntelligenceEngineResult<
    | TronIntelligence
    | TronIntelligenceError
  >
> {
  const normalizedAddress =
    address.trim();

  const policy =
    getTronAnalysisPolicy(
      analysisPlan
    );

  if (
    !isTronAddress(
      normalizedAddress
    )
  ) {
    return {
      status:
        400,

      data: {
        ok:
          false,

        code:
          "INVALID_ADDRESS",

        error:
          "Invalid TRON address.",

        network:
          "tron",
      },
    };
  }

  const historyResult =
    await deps
      .getAddressTransactions({
        network:
          TRON_NETWORK,

        address:
          normalizedAddress,

        limit:
          policy.historyLimit,
      });

  if (
    !historyResult.ok
  ) {
    return {
      status:
        providerFailureStatus(
          historyResult.code
        ),

      data: {
        ok:
          false,

        code:
          intelligenceErrorCode(
            historyResult.code
          ),

        error:
          historyResult.code ===
            "INVALID_ADDRESS"
            ? "Invalid TRON address."
            : "TRON address history is temporarily unavailable.",

        network:
          "tron",
      },
    };
  }

  const history =
    historyResult.data;

  const findings:
    IntelligenceFinding[] =
      [];

  const caveats = [
    "AYZO reports observed TRON on-chain evidence and does not establish ownership, identity, intent, or control.",
    "TRON history and canonical verification are intentionally bounded according to the current analysis plan.",
    "Native TRX flow is counted only from successful canonical TransferContract or TriggerSmartContract call-value evidence.",
    "Failed or reverted canonical transactions remain transaction evidence but are not counted as executed TRX flow.",
    "Contract interaction evidence does not establish beneficial ownership, identity, intent, or control of a contract address.",
  ];

  const requestedTransactions =
    history.transactions.slice(
      0,
      policy.canonicalSampleLimit
    );

  if (
    requestedTransactions.length ===
      0
  ) {
    findings.push({
      id:
        "tron-no-history-observed",

      category:
        "coverage",

      title:
        "No TRON transaction history observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        "The current bounded provider query returned no confirmed TRON transactions for this address.",

      caveat:
        "A bounded query returning no transactions does not prove that the address has never had activity.",
    });

    return {
      status:
        200,

      data: {
        ok:
          true,

        network:
          "tron",

        address:
          normalizedAddress,

        analysisPlan,

        coverage:
          "limited",

        history,

        canonicalTransaction:
          null,

        canonicalTransactions:
          [],

        derived:
          emptyDerived(
            0
          ),

        evidenceCoverage: {
          historyLimit:
            policy.historyLimit,

          canonicalSampleLimit:
            policy.canonicalSampleLimit,

          historyHasMore:
            history.nextCursor !==
            null,
        },

        modules: {
          addressHistory: {
            status:
              history.nextCursor
                ? "limited"
                : "complete",

            error:
              history.nextCursor
                ? "Additional TRON history pages may exist."
                : null,
          },

          canonicalTransactionEvidence: {
            status:
              "limited",

            error:
              "No transaction was available for canonical evidence verification.",
          },

          flow: {
            status:
              "unavailable",

            error:
              "No canonical transaction evidence was available.",
          },

          counterparties: {
            status:
              "unavailable",

            error:
              "No canonical transaction evidence was available.",
          },

          funding: {
            status:
              "unavailable",

            error:
              "No canonical transaction evidence was available.",
          },

          contractInteractions: {
            status:
              "unavailable",

            error:
              "No canonical transaction evidence was available.",
          },

          resources: {
            status:
              "unavailable",

            error:
              "No canonical transaction evidence was available.",
          },
        },

        findings,

        caveats,
      },
    };
  }

  const canonicalTransactions:
    TronTransactionEvidence[] =
      [];

  const canonicalErrors:
    string[] =
      [];

  for (
    const transaction of
    requestedTransactions
  ) {
    const evidenceResult =
      await deps
        .getTransactionEvidence({
          network:
            TRON_NETWORK,

          transactionHash:
            transaction
              .transactionHash,
        });

    if (
      !evidenceResult.ok
    ) {
      canonicalErrors.push(
        evidenceResult.error
      );

      continue;
    }

    const evidence =
      evidenceResult.data;

    if (
      evidence.transactionHash !==
        transaction.transactionHash
          .toLowerCase()
    ) {
      return {
        status:
          502,

        data: {
          ok:
            false,

          code:
            "UPSTREAM_ERROR",

          error:
            "TRON provider evidence did not match the discovered transaction.",

          network:
            "tron",
        },
      };
    }

    canonicalTransactions.push(
      evidence
    );
  }

  const derived =
    buildTronDerivedAnalysis({
      address:
        normalizedAddress,

      canonicalTransactions,

      requestedCanonicalCount:
        requestedTransactions.length,
    });

  const canonicalTransaction =
    canonicalTransactions[0] ??
    null;

  const hasCanonical =
    canonicalTransactions.length >
      0;

  const canonicalComplete =
    canonicalTransactions.length ===
      requestedTransactions.length;

  if (
    !hasCanonical
  ) {
    findings.push({
      id:
        "tron-canonical-evidence-unavailable",

      category:
        "coverage",

      title:
        "Canonical TRON transaction evidence unavailable",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        "Confirmed address history was available, but solidified canonical evidence could not be resolved for the sampled transactions.",

      caveat:
        "This is a provider or evidence-coverage limitation and is not evidence of suspicious activity.",
    });
  } else {
    findings.push({
      id:
        "tron-bounded-history",

      category:
        "coverage",

      title:
        "TRON history sampled",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO sampled ${history.transactions.length} recent confirmed TRON transaction(s) and verified ${canonicalTransactions.length}/${requestedTransactions.length} solidified canonical transaction sample(s) using ${analysisPlan} analysis depth.`,

      caveat:
        "The analysis intentionally bounds transaction history and canonical verification to protect latency and provider reliability.",
    });
  }

  if (
    derived.counterparties.count >
    0
  ) {
    findings.push({
      id:
        "tron-observed-counterparties",

      category:
        "relationship",

      title:
        "TRON counterparty evidence observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO observed ${derived.counterparties.count} explicit owner/destination relationship(s) in the canonical sample.`,

      caveat:
        "Transaction relationships do not establish common ownership, identity, intent, or control.",
    });
  }

  if (
    derived.observedFunding
  ) {
    findings.push({
      id:
        "tron-observed-funding",

      category:
        "funding",

      title:
        "Observed TRON funding evidence",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO observed successful inbound TRX evidence from ${derived.observedFunding.sourceAddressHex}.`,

      caveat:
        "This is bounded incoming canonical evidence, not a claim about original funding provenance or source identity.",
    });
  }

  if (
    derived.flow.contractInteractionCount >
    0
  ) {
    findings.push({
      id:
        "tron-contract-interactions",

      category:
        "relationship",

      title:
        "TRON contract interaction evidence observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO observed ${derived.flow.contractInteractionCount} contract interaction(s) in the canonical sample.`,

      caveat:
        "A contract interaction alone does not establish intent, ownership, or risk.",
    });
  }

  return {
    status:
      200,

    data: {
      ok:
        true,

      network:
        "tron",

      address:
        normalizedAddress,

      analysisPlan,

      coverage:
        hasCanonical
          ? "partial"
          : "limited",

      history,

      canonicalTransaction,

      canonicalTransactions,

      derived,

      evidenceCoverage: {
        historyLimit:
          policy.historyLimit,

        canonicalSampleLimit:
          policy.canonicalSampleLimit,

        historyHasMore:
          history.nextCursor !==
          null,
      },

      modules: {
        addressHistory: {
          status:
            history.nextCursor
              ? "limited"
              : "complete",

          error:
            history.nextCursor
              ? "Additional TRON history pages may exist."
              : null,
        },

        canonicalTransactionEvidence: {
          status:
            canonicalComplete
              ? "complete"
              : hasCanonical
                ? "limited"
                : "unavailable",

          error:
            canonicalComplete
              ? null
              : canonicalErrors[0] ??
                "Canonical evidence was only partially available.",
        },

        flow: {
          status:
            hasCanonical
              ? "limited"
              : "unavailable",

          error:
            hasCanonical
              ? "TRX flow is bounded to successful canonical samples."
              : "Canonical transaction evidence was unavailable.",
        },

        counterparties: {
          status:
            hasCanonical
              ? "limited"
              : "unavailable",

          error:
            hasCanonical
              ? "Relationships are bounded to explicit canonical owner/destination evidence."
              : "Canonical transaction evidence was unavailable.",
        },

        funding: {
          status:
            derived.observedFunding
              ? "limited"
              : hasCanonical
                ? "limited"
                : "unavailable",

          error:
            derived.observedFunding
              ? "Funding evidence is bounded to successful canonical inbound native TRX evidence."
              : hasCanonical
                ? "No explicit successful inbound native TRX source was observed in the bounded canonical sample."
                : "Canonical transaction evidence was unavailable.",
        },

        contractInteractions: {
          status:
            hasCanonical
              ? "limited"
              : "unavailable",

          error:
            hasCanonical
              ? "Contract interaction coverage is bounded to canonical samples."
              : "Canonical transaction evidence was unavailable.",
        },

        resources: {
          status:
            hasCanonical
              ? "limited"
              : "unavailable",

          error:
            hasCanonical
              ? "Fee, energy and bandwidth totals cover only the canonical transaction sample."
              : "Canonical transaction evidence was unavailable.",
        },
      },

      findings,

      caveats,
    },
  };
}