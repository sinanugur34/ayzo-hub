"use client";

import {
  planHasFeature,
  planHasRoadmapFeature,
  PLANS,
} from "@/lib/plans/registry";

import type {
  FeatureId,
  PlanId,
} from "@/lib/plans/types";

type Cell =
  | {
      kind: "available";
    }
  | {
      kind: "account";
    }
  | {
      kind: "soon";
    }
  | {
      kind: "none";
    }
  | {
      kind: "value";
      label: string;
    };

type MatrixRow = {
  label: string;
  detail?: string;
  free: Cell;
  pro: Cell;
  advanced: Cell;
};

type MatrixSection = {
  title: string;
  description?: string;
  rows: MatrixRow[];
};

const AVAILABLE: Cell = {
  kind: "available",
};

const ACCOUNT: Cell = {
  kind: "account",
};

const SOON: Cell = {
  kind: "soon",
};

const NONE: Cell = {
  kind: "none",
};

function registryCell(
  planId: PlanId,
  feature: FeatureId,
  options?: {
    account?: boolean;
  }
): Cell {
  /*
   * Product hierarchy:
   * Advanced includes everything in Pro.
   *
   * Advanced is not live yet, so this is
   * presentation of the intended tier
   * hierarchy only. Entitlement/runtime
   * behavior is not changed here.
   */
  const effectivePlan =
    planId === "advanced" &&
    planHasFeature(
      "pro",
      feature
    )
      ? "pro"
      : planId;

  if (
    planHasFeature(
      effectivePlan,
      feature
    )
  ) {
    return options?.account
      ? ACCOUNT
      : AVAILABLE;
  }

  if (
    planHasRoadmapFeature(
      planId,
      feature
    )
  ) {
    return SOON;
  }

  return NONE;
}

function featureRow(
  label: string,
  feature: FeatureId,
  detail?: string,
  options?: {
    account?: boolean;
  }
): MatrixRow {
  return {
    label,
    detail,

    free:
      registryCell(
        "free",
        feature,
        options
      ),

    pro:
      registryCell(
        "pro",
        feature,
        options
      ),

    advanced:
      registryCell(
        "advanced",
        feature,
        options
      ),
  };
}

