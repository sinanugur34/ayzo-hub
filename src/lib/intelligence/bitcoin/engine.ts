import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  getBitcoinAnalysisPolicy,
} from "./policy";

import {
  buildBitcoinDerivedAnalysis,
  type BitcoinDerivedAnalysis,
} from "./analysis";

import {
  isBitcoinMainnetAddress,
} from "./address";

import type {
  BitcoinAddressHistoryPage,
  BitcoinNetworkContext,
  BitcoinProviderErrorCode,
  BitcoinProviderResult,
  BitcoinTransactionEvidence,
} from "./types";

import type {
  BitcoinPaginatedAddressRequest,
  BitcoinTransactionRequest,
} from "./provider";

import {
  getBitcoinAddressHistoryWithFallback,
} from "./historyFallback";

import {
  alchemyBitcoinProvider,
} from "./providers/alchemy";

const BITCOIN_NETWORK:
  BitcoinNetworkContext = {
    networkId: "bitcoin",
    name: "Bitcoin",
    nativeCurrency: "BTC",
  };

export type BitcoinIntelligenceModuleState = {
  status:
    | "complete"
    | "limited"
    | "unavailable";

  error:
    string | null;
};

export type BitcoinIntelligence = {
  ok: true;
  network: "bitcoin";
  address: string;

  analysisPlan:
    AnalysisDepthPlan;

  evidenceCoverage: {
    historyLimit:
      number;

    canonicalSampleLimit:
      number;

    graphMaxNodes:
      number;

    graphMaxEdges:
      number;

    timelineMaxEvents:
      number;

    historyHasMore:
      boolean;
  };

  coverage:
    | "partial"
    | "limited";

  history:
    BitcoinAddressHistoryPage;

  canonicalTransaction:
    BitcoinTransactionEvidence | null;

  canonicalTransactions:
    readonly BitcoinTransactionEvidence[];

  derived:
    BitcoinDerivedAnalysis;

  modules: {
    addressHistory:
      BitcoinIntelligenceModuleState;

    canonicalTransactionEvidence:
      BitcoinIntelligenceModuleState;

    flow:
      BitcoinIntelligenceModuleState;

    counterparties:
      BitcoinIntelligenceModuleState;

    funding:
      BitcoinIntelligenceModuleState;
  };

  findings:
    readonly IntelligenceFinding[];

  caveats:
    readonly string[];
};

export type BitcoinEngineDependencies = {
  getAddressTransactions(
    request:
      BitcoinPaginatedAddressRequest
  ): Promise<
    BitcoinProviderResult<
      BitcoinAddressHistoryPage
    >
  >;

  getTransactionEvidence(
    request:
      BitcoinTransactionRequest
  ): Promise<
    BitcoinProviderResult<
      BitcoinTransactionEvidence
    >
  >;
};

const DEFAULT_DEPENDENCIES:
  BitcoinEngineDependencies = {
    getAddressTransactions:
      (request) =>
        getBitcoinAddressHistoryWithFallback(
          request
        ),

    getTransactionEvidence:
      (request) =>
        alchemyBitcoinProvider
          .getTransactionEvidence(
            request
          ),
  };

