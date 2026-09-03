import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

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
  goldRushBitcoinProvider,
} from "./providers/goldrush";

import {
  alchemyBitcoinProvider,
} from "./providers/alchemy";

const BITCOIN_NETWORK:
  BitcoinNetworkContext = {
    networkId: "bitcoin",
    name: "Bitcoin",
    nativeCurrency: "BTC",
  };

const HISTORY_LIMIT = 5;

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

  coverage:
    | "partial"
    | "limited";

  history:
    BitcoinAddressHistoryPage;

  canonicalTransaction:
    BitcoinTransactionEvidence | null;

  modules: {
    addressHistory:
      BitcoinIntelligenceModuleState;

    canonicalTransactionEvidence:
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
        goldRushBitcoinProvider
          .getAddressTransactions(
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
  }: {
    address: string;
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
          HISTORY_LIMIT,
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

  const firstTransaction =
    history.transactions[0];

  const findings:
    IntelligenceFinding[] = [];

  const caveats = [
    "AYZO reports observed Bitcoin on-chain evidence and does not establish ownership, identity, intent, or control.",
    "Bitcoin transaction history is bounded to the requested provider page and must not be interpreted as exhaustive address history.",
  ];

  if (!firstTransaction) {
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

        coverage:
          "limited",

        history,

        canonicalTransaction:
          null,

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
        },

        findings,

        caveats,
      },
    };
  }

  const evidenceResult =
    await deps
      .getTransactionEvidence({
        network:
          BITCOIN_NETWORK,

        transactionHash:
          firstTransaction
            .transactionHash,
      });

  if (!evidenceResult.ok) {
    findings.push({
      id:
        "bitcoin-canonical-evidence-unavailable",

      category:
        "coverage",

      title:
        "Canonical Bitcoin transaction evidence unavailable",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        "Address history was available, but canonical transaction evidence could not be resolved for the sampled transaction.",

      caveat:
        "This is a provider coverage limitation and is not evidence of suspicious activity.",
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

        coverage:
          "limited",

        history,

        canonicalTransaction:
          null,

        modules: {
          addressHistory: {
            status:
              "complete",

            error:
              null,
          },

          canonicalTransactionEvidence: {
            status:
              "unavailable",

            error:
              evidenceResult.error,
          },
        },

        findings,

        caveats,
      },
    };
  }

  const evidence =
    evidenceResult.data;

  const canonicalMatch =
    evidence.transactionHash ===
      firstTransaction
        .transactionHash
        .toLowerCase();

  if (!canonicalMatch) {
    return {
      status:
        502,

      data: {
        ok:
          false,

        code:
          "UPSTREAM_ERROR",

        error:
          "Bitcoin provider evidence did not match the discovered transaction.",

        network:
          "bitcoin",
      },
    };
  }

  if (
    !evidence
      .prevoutCoverage
      .complete
  ) {
    findings.push({
      id:
        "bitcoin-prevout-coverage-limited",

      category:
        "coverage",

      title:
        "Bitcoin prevout coverage is bounded",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `Canonical evidence resolved ${evidence.prevoutCoverage.resolved} prevout(s), while ${evidence.prevoutCoverage.unavailable} were unavailable and ${evidence.prevoutCoverage.omitted} were intentionally omitted.`,

      caveat:
        "AYZO bounds prevout RPC fanout to protect reliability and provider usage.",
    });
  }

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

      coverage:
        "partial",

      history,

      canonicalTransaction:
        evidence,

      modules: {
        addressHistory: {
          status:
            "complete",

          error:
            null,
        },

        canonicalTransactionEvidence: {
          status:
            evidence
              .prevoutCoverage
              .complete
              ? "complete"
              : "limited",

          error:
            null,
        },
      },

      findings,

      caveats,
    },
  };
}
