import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  isTronAddress,
} from "./address";

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
    networkId: "tron",
    name: "TRON",
    nativeCurrency: "TRX",
  };

const HISTORY_LIMIT = 5;

export type TronIntelligenceModuleState = {
  status:
    | "complete"
    | "limited"
    | "unavailable";

  error: string | null;
};

export type TronIntelligence = {
  ok: true;

  network: "tron";

  address: string;

  coverage:
    | "partial"
    | "limited";

  history:
    TronAddressHistoryPage;

  canonicalTransaction:
    TronTransactionEvidence | null;

  modules: {
    addressHistory:
      TronIntelligenceModuleState;

    canonicalTransactionEvidence:
      TronIntelligenceModuleState;
  };

  findings:
    readonly IntelligenceFinding[];

  caveats:
    readonly string[];
};

type TronIntelligenceError = {
  ok: false;

  code:
    | "INVALID_ADDRESS"
    | "NETWORK_NOT_AVAILABLE"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR";

  error: string;

  network: "tron";
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

export async function runTronIntelligence(
  {
    address,
  }: {
    address: string;
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

  if (
    !isTronAddress(
      normalizedAddress
    )
  ) {
    return {
      status: 400,

      data: {
        ok: false,
        code: "INVALID_ADDRESS",
        error:
          "Invalid TRON address.",
        network: "tron",
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
            ? "Invalid TRON address."
            : "TRON address history is temporarily unavailable.",

        network: "tron",
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
    "AYZO reports observed TRON on-chain evidence and does not establish ownership, identity, intent, or control.",
    "TRON transaction history is intentionally bounded to the requested provider page and must not be interpreted as exhaustive address history.",
    "Canonical evidence is sampled from the newest transaction returned by the bounded history query.",
  ];

  if (!firstTransaction) {
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
      status: 200,

      data: {
        ok: true,
        network: "tron",
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
          TRON_NETWORK,

        transactionHash:
          firstTransaction
            .transactionHash,
      });

  if (!evidenceResult.ok) {
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
        "Confirmed address history was available, but solidified canonical evidence could not be resolved for the sampled transaction.",

      caveat:
        "This is a provider or evidence-coverage limitation and is not evidence of suspicious activity.",
    });

    return {
      status: 200,

      data: {
        ok: true,
        network: "tron",
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
      status: 502,

      data: {
        ok: false,
        code:
          "UPSTREAM_ERROR",
        error:
          "TRON provider evidence did not match the discovered transaction.",
        network:
          "tron",
      },
    };
  }

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
      `AYZO sampled ${history.transactions.length} recent confirmed TRON transaction(s) and verified solidified canonical evidence for the newest transaction.`,

    caveat:
      "The analysis intentionally bounds transaction history to protect latency and provider reliability.",
  });

  return {
    status: 200,

    data: {
      ok: true,
      network: "tron",
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
