import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  isDogecoinMainnetAddress,
} from "./address";

import {
  getDogecoinAddressHistoryWithFallback,
} from "./historyFallback";

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

const HISTORY_LIMIT =
  5;

export type DogecoinIntelligenceModuleState = {
  status:
    | "complete"
    | "limited"
    | "unavailable";

  error:
    string | null;
};

export type DogecoinIntelligence = {
  ok: true;

  network:
    "dogecoin";

  address:
    string;

  coverage:
    | "partial"
    | "limited";

  history:
    DogecoinAddressHistoryPage;

  canonicalTransaction:
    DogecoinTransactionEvidence | null;

  modules: {
    addressHistory:
      DogecoinIntelligenceModuleState;

    canonicalTransactionEvidence:
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

export async function runDogecoinIntelligence(
  {
    address,
  }: {
    address: string;
  },

  deps:
    DogecoinEngineDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  IntelligenceEngineResult<
    | DogecoinIntelligence
    | {
        ok: false;
        code:
          | "INVALID_ADDRESS"
          | "NETWORK_NOT_AVAILABLE"
          | "RATE_LIMITED"
          | "UPSTREAM_ERROR";
        error: string;
        network: "dogecoin";
      }
  >
> {
  const normalizedAddress =
    address.trim();

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
          HISTORY_LIMIT,
      });

  if (!historyResult.ok) {
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

  const firstTransaction =
    history.transactions[0];

  const findings:
    IntelligenceFinding[] =
      [];

  const caveats = [
    "AYZO reports observed Dogecoin on-chain evidence and does not establish ownership, identity, intent, or control.",
    "Dogecoin transaction history is bounded to the requested provider page and must not be interpreted as exhaustive address history.",
  ];

  if (!firstTransaction) {
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
          DOGECOIN_NETWORK,

        transactionHash:
          firstTransaction
            .transactionHash,
      });

  if (!evidenceResult.ok) {
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
          "dogecoin",

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

  if (
    evidence.transactionHash !==
      firstTransaction
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
          "Dogecoin provider evidence did not match the discovered transaction.",

        network:
          "dogecoin",
      },
    };
  }

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
      `AYZO sampled ${history.transactions.length} recent Dogecoin transaction(s) and verified canonical evidence for the newest transaction.`,

    caveat:
      "The current analysis intentionally bounds transaction history to protect latency and provider reliability.",
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
            "complete",

          error:
            null,
        },
      },

      findings,

      caveats,
    },
  };
}
