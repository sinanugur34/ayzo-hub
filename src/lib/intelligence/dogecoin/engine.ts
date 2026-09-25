import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  buildDogecoinDerivedAnalysis,
  type DogecoinDerivedAnalysis,
} from "./analysis";

import {
  isDogecoinMainnetAddress,
} from "./address";

import {
  getDogecoinAddressHistoryWithFallback,
} from "./historyFallback";

import {
  getDogecoinAnalysisPolicy,
} from "./policy";

import {
  alchemyDogecoinRpcProvider,
} from "./providers/alchemyRpc";

import type {
  DogecoinPaginatedAddressRequest,
  DogecoinTransactionRequest,
} from "./provider";

import type {
  DogecoinAddressHistoryPage,
  DogecoinNetworkContext,
  DogecoinProviderErrorCode,
  DogecoinProviderResult,
  DogecoinTransactionEvidence,
} from "./types";

const DOGECOIN_NETWORK:
  DogecoinNetworkContext = {
    networkId:
      "dogecoin",

    name:
      "Dogecoin",

    nativeCurrency:
      "DOGE",
  };

export type DogecoinIntelligenceModuleState = {
  status:
    | "complete"
    | "limited"
    | "unavailable";

  error:
    string | null;
};

export type DogecoinIntelligence = {
  ok:
    true;

  network:
    "dogecoin";

  address:
    string;

  analysisPlan:
    AnalysisDepthPlan;

  coverage:
    | "partial"
    | "limited";

  history:
    DogecoinAddressHistoryPage;

  /*
   * Kept for backward-compatible report/actions.
   * This is the newest successfully verified
   * canonical transaction in the bounded sample.
   */
  canonicalTransaction:
    DogecoinTransactionEvidence | null;

  canonicalTransactions:
    readonly DogecoinTransactionEvidence[];

  derived:
    DogecoinDerivedAnalysis;

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
      DogecoinIntelligenceModuleState;

    canonicalTransactionEvidence:
      DogecoinIntelligenceModuleState;

    flow:
      DogecoinIntelligenceModuleState;

    counterparties:
      DogecoinIntelligenceModuleState;

    funding:
      DogecoinIntelligenceModuleState;
  };

  findings:
    readonly IntelligenceFinding[];

  caveats:
    readonly string[];
};

export type DogecoinEngineDependencies = {
  getAddressTransactions(
    request:
      DogecoinPaginatedAddressRequest
  ): Promise<
    DogecoinProviderResult<
      DogecoinAddressHistoryPage
    >
  >;

  getTransactionEvidence(
    request:
      DogecoinTransactionRequest
  ): Promise<
    DogecoinProviderResult<
      DogecoinTransactionEvidence
    >
  >;
};

const DEFAULT_DEPENDENCIES:
  DogecoinEngineDependencies = {
    getAddressTransactions:
      request =>
        getDogecoinAddressHistoryWithFallback(
          request
        ),

    getTransactionEvidence:
      request =>
        alchemyDogecoinRpcProvider
          .getTransactionEvidence(
            request
          ),
  };