const sections:
  MatrixSection[] = [
    {
      title:
        "CORE ACCESS",

      description:
        "Usage limits and core AYZO access.",

      rows: [
        {
          label:
            "Analysis allowance",
          detail:
            "Rolling 24-hour allowance.",

          free: {
            kind: "value",
            label:
              `${PLANS.free.analysisQuota.kind === "fixed"
                ? PLANS.free.analysisQuota.count
                : "—"} / 24h`,
          },

          pro: {
            kind: "value",
            label:
              `${PLANS.pro.analysisQuota.kind === "fixed"
                ? PLANS.pro.analysisQuota.count
                : "—"} / 24h`,
          },

          advanced: {
            kind: "value",
            label: "TBD",
          },
        },

        {
          label:
            "No wallet connection required",
          free: AVAILABLE,
          pro: AVAILABLE,
          advanced: AVAILABLE,
        },

        featureRow(
          "Evidence-backed summaries",
          "evidenceSummary",
          "Findings remain tied to collected on-chain evidence."
        ),

        featureRow(
          "Activity timeline",
          "activityTimeline",
          "Chronological evidence view where supported."
        ),

        featureRow(
          "Wallet track record",
          "walletTrackRecord",
          "Observed wallet activity and evidence-based track record."
        ),

        featureRow(
          "Visual evidence graph",
          "visualEvidenceGraph",
          "Evidence-backed relationship visualization."
        ),

        {
          label:
            "Automatic address/network detection",
          detail:
            "Native address families are detected where unambiguous.",
          free: AVAILABLE,
          pro: AVAILABLE,
          advanced: AVAILABLE,
        },
      ],
    },

    {
      title:
        "ON-CHAIN INTELLIGENCE",

      description:
        "Core analysis modules currently represented in the AYZO platform registry.",

      rows: [
        featureRow(
          "Asset / contract verification",
          "basicVerification"
        ),

        featureRow(
          "Holder intelligence",
          "basicHolderIntelligence",
          "Holder distribution and concentration where applicable."
        ),

        featureRow(
          "Wallet relationships",
          "basicRelationships",
          "Observed transaction-backed wallet connections."
        ),

        featureRow(
          "Funding intelligence",
          "basicFunding",
          "Observed incoming funding signals."
        ),

        featureRow(
          "Funding provenance",
          "fundingProvenance",
          "Evidence-backed funding-source analysis where supported."
        ),

        featureRow(
          "Developer history",
          "developerHistory",
          "Verified deployment/developer evidence where applicable."
        ),

        featureRow(
          "Wallet graph",
          "walletGraph",
          "Bounded relationship graph based on observed evidence."
        ),

        {
          label:
            "EVM deployment intelligence",
          detail:
            "Contract creation and deployer evidence where applicable.",
          free: AVAILABLE,
          pro: AVAILABLE,
          advanced: AVAILABLE,
        },

        {
          label:
            "EVM coordination signals",
          detail:
            "Observed coordination evidence without ownership inference.",
          free: AVAILABLE,
          pro: AVAILABLE,
          advanced: AVAILABLE,
        },

        {
          label:
            "EVM holder concentration",
          detail:
            "Top-holder concentration for supported token contracts.",
          free: AVAILABLE,
          pro: AVAILABLE,
          advanced: AVAILABLE,
        },

        {
          label:
            "Solana mint authority evidence",
          free: AVAILABLE,
          pro: AVAILABLE,
          advanced: AVAILABLE,
        },

        {
          label:
            "Solana freeze authority evidence",
          free: AVAILABLE,
          pro: AVAILABLE,
          advanced: AVAILABLE,
        },

        {
          label:
            "Bitcoin bounded address history",
          free: AVAILABLE,
          pro: AVAILABLE,
          advanced: AVAILABLE,
        },

        {
          label:
            "Bitcoin canonical transaction evidence",
          detail:
            "Canonical evidence may be limited when bounded prevout coverage is incomplete.",
          free: AVAILABLE,
          pro: AVAILABLE,
          advanced: AVAILABLE,
        },

        {
          label:
            "Dogecoin bounded address history",
          free: AVAILABLE,
          pro: AVAILABLE,
          advanced: AVAILABLE,
        },

        {
          label:
            "Dogecoin canonical transaction evidence",
          free: AVAILABLE,
          pro: AVAILABLE,
          advanced: AVAILABLE,
        },
      ],
    },

    {
      title:
        "RESEARCH WORKSPACE",

      description:
        "Account-backed research organization. ACCOUNT means sign-in is required, not a paid subscription.",

      rows: [
        featureRow(
          "Saved analyses",
          "savedAnalyses",
          "Keep investigations in your AYZO account.",
          {
            account: true,
          }
        ),

        featureRow(
          "Watchlists",
          "watchlists",
          "Organize wallets, tokens and monitored subjects.",
          {
            account: true,
          }
        ),

        {
          label:
            "Private personal labels",
          detail:
            "Private annotations attached to your AYZO account.",
          free: ACCOUNT,
          pro: ACCOUNT,
          advanced: ACCOUNT,
        },

        {
          label:
            "Private investigation notes",
          detail:
            "Save personal research context without presenting it as AYZO-verified labeling.",
          free: ACCOUNT,
          pro: ACCOUNT,
          advanced: ACCOUNT,
        },

        {
          label:
            "Watchlist item labels & notes",
          free: ACCOUNT,
          pro: ACCOUNT,
          advanced: ACCOUNT,
        },

        {
          label:
            "Saved analysis notes",
          free: ACCOUNT,
          pro: ACCOUNT,
          advanced: ACCOUNT,
        },
      ],
    },

    {
      title:
        "MONITORING & ALERTS",

      description:
        "Pro monitoring capabilities and future automation features.",

      rows: [
        featureRow(
          "Smart Alerts & Monitoring",
          "alerts",
          "Supported rules can be evaluated on a scheduled basis."
        ),

        {
          label:
            "Pro alert-rule management",
          detail:
            "Create, update and remove supported monitoring rules.",
          free: NONE,
          pro: AVAILABLE,
          advanced: AVAILABLE,
        },

        {
          label:
            "Email alert delivery",
          detail:
            "Supported notification channel when alert delivery is enabled.",
          free: NONE,
          pro: AVAILABLE,
          advanced: AVAILABLE,
        },

        {
          label:
            "Browser notifications",
          detail:
            "Not enabled yet.",
          free: NONE,
          pro: SOON,
          advanced: SOON,
        },

        {
          label:
            "Telegram notifications",
          detail:
            "Not enabled yet.",
          free: NONE,
          pro: SOON,
          advanced: SOON,
        },

        featureRow(
          "Historical changes",
          "historicalChanges"
        ),
      ],
    },

    {
      title:
        "PRO ROADMAP",

      description:
        "Included in the Pro roadmap. Advanced inherits Pro roadmap capabilities.",

      rows: [
        featureRow(
          "Entity & Wallet Labels",
          "entityLabels",
          "Separate from today's private personal annotations."
        ),

        featureRow(
          "Ask AYZO",
          "askAyzo"
        ),

        featureRow(
          "Market & Flow Intelligence",
          "marketFlowIntelligence"
        ),

        featureRow(
          "Investigation Timeline",
          "investigationTimeline"
        ),

        featureRow(
          "Advanced Reports",
          "advancedReports"
        ),

        featureRow(
          "Data Export",
          "dataExport"
        ),

        featureRow(
          "AYZO Mobile App",
          "mobileApp"
        ),
      ],
    },

    {
      title:
        "ADVANCED INVESTIGATION",

      description:
        "Advanced includes everything in Pro plus professional-scale workflows.",

      rows: [
        featureRow(
          "Batch wallet / token analysis",
          "batchAnalysis"
        ),

        featureRow(
          "Compare investigations",
          "compareInvestigations"
        ),

        featureRow(
          "Cases",
          "cases"
        ),

        featureRow(
          "Evidence Locker",
          "evidenceLocker"
        ),

        featureRow(
          "Advanced custom labels & notes",
          "customLabelsNotes",
          "Advanced workflow layer, separate from current private annotations."
        ),

        featureRow(
          "Advanced watchlists",
          "advancedWatchlists"
        ),

        featureRow(
          "Advanced custom alert rules",
          "customAlertRules",
          "Additional Advanced rule capabilities beyond current Pro alert-rule management."
        ),

        featureRow(
          "AYZO API access",
          "apiAccess"
        ),

        featureRow(
          "Team workspace",
          "teamWorkspace"
        ),

        featureRow(
          "No-Code Intelligence Dashboards",
          "noCodeDashboards"
        ),

        featureRow(
          "Priority analysis",
          "priorityAnalysis"
        ),
      ],
    },

    {
      title:
        "SHARING & OUTPUT",

      rows: [
        {
          label:
            "Share investigation on X",
          detail:
            "Available from supported intelligence reports.",
          free: AVAILABLE,
          pro: AVAILABLE,
          advanced: AVAILABLE,
        },

        featureRow(
          "Professional / advanced reports",
          "advancedReports"
        ),

        featureRow(
          "Structured data export",
          "dataExport"
        ),
      ],
    },
  ];