function providerFailureStatus(
  code:
    BitcoinProviderErrorCode
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
    BitcoinProviderErrorCode
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

export async function runBitcoinIntelligence(
  {
    address,
    analysisPlan = "free",
  }: {
    address: string;
    analysisPlan?:
      AnalysisDepthPlan;
  },

  deps:
    BitcoinEngineDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  IntelligenceEngineResult<
    | BitcoinIntelligence
    | {
        ok: false;
        code:
          | "INVALID_ADDRESS"
          | "NETWORK_NOT_AVAILABLE"
          | "RATE_LIMITED"
          | "UPSTREAM_ERROR";
        error: string;
        network: "bitcoin";
      }
  >
> {
  const normalizedAddress =
    address.trim();

  const policy =
    getBitcoinAnalysisPolicy(
      analysisPlan
    );

  if (
    !isBitcoinMainnetAddress(
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
          "Invalid Bitcoin address.",

        network:
          "bitcoin",
      },
    };
  }

  const historyResult =
    await deps
      .getAddressTransactions({
        network:
          BITCOIN_NETWORK,

        address:
          normalizedAddress,

        limit:
          policy.historyLimit,
      });

  if (!historyResult.ok) {
    return {
      status:
        providerFailureStatus(
          historyResult.code
        ),

      data: {
        ok: false,

        code:
          intelligenceErrorCode(
            historyResult.code
          ),

        error:
          historyResult.code ===
            "INVALID_ADDRESS"
            ? "Invalid Bitcoin address."
            : "Bitcoin address history is temporarily unavailable.",

        network:
          "bitcoin",
      },
    };
  }

  const history =
    historyResult.data;

  const findings:
    IntelligenceFinding[] = [];

  const caveats = [
    "AYZO reports observed Bitcoin on-chain evidence and does not establish ownership, identity, intent, or control.",
    "Bitcoin transaction history and canonical verification are intentionally bounded according to the current analysis plan.",
    "Only explicit provider-decoded Bitcoin addresses are used for counterparty and funding evidence. AYZO does not infer change ownership from output position or script proximity.",
    "Observed funding means the earliest directly observed inbound source inside the bounded canonical sample. It is not proof of ultimate origin.",
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
    const derived =
      buildBitcoinDerivedAnalysis({
        address:
          normalizedAddress,

        canonicalTransactions:
          [],

        requestedCanonicalCount:
          0,
      });

    findings.push({
      id:
        "bitcoin-no-history-observed",

      category:
        "coverage",

      title:
        "No Bitcoin transaction history observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        "The current bounded provider query returned no Bitcoin transactions for this address.",

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
          "bitcoin",

        address:
          normalizedAddress,

        analysisPlan,

        evidenceCoverage: {
          historyLimit:
            policy.historyLimit,

          canonicalSampleLimit:
            policy.canonicalSampleLimit,

          graphMaxNodes:
            policy.graphMaxNodes,

          graphMaxEdges:
            policy.graphMaxEdges,

          timelineMaxEvents:
            policy.timelineMaxEvents,

          historyHasMore:
            history.nextCursor !==
            null,
        },

        coverage:
          "limited",

        history,

        canonicalTransaction:
          null,

        canonicalTransactions:
          [],

        derived,

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
              "No canonical Bitcoin transaction evidence was available.",
          },

          counterparties: {
            status:
              "unavailable",

            error:
              "No explicit counterparty address evidence was available.",
          },

          funding: {
            status:
              "unavailable",

            error:
              "No observed inbound funding evidence was available.",
          },
        },

        findings,

        caveats,
      },
    };
  }

  const evidenceResults =
    await Promise.all(
      requestedTransactions.map(
        transaction =>
          deps.getTransactionEvidence({
            network:
              BITCOIN_NETWORK,

            transactionHash:
              transaction
                .transactionHash,
          })
      )
    );

  const canonicalTransactions:
    BitcoinTransactionEvidence[] =
      [];

  let canonicalUnavailable =
    0;

  for (
    let index = 0;
    index <
      evidenceResults.length;
    index += 1
  ) {
    const requested =
      requestedTransactions[
        index
      ]!;

    const result =
      evidenceResults[
        index
      ]!;

    if (!result.ok) {
      canonicalUnavailable +=
        1;

      continue;
    }

    const evidence =
      result.data;

    if (
      evidence.transactionHash !==
        requested
          .transactionHash
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
            "Bitcoin provider evidence did not match a discovered transaction.",

          network:
            "bitcoin",
        },
      };
    }

    canonicalTransactions.push(
      evidence
    );

    if (
      !evidence
        .prevoutCoverage
        .complete
    ) {
      findings.push({
        id:
          `bitcoin-prevout-coverage-limited-${index}`,

        category:
          "coverage",

        title:
          "Bitcoin prevout coverage is bounded",

        severity:
          "informational",

        confidence:
          "high",

        summary:
          `Canonical sample ${index + 1} resolved ${evidence.prevoutCoverage.resolved} prevout(s), while ${evidence.prevoutCoverage.unavailable} were unavailable and ${evidence.prevoutCoverage.omitted} were intentionally omitted.`,

        caveat:
          "AYZO bounds Bitcoin prevout RPC fanout to protect reliability and provider usage.",
      });
    }
  }

  const derived =
    buildBitcoinDerivedAnalysis({
      address:
        normalizedAddress,

      canonicalTransactions,

      requestedCanonicalCount:
        requestedTransactions
          .length,
    });

  const canonicalTransaction =
    canonicalTransactions[0] ??
    null;

  if (
    canonicalUnavailable >
      0
  ) {
    const allUnavailable =
      canonicalTransactions.length ===
        0;

    findings.push({
      id:
        allUnavailable
          ? "bitcoin-canonical-evidence-unavailable"
          : "bitcoin-canonical-evidence-partial",

      category:
        "coverage",

      title:
        allUnavailable
          ? "Canonical Bitcoin transaction evidence unavailable"
          : "Some canonical Bitcoin evidence was unavailable",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        allUnavailable
          ? "Address history was available, but canonical transaction evidence could not be resolved for the requested bounded sample."
          : `AYZO verified ${canonicalTransactions.length} of ${requestedTransactions.length} requested canonical transaction sample(s).`,

      caveat:
        "Unavailable canonical samples are provider coverage limitations and are not evidence of suspicious activity.",
    });
  }

  if (
    derived
      .counterparties
      .count >
    0
  ) {
    findings.push({
      id:
        "bitcoin-counterparties-observed",

      category:
        "relationship",

      title:
        "Bitcoin counterparties observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO observed ${derived.counterparties.count} explicit Bitcoin address counterparty relationship(s) in the bounded canonical sample.`,

      caveat:
        "Counterparty relationships use explicit provider-decoded addresses only and do not establish identity, ownership, control or intent.",
    });
  }

  if (
    derived
      .observedFunding
  ) {
    findings.push({
      id:
        "bitcoin-observed-funding",

      category:
        "funding",

      title:
        "Observed inbound Bitcoin funding source",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO observed ${derived.observedFunding.sourceAddress} as a direct inbound source in the bounded canonical Bitcoin sample.`,

      caveat:
        "This is direct transaction evidence inside the analyzed sample, not proof of the wallet's ultimate funding origin.",
    });
  }

  const hasCanonical =
    canonicalTransactions.length >
      0;

  const hasCounterparties =
    derived
      .counterparties
      .count >
    0;

  return {
    status:
      200,

    data: {
      ok:
        true,

      network:
        "bitcoin",

      address:
        normalizedAddress,

      analysisPlan,

      evidenceCoverage: {
        historyLimit:
          policy.historyLimit,

        canonicalSampleLimit:
          policy.canonicalSampleLimit,

        graphMaxNodes:
          policy.graphMaxNodes,

        graphMaxEdges:
          policy.graphMaxEdges,

        timelineMaxEvents:
          policy.timelineMaxEvents,

        historyHasMore:
          history.nextCursor !==
          null,
      },

      coverage:
        hasCanonical
          ? "partial"
          : "limited",

      history,

      canonicalTransaction,

      canonicalTransactions,

      derived,

      modules: {
        addressHistory: {
          status:
            "complete",

          error:
            null,
        },

        canonicalTransactionEvidence: {
          status:
            !hasCanonical
              ? "unavailable"
              : canonicalUnavailable >
                  0 ||
                derived
                  .canonicalCoverage
                  .prevoutUnavailable >
                  0 ||
                derived
                  .canonicalCoverage
                  .prevoutOmitted >
                  0
                ? "limited"
                : "complete",

          error:
            !hasCanonical
              ? "Canonical Bitcoin evidence was unavailable for all requested samples."
              : null,
        },

        flow: {
          status:
            hasCanonical
              ? "limited"
              : "unavailable",

          error:
            hasCanonical
              ? null
              : "No canonical Bitcoin evidence was available for flow analysis.",
        },

        counterparties: {
          status:
            hasCounterparties
              ? "limited"
              : "unavailable",

          error:
            hasCounterparties
              ? null
              : "No explicit provider-decoded Bitcoin counterparty addresses were available in the canonical sample.",
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
              ? null
              : "No direct inbound funding source was observed in the bounded canonical sample.",
        },
      },

      findings,

      caveats,
    },
  };
}