function providerFailureStatus(
  code:
    DogecoinProviderErrorCode
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
    DogecoinProviderErrorCode
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
): DogecoinDerivedAnalysis {
  return {
    flow: {
      incomingTransactionCount:
        0,

      outgoingTransactionCount:
        0,

      selfTransactionCount:
        0,

      observedTransactionCount:
        0,

      incomingKoinu:
        "0",

      outgoingNonTargetKoinu:
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

    canonicalCoverage: {
      requested,

      verified:
        0,

      unavailable:
        requested,
    },
  };
}

export async function runDogecoinIntelligence(
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
    DogecoinEngineDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  IntelligenceEngineResult<
    | DogecoinIntelligence
    | {
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
          "dogecoin";
      }
  >
> {
  const normalizedAddress =
    address.trim();

  const policy =
    getDogecoinAnalysisPolicy(
      analysisPlan
    );

  if (
    !isDogecoinMainnetAddress(
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
          "Invalid Dogecoin address.",

        network:
          "dogecoin",
      },
    };
  }

  const historyResult =
    await deps
      .getAddressTransactions({
        network:
          DOGECOIN_NETWORK,

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
            ? "Invalid Dogecoin address."
            : "Dogecoin address history is temporarily unavailable.",

        network:
          "dogecoin",
      },
    };
  }

  const history =
    historyResult.data;

  const findings:
    IntelligenceFinding[] =
      [];

  const caveats = [
    "AYZO reports observed Dogecoin on-chain evidence and does not establish ownership, identity, intent, or control.",
    "Dogecoin transaction history and canonical verification are intentionally bounded according to the current analysis plan.",
    "UTXO inputs without resolved previous-output addresses are not assigned an inferred source address.",
    "Observed non-target outputs are transaction outputs and must not be interpreted as net spend or beneficial ownership.",
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
        "dogecoin-no-history-observed",

      category:
        "coverage",

      title:
        "No Dogecoin transaction history observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        "The current bounded provider query returned no Dogecoin transactions for this address.",

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
          "dogecoin",

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
              "complete",

            error:
              null,
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
        },

        findings,

        caveats,
      },
    };
  }

  const canonicalTransactions:
    DogecoinTransactionEvidence[] =
      [];

  const canonicalErrors:
    string[] =
      [];

  /*
   * Resolve sequentially instead of fan-out.
   * This keeps provider pressure bounded and
   * predictable while still allowing plan-aware
   * canonical depth.
   */
  for (
    const transaction of
    requestedTransactions
  ) {
    const evidenceResult =
      await deps
        .getTransactionEvidence({
          network:
            DOGECOIN_NETWORK,

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
            "Dogecoin provider evidence did not match the discovered transaction.",

          network:
            "dogecoin",
        },
      };
    }

    canonicalTransactions.push(
      evidence
    );
  }

  const derived =
    buildDogecoinDerivedAnalysis({
      address:
        normalizedAddress,

      canonicalTransactions,

      requestedCanonicalCount:
        requestedTransactions.length,
    });

  const canonicalTransaction =
    canonicalTransactions[0] ??
    null;

  if (
    canonicalTransactions.length ===
      0
  ) {
    findings.push({
      id:
        "dogecoin-canonical-evidence-unavailable",

      category:
        "coverage",

      title:
        "Canonical Dogecoin transaction evidence unavailable",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        "Address history was available, but canonical transaction evidence could not be resolved for the sampled transactions.",

      caveat:
        "This is a provider coverage limitation and is not evidence of suspicious activity.",
    });
  } else {
    findings.push({
      id:
        "dogecoin-bounded-history",

      category:
        "coverage",

      title:
        "Dogecoin history sampled",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO sampled ${history.transactions.length} recent Dogecoin transaction(s) and verified ${canonicalTransactions.length}/${requestedTransactions.length} canonical transaction sample(s) using ${analysisPlan} analysis depth.`,

      caveat:
        "The analysis intentionally bounds both address history and canonical verification to protect latency and provider reliability.",
    });
  }

  if (
    derived.counterparties.count >
    0
  ) {
    findings.push({
      id:
        "dogecoin-observed-counterparties",

      category:
        "relationship",

      title:
        "Dogecoin counterparty evidence observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO observed ${derived.counterparties.count} distinct address relationship(s) in the canonical UTXO sample.`,

      caveat:
        "Transaction co-occurrence does not establish common ownership, identity, intent, or control.",
    });
  }

  if (
    derived.observedFunding
  ) {
    findings.push({
      id:
        "dogecoin-observed-funding",

      category:
        "funding",

      title:
        "Observed Dogecoin funding evidence",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO observed inbound canonical evidence from ${derived.observedFunding.sourceAddress}.`,

      caveat:
        "This is an observed source address inside the bounded canonical sample, not a claim of original funding provenance or ownership.",
    });
  }

  const canonicalComplete =
    canonicalTransactions.length ===
      requestedTransactions.length;

  const hasCanonical =
    canonicalTransactions.length >
      0;

  return {
    status:
      200,

    data: {
      ok:
        true,

      network:
        "dogecoin",

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
              ? "Additional Dogecoin history pages may exist."
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
              ? "Flow is derived from the bounded canonical transaction sample."
              : "Canonical transaction evidence was unavailable.",
        },

        counterparties: {
          status:
            hasCanonical
              ? "limited"
              : "unavailable",

          error:
            hasCanonical
              ? "Counterparties are derived only from explicit input/output address evidence."
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
              ? "Funding evidence is bounded to resolved source addresses in the canonical sample."
              : hasCanonical
                ? "No explicit inbound source address was resolved in the bounded canonical sample."
                : "Canonical transaction evidence was unavailable.",
        },
      },

      findings,

      caveats,
    },
  };
}