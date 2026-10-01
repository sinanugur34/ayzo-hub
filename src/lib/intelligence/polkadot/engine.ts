import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  IntelligenceEngineResult,
  IntelligenceFinding,
} from "@/lib/intelligence/types";

import {
  normalizePolkadotAddress,
} from "./address";

import {
  buildPolkadotDerivedAnalysis,
  type PolkadotDerivedAnalysis,
} from "./analysis";

import {
  getPolkadotAnalysisPolicy,
} from "./policy";

import {
  getPolkadotEvidence,
} from "./provider";

import type {
  PolkadotEvidence,
  PolkadotProviderResult,
} from "./types";

type ModuleState = {
  status:
    "complete" |
    "limited" |
    "unavailable";

  error:
    string | null;
};

export type PolkadotIntelligence = {
  ok:
    true;

  network:
    "polkadot";

  address:
    string;

  analysisPlan:
    AnalysisDepthPlan;

  coverage:
    "partial" |
    "limited";

  account:
    PolkadotEvidence[
      "account"
    ];

  transfers:
    PolkadotEvidence[
      "transfers"
    ];

  extrinsics:
    PolkadotEvidence[
      "extrinsics"
    ];

  staking:
    PolkadotEvidence[
      "staking"
    ];

  proxies:
    PolkadotEvidence[
      "proxies"
    ];

  multisig:
    PolkadotEvidence[
      "multisig"
    ];

  derived:
    PolkadotDerivedAnalysis;

  evidenceCoverage:
    PolkadotEvidence[
      "coverage"
    ];

  modules: {
    accountState:
      ModuleState;

    transferHistory:
      ModuleState;

    extrinsicHistory:
      ModuleState;

    staking:
      ModuleState;

    proxy:
      ModuleState;

    multisig:
      ModuleState;

    flow:
      ModuleState;

    counterparties:
      ModuleState;

    funding:
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

type Failure = {
  ok:
    false;

  network:
    "polkadot";

  code:
    | "INVALID_ADDRESS"
    | "NOT_FOUND"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR";

  error:
    string;
};

export type PolkadotEngineDependencies = {
  loadEvidence(
    input: {
      address:
        string;

      analysisPlan:
        AnalysisDepthPlan;
    }
  ): Promise<
    PolkadotProviderResult<
      PolkadotEvidence
    >
  >;
};

const DEFAULT_DEPS:
  PolkadotEngineDependencies = {
    loadEvidence:
      getPolkadotEvidence,
  };

export async function runPolkadotIntelligence(
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
    PolkadotEngineDependencies =
      DEFAULT_DEPS
): Promise<
  IntelligenceEngineResult<
    PolkadotIntelligence |
    Failure
  >
> {
  const normalized =
    normalizePolkadotAddress(
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
          "polkadot",

        code:
          "INVALID_ADDRESS",

        error:
          "Invalid Polkadot SS58 mainnet address.",
      },
    };
  }

  const result =
    await deps.loadEvidence({
      address:
        normalized,

      analysisPlan,
    });

  if (!result.ok) {
    const status =
      result.code ===
        "INVALID_ADDRESS"
        ? 400
        : result.code ===
            "NOT_FOUND"
          ? 404
          : result.code ===
              "RATE_LIMITED"
            ? 429
            : 502;

    return {
      status,

      data: {
        ok:
          false,

        network:
          "polkadot",

        code:
          result.code ===
            "INVALID_ADDRESS"
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

  const evidence =
    result.data;

  const policy =
    getPolkadotAnalysisPolicy(
      analysisPlan
    );

  const derived =
    buildPolkadotDerivedAnalysis({
      address:
        normalized,

      evidence,
      policy,
    });

  const findings:
    IntelligenceFinding[] = [
      {
        id:
          "polkadot-native-state",

        category:
          "coverage",

        title:
          "Polkadot native account state observed",

        severity:
          "informational",

        confidence:
          "high",

        summary:
          `AYZO observed native DOT account state and ${evidence.transfers.length} bounded indexed transfer(s).`,

        caveat:
          "Indexed activity remains bounded by the selected plan and provider coverage.",
      },
    ];

  if (
    derived
      .observedFunding
  ) {
    findings.push({
      id:
        "polkadot-observed-funding",

      category:
        "funding",

      title:
        "Observed Polkadot funding evidence",

      severity:
        "informational",

      confidence:
        "medium",

      summary:
        "AYZO observed an explicit inbound DOT transfer inside the bounded indexed history.",

      caveat:
        "This does not establish ultimate funding origin, identity, ownership, or common control.",
    });
  }

  const unavailable =
    new Set(
      evidence
        .coverage
        .unavailableEvidence
    );

  const moduleState =
    (
      key:
        string,
      limitedMessage:
        string
    ): ModuleState =>
      unavailable.has(
        key
      )
        ? {
            status:
              "unavailable",

            error:
              limitedMessage,
          }
        : {
            status:
              "limited",

            error:
              "Evidence is bounded to the selected AYZO plan.",
          };

  return {
    status:
      200,

    data: {
      ok:
        true,

      network:
        "polkadot",

      address:
        normalized,

      analysisPlan,

      coverage:
        evidence
          .coverage
          .coverage ===
          "complete"
          ? "partial"
          : "limited",

      account:
        evidence.account,

      transfers:
        evidence
          .transfers,

      extrinsics:
        evidence
          .extrinsics,

      staking:
        evidence.staking,

      proxies:
        evidence.proxies,

      multisig:
        evidence.multisig,

      derived,

      evidenceCoverage:
        evidence.coverage,

      modules: {
        accountState: {
          status:
            "complete",

          error:
            null,
        },

        transferHistory:
          moduleState(
            "indexed_transfer_history",
            "Indexed Polkadot transfer history provider is unavailable."
          ),

        extrinsicHistory:
          moduleState(
            "extrinsic_history",
            "Indexed Polkadot extrinsic history provider is unavailable."
          ),

        staking:
          moduleState(
            "staking_details",
            "Indexed Polkadot staking evidence is unavailable."
          ),

        proxy:
          moduleState(
            "proxy_evidence",
            "Indexed Polkadot proxy evidence is unavailable."
          ),

        multisig:
          moduleState(
            "multisig_evidence",
            "Indexed Polkadot multisig evidence is unavailable."
          ),

        flow: {
          status:
            evidence
              .transfers
              .length >
              0
              ? "limited"
              : "unavailable",

          error:
            evidence
              .transfers
              .length >
              0
              ? "Flow is bounded to explicit indexed DOT transfer evidence."
              : "No indexed transfer flow is available.",
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
            "Counterparties are explicit transfer participants only.",
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
              ? "Observed funding is the earliest explicit inbound transfer in the bounded window."
              : "No explicit inbound funding evidence was observed.",
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
            "Timeline is bounded to explicit indexed transfer evidence.",
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
            "Graph does not infer identity, ownership, intent, or common control.",
        },
      },

      findings,

      caveats: [
        "Polkadot evidence preserves native Substrate account, extrinsic, staking, proxy and multisig semantics.",
        "Transfer proximity does not establish common ownership or control.",
        "Proxy authority does not prove beneficial ownership or real-world identity.",
        "Multisig participation does not establish that all signers are controlled by one entity.",
        "Observed funding is bounded direct evidence and not proof of ultimate funding origin.",
      ],
    },
  };
}
