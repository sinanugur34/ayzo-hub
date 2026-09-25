import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  buildXrplDerivedAnalysis,
  type XrplDerivedAnalysis,
} from "./analysis";

import {
  isXrplClassicAddress,
} from "./address";

import {
  getXrplAnalysisPolicy,
} from "./policy";

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

  analysisPlan:
    AnalysisDepthPlan;

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

  trustLines:
    XrplAccountEvidence["trustLines"];

  accountObjects:
    XrplAccountEvidence["accountObjects"];

  signerLists:
    XrplAccountEvidence["signerLists"];

  firstObservedFunding:
    XrplAccountEvidence["firstObservedFunding"];

  derived:
    XrplDerivedAnalysis;

  evidenceCoverage:
    XrplAccountEvidence["coverage"];

  modules: {
    accountState:
      ModuleState;

    transactionHistory:
      ModuleState;

    trustLines:
      ModuleState;

    accountObjects:
      ModuleState;

    funding:
      ModuleState;

    flow:
      ModuleState;

    counterparties:
      ModuleState;

    signerConfiguration:
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

      analysisPlan:
        AnalysisDepthPlan;
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
    analysisPlan =
      "free",
  }: {
    address:
      string;

    analysisPlan?:
      AnalysisDepthPlan;
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

      analysisPlan,
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
    trustLines,
    accountObjects,
    signerLists,
    firstObservedFunding,
    availability,
    coverage,
  } =
    evidence.data;

  const derived =
    buildXrplDerivedAnalysis({
      address:
        normalized,

      evidence:
        evidence.data,
    });

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
        `AYZO observed validated account state and sampled ${transactions.length} recent XRP Ledger transaction(s) using ${analysisPlan} analysis depth.`,

      caveat:
        "The transaction query is intentionally bounded and is not exhaustive account history.",
    });
  }

  if (
    firstObservedFunding
  ) {
    findings.push({
      id:
        "xrpl-observed-funding",

      category:
        "funding",

      title:
        "Observed incoming funding evidence",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO observed an early successful inbound XRP Ledger payment from ${firstObservedFunding.source}.`,

      caveat:
        "This is the earliest funding observation in the bounded forward history page collected by AYZO, not a claim of ultimate origin or ownership.",
    });
  }

  if (
    derived.signer
      .multisignConfigured
  ) {
    findings.push({
      id:
        "xrpl-multisign",

      category:
        "account",

      title:
        "Signer list observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `The account exposes ${derived.signer.signerCount} signer entry or entries across ${derived.signer.signerListCount} signer list(s).`,

      caveat:
        "Signer configuration is on-ledger authorization evidence and does not establish real-world identity.",
    });
  }

  if (
    derived.trustLines
      .trustLineCount >
    0
  ) {
    findings.push({
      id:
        "xrpl-trust-lines",

      category:
        "asset",

      title:
        "XRPL trust-line evidence observed",

      severity:
        "informational",

      confidence:
        "high",

      summary:
        `AYZO observed ${derived.trustLines.trustLineCount} trust line(s) spanning ${derived.trustLines.currencyCount} currency code(s).`,

      caveat:
        "Trust lines describe XRPL ledger relationships and issued-asset balances; they do not establish endorsement, beneficial ownership, or intent.",
    });
  }

  const policy =
    getXrplAnalysisPolicy(
      analysisPlan
    );

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

      analysisPlan,

      coverage:
        account.exists
          ? "partial"
          : "limited",

      account,

      history: {
        transactions,
        nextCursor,
      },

      trustLines,

      accountObjects,

      signerLists,

      firstObservedFunding,

      derived,

      evidenceCoverage:
        coverage,

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
              ? (
                  coverage.historyHasMore
                    ? "limited"
                    : "complete"
                )
              : "limited",

          error:
            coverage.historyHasMore
              ? `History is bounded to ${policy.historyLimit} recent transactions for the current plan.`
              : null,
        },

        trustLines: {
          status:
            availability.trustLines
              ? (
                  coverage.trustLinesHaveMore
                    ? "limited"
                    : "complete"
                )
              : "unavailable",

          error:
            availability.trustLines
              ? (
                  coverage.trustLinesHaveMore
                    ? "Additional trust-line pages may exist."
                    : null
                )
              : "Trust-line evidence was unavailable.",
        },

        accountObjects: {
          status:
            availability.accountObjects
              ? (
                  coverage.accountObjectsHaveMore
                    ? "limited"
                    : "complete"
                )
              : "unavailable",

          error:
            availability.accountObjects
              ? (
                  coverage.accountObjectsHaveMore
                    ? "Additional account-object pages may exist."
                    : null
                )
              : "Account-object evidence was unavailable.",
        },

        funding: {
          status:
            availability.earliestHistory
              ? "limited"
              : "unavailable",

          error:
            availability.earliestHistory
              ? "Funding evidence is bounded to the earliest forward history page collected by AYZO."
              : "Earliest-history evidence was unavailable.",
        },

        flow: {
          status:
            account.exists
              ? "limited"
              : "unavailable",

          error:
            account.exists
              ? "Flow intelligence is derived from the bounded transaction window."
              : "No funded account state was observed.",
        },

        counterparties: {
          status:
            account.exists
              ? "limited"
              : "unavailable",

          error:
            account.exists
              ? "Counterparties are derived from bounded transaction and trust-line evidence."
              : "No funded account state was observed.",
        },

        signerConfiguration: {
          status:
            account.exists
              ? "complete"
              : "unavailable",

          error:
            account.exists
              ? null
              : "No funded account state was observed.",
        },
      },

      findings,

      caveats: [
        "AYZO reports observed XRP Ledger evidence and does not establish ownership, identity, intent, or control.",
        "Transaction, funding, relationship and flow evidence is intentionally bounded according to the current plan.",
        "Issued-currency Amount objects are preserved separately and are not converted into XRP.",
        "Trust lines and account objects are ledger relationships, not endorsements or ownership claims.",
      ],
    },
  };
}