function StatusCell({
  cell,
}: {
  cell: Cell;
}) {
  if (
    cell.kind ===
    "available"
  ) {
    return (
      <div className="flex items-center justify-center gap-2 text-emerald-300">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[11px] font-bold">
          ✓
        </span>

        <span className="hidden text-[10px] font-medium text-emerald-400/80 xl:inline">
          INCLUDED
        </span>
      </div>
    );
  }

  if (
    cell.kind ===
    "account"
  ) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-semibold text-emerald-300">
          ✓
        </span>

        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/[0.07] px-2 py-0.5 text-[8px] font-semibold tracking-[0.1em] text-cyan-300">
          ACCOUNT
        </span>
      </div>
    );
  }

  if (
    cell.kind ===
    "soon"
  ) {
    return (
      <span className="inline-flex rounded-full border border-violet-500/25 bg-violet-500/[0.08] px-2.5 py-1 text-[8px] font-semibold tracking-[0.12em] text-violet-300">
        SOON
      </span>
    );
  }

  if (
    cell.kind ===
    "value"
  ) {
    return (
      <span className="text-xs font-semibold text-zinc-200">
        {cell.label}
      </span>
    );
  }

  return (
    <span className="text-sm text-zinc-800">
      —
    </span>
  );
}

export default function PlanComparisonMatrix() {
  return (
    <div className="mt-12">
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-[10px] font-semibold tracking-[0.2em] text-violet-400">
          COMPLETE FEATURE MATRIX
        </div>

        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
          Compare every AYZO feature.
        </h3>

        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Live capabilities, account features and roadmap items
          are separated so you can see exactly what each plan includes.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[9px]">
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1 text-emerald-300">
            ✓ AVAILABLE
          </span>

          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/[0.06] px-2.5 py-1 text-cyan-300">
            ACCOUNT · SIGN-IN REQUIRED
          </span>

          <span className="rounded-full border border-violet-500/20 bg-violet-500/[0.06] px-2.5 py-1 text-violet-300">
            SOON · ROADMAP
          </span>

          <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-zinc-600">
            — NOT INCLUDED
          </span>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/60 shadow-2xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-black/30">
                <th className="sticky left-0 z-20 w-[42%] bg-zinc-950 px-6 py-5 text-left text-[10px] font-semibold tracking-[0.16em] text-zinc-500">
                  FEATURE
                </th>

                <th className="w-[19%] px-4 py-5 text-center">
                  <div className="text-xs font-semibold tracking-[0.14em] text-zinc-300">
                    FREE
                  </div>

                  <div className="mt-1 text-lg font-semibold text-white">
                    $0
                  </div>
                </th>

                <th className="w-[19%] border-x border-violet-500/10 bg-violet-500/[0.035] px-4 py-5 text-center">
                  <div className="text-xs font-semibold tracking-[0.14em] text-violet-300">
                    PRO
                  </div>

                  <div className="mt-1 text-lg font-semibold text-white">
                    ${PLANS.pro.monthlyPriceUsd?.toFixed(0)}
                    <span className="ml-1 text-[10px] font-normal text-zinc-500">
                      /mo
                    </span>
                  </div>
                </th>

                <th className="w-[20%] px-4 py-5 text-center">
                  <div className="text-xs font-semibold tracking-[0.14em] text-purple-300">
                    ADVANCED
                  </div>

                  <div className="mt-1 text-xs font-medium text-zinc-400">
                    Pricing coming soon
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {sections.map(
                section => (
                  <>
                    <tr
                      key={`${section.title}-heading`}
                      className="border-y border-zinc-800/80 bg-zinc-900/40"
                    >
                      <td
                        colSpan={4}
                        className="px-6 py-4"
                      >
                        <div className="text-[10px] font-semibold tracking-[0.18em] text-violet-300">
                          {section.title}
                        </div>

                        {section.description && (
                          <div className="mt-1 text-[10px] leading-5 text-zinc-600">
                            {
                              section.description
                            }
                          </div>
                        )}
                      </td>
                    </tr>

                    {section.rows.map(
                      row => (
                        <tr
                          key={`${section.title}-${row.label}`}
                          className="border-b border-zinc-900 transition hover:bg-white/[0.012]"
                        >
                          <td className="sticky left-0 z-10 bg-zinc-950/95 px-6 py-4">
                            <div className="text-xs font-medium text-zinc-300">
                              {row.label}
                            </div>

                            {row.detail && (
                              <div className="mt-1 max-w-lg text-[10px] leading-4 text-zinc-600">
                                {
                                  row.detail
                                }
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-4 text-center">
                            <StatusCell
                              cell={
                                row.free
                              }
                            />
                          </td>

                          <td className="border-x border-violet-500/[0.06] bg-violet-500/[0.018] px-4 py-4 text-center">
                            <StatusCell
                              cell={
                                row.pro
                              }
                            />
                          </td>

                          <td className="px-4 py-4 text-center">
                            <StatusCell
                              cell={
                                row.advanced
                              }
                            />
                          </td>
                        </tr>
                      )
                    )}
                  </>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-center text-[10px] leading-5 text-zinc-600">
        Network intelligence depth depends on the selected network,
        subject type and available evidence. Roadmap features are not
        represented as available today.
      </div>
    </div>
  );
}
