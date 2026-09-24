import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  isXrplClassicAddress,
} from "./address";

import {
  getXrplAccountEvidence,
} from "./providers/publicRpc";

import type {
  XrplAccountEvidence,
  XrplProviderErrorCode,
  XrplProviderResult,
} from "./types";

type ModuleState = {
  status:
    | "complete"
    | "limited"
    | "unavailable";

  error:
    string | null;
};

export type XrplIntelligence = {
  ok: true;

  network:
    "xrp";

  address:
    string;

  coverage:
    | "partial"
    | "limited";

  account:
    XrplAccountEvidence["account"];

  history: {
    transactions:
      XrplAccountEvidence["transactions"];

    nextCursor:
      string | null;
  };

  modules: {
    accountState:
      ModuleState;

    transactionHistory:
      ModuleState;
  };

  findings:
    readonly IntelligenceFinding[];

  caveats:
    readonly string[];
};

type XrplFailure = {
  ok: false;

  code:
    | "INVALID_ADDRESS"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR";

  error:
    string;

  network:
    "xrp";
};

export type XrplEngineDependencies = {
  loadEvidence(
    input: {
      address:
        string;
    }
  ): Promise<
    XrplProviderResult<
      XrplAccountEvidence
    >
  >;
};

const DEFAULT_DEPENDENCIES:
  XrplEngineDependencies = {
    loadEvidence:
      getXrplAccountEvidence,
  };

function statusForFailure(
  code:
    XrplProviderErrorCode
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

export async function runXrplIntelligence(
  {
    address,
  }: {
    address:
      string;
  },

  deps:
    XrplEngineDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  IntelligenceEngineResult<
    XrplIntelligence |
    XrplFailure
  >
> {
  const normalized =
    address.trim();

  if (
    !isXrplClassicAddress(
      normalized
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
          "Invalid XRP Ledger classic address.",

        network:
          "xrp",
      },
    };
  }

  const evidence =
    await deps.loadEvidence({
      address:
        normalized,
    });

  if (
    !evidence.ok
  ) {
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
          "xrp",
      },
    };
  }

  const {
    account,
    transactions,
    nextCursor,
  } =
    evidence.data;

  const findings:
    IntelligenceFinding[] =
      [];

  if (
    !account.exists
  ) {
    findings.push({
      id:
        "xrpl-account-not-funded",

      category:
        "coverage",

      title:
        "No funded XRPL account observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        "The address is structurally valid, but no funded account state was returned from the validated XRP Ledger.",

      caveat:
        "A valid XRP Ledger address can exist before an AccountRoot is funded on-ledger.",
    });
  } else {
    findings.push({
      id:
        "xrpl-bounded-history",

      category:
        "coverage",

      title:
        "Validated XRP Ledger evidence observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO observed validated account state and sampled ${transactions.length} recent XRP Ledger transaction(s).`,

      caveat:
        "The transaction query is intentionally bounded and is not exhaustive account history.",
    });
  }

  return {
    status:
      200,

    data: {
      ok:
        true,

      network:
        "xrp",

      address:
        normalized,

      coverage:
        account.exists
          ? "partial"
          : "limited",

      account,

      history: {
        transactions,
        nextCursor,
      },

      modules: {
        accountState: {
          status:
            account.exists
              ? "complete"
              : "limited",

          error:
            account.exists
              ? null
              : "No funded AccountRoot was observed.",
        },

        transactionHistory: {
          status:
            account.exists
              ? "complete"
              : "limited",

          error:
            account.exists
              ? null
              : "Transaction history is unavailable for an unfunded account.",
        },
      },

      findings,

      caveats: [
        "AYZO reports observed XRP Ledger evidence and does not establish ownership, identity, intent, or control.",
        "Transaction history is intentionally bounded to protect latency and provider reliability.",
        "Issued-currency Amount objects are not converted into XRP.",
      ],
    },
  };
}