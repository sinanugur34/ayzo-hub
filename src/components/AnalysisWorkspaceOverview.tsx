"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import InteractiveEvidenceGraph, {
  type InteractiveEvidenceSelection,
} from "@/components/InteractiveEvidenceGraph";

import {
  planHasFeature,
} from "@/lib/plans/registry";

import type {
  FeatureId,
  PlanId,
} from "@/lib/plans/types";

import type {
  VisualEvidenceGraph as VisualEvidenceGraphData,
} from "@/lib/intelligence/visualEvidenceGraph";

type Finding = {
  id: string;
  title: string;
  summary: string;
  caveat: string;

  severity?:
    | "attention"
    | "informational";

  confidence?:
    | "low"
    | "medium"
    | "high";
};

type Coverage =
  | "full"
  | "partial"
  | "limited";

type QuotaStatus = {
  ok: true;
  plan: PlanId;
};

const CAPABILITIES = [
  {
    feature:
      "visualEvidenceGraph",
    label:
      "Evidence graph",
  },
  {
    feature:
      "activityTimeline",
    label:
      "Timeline",
  },
  {
    feature:
      "walletTrackRecord",
    label:
      "Track record",
  },
  {
    feature:
      "historicalChanges",
    label:
      "Historical changes",
  },
  {
    feature:
      "askAyzo",
    label:
      "Ask AYZO",
  },
  {
    feature:
      "marketFlowIntelligence",
    label:
      "Market flow",
  },
  {
    feature:
      "cases",
    label:
      "Cases",
  },
  {
    feature:
      "evidenceLocker",
    label:
      "Evidence Locker",
  },
  {
    feature:
      "compareInvestigations",
    label:
      "Compare",
  },
] as const satisfies readonly {
  feature: FeatureId;
  label: string;
}[];

function planCopy(
  plan:
    PlanId | null
) {
  switch (plan) {
    case "free":
      return {
        name:
          "FREE",
        title:
          "Evidence workspace",
        description:
          "Strong evidence-first core analysis.",
        className:
          "border-zinc-700 bg-zinc-900 text-zinc-300",
      };

    case "pro":
      return {
        name:
          "PRO",
        title:
          "Intelligence workspace",
        description:
          "Context, changes and live Pro investigation tools.",
        className:
          "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
      };

    case "advanced":
      return {
        name:
          "ADVANCED",
        title:
          "Investigation workspace",
        description:
          "Deep investigation and Advanced case workflows.",
        className:
          "border-violet-500/30 bg-violet-500/10 text-violet-300",
      };

    default:
      return {
        name:
          "AYZO",
        title:
          "Evidence workspace",
        description:
          "Evidence-first on-chain intelligence.",
        className:
          "border-zinc-800 bg-zinc-900 text-zinc-400",
      };
  }
}

function coverageCopy(
  coverage:
    Coverage
) {
  switch (coverage) {
    case "full":
      return {
        label:
          "FULL",
        detail:
          "Supported modules completed their current evidence window.",
        className:
          "text-emerald-300",
      };

    case "limited":
      return {
        label:
          "LIMITED",
        detail:
          "Some evidence could not be resolved inside the current bounded window.",
        className:
          "text-amber-300",
      };

    case "partial":
      return {
        label:
          "PARTIAL",
        detail:
          "Usable evidence is available, but the report is not exhaustive.",
        className:
          "text-amber-300",
      };
  }
}

export default function AnalysisWorkspaceOverview({
  networkLabel,
  subject,
  coverage,
  findings,
  caveats = [],
  graph,
}: {
  networkLabel:
    string;

  subject:
    string;

  coverage:
    Coverage;

  findings:
    readonly Finding[];

  caveats?:
    readonly string[];

  graph:
    VisualEvidenceGraphData | null;
}) {
  const [
    plan,
    setPlan,
  ] =
    useState<
      PlanId | null
    >(null);

  const [
    evidenceSelection,
    setEvidenceSelection,
  ] =
    useState<
      InteractiveEvidenceSelection
    >(
      null
    );

  const loadPlan =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              "/api/free/status",
              {
                cache:
                  "no-store",

                credentials:
                  "same-origin",
              }
            );

          if (
            !response.ok
          ) {
            return;
          }

          const body =
            (
              await response
                .json()
            ) as
              QuotaStatus;

          if (
            body.ok &&
            (
              body.plan ===
                "free" ||
              body.plan ===
                "pro" ||
              body.plan ===
                "advanced"
            )
          ) {
            setPlan(
              body.plan
            );
          }
        } catch {
          return;
        }
      },
      []
    );

  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            void loadPlan();
          },
          0
        );

      return () => {
        window.clearTimeout(
          timer
        );
      };
    },
    [
      loadPlan,
    ]
  );

  const activeCapabilities =
    useMemo(
      () =>
        plan
          ? CAPABILITIES.filter(
              item =>
                planHasFeature(
                  plan,
                  item.feature
                )
            )
          : [],
      [
        plan,
      ]
    );

  const currentPlan =
    planCopy(
      plan
    );

  const currentCoverage =
    coverageCopy(
      coverage
    );

  const attentionCount =
    findings.filter(
      finding =>
        finding.severity ===
        "attention"
    ).length;

  const observations =
    findings.slice(
      0,
      3
    );

  const limitations =
    Array.from(
      new Set(
        [
          ...findings.map(
            finding =>
              finding.caveat
          ),
          ...caveats,
        ].filter(Boolean)
      )
    ).slice(
      0,
      3
    );

  return (
    <section
      id="analysis-overview"
      className="scroll-mt-24"
    >
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold tracking-[0.18em] text-cyan-300">
            AYZO · ON-CHAIN INTELLIGENCE
          </div>

          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-zinc-100 sm:text-4xl">
            Follow the evidence.
          </h2>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500 sm:text-sm">
            See the important observations first,
            then inspect the graph, activity and
            detailed evidence behind them.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-xl border px-3 py-2 text-[10px] font-semibold tracking-[0.12em] ${currentPlan.className}`}
          >
            {
              currentPlan.name
            }
          </span>

          <span className="rounded-xl border border-[#26384f] bg-[#132239] px-3 py-2 text-[10px] font-medium text-zinc-300">
            ●{" "}
            {
              networkLabel
            }
          </span>
        </div>
      </header>

      <div className="mt-5 flex min-h-14 items-center gap-3 rounded-2xl border border-[#26384f] bg-[#0e1a2b] px-4 py-3">
        <span className="text-xl text-cyan-300">
          ⌕
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-[10px] text-zinc-600">
            ANALYZED SUBJECT
          </div>

          <div className="mt-1 truncate font-mono text-xs text-zinc-300">
            {subject}
          </div>
        </div>

        <span className="hidden rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1 text-[9px] font-medium text-emerald-300 sm:inline-flex">
          EVIDENCE AVAILABLE
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="relative min-h-28 overflow-hidden rounded-2xl border border-[#26384f] bg-gradient-to-br from-[#13243a] to-[#101d30] p-4">
          <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,.75)]" />

          <div className="text-[9px] tracking-[0.12em] text-zinc-500">
            OBSERVATIONS
          </div>

          <div className="mt-2 text-2xl font-semibold text-zinc-100">
            {
              findings.length
            }
          </div>

          <div className="mt-1 text-[10px] text-zinc-500">
            Evidence-backed findings
          </div>
        </div>

        <div className="relative min-h-28 overflow-hidden rounded-2xl border border-[#26384f] bg-gradient-to-br from-[#13243a] to-[#101d30] p-4">
          <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_16px_rgba(196,181,253,.65)]" />

          <div className="text-[9px] tracking-[0.12em] text-zinc-500">
            ATTENTION
          </div>

          <div className="mt-2 text-2xl font-semibold text-zinc-100">
            {
              attentionCount
            }
          </div>

          <div className="mt-1 text-[10px] text-zinc-500">
            Worth examining
          </div>
        </div>

        <div className="relative min-h-28 overflow-hidden rounded-2xl border border-[#26384f] bg-gradient-to-br from-[#13243a] to-[#101d30] p-4">
          <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_16px_rgba(147,197,253,.65)]" />

          <div className="text-[9px] tracking-[0.12em] text-zinc-500">
            GRAPH EVIDENCE
          </div>

          <div className="mt-2 text-2xl font-semibold text-zinc-100">
            {
              graph
                ?.edges
                .length ??
              0
            }
          </div>

          <div className="mt-1 text-[10px] text-zinc-500">
            Observed connections
          </div>
        </div>

        <div className="relative min-h-28 overflow-hidden rounded-2xl border border-[#26384f] bg-gradient-to-br from-[#13243a] to-[#101d30] p-4">
          <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,.55)]" />

          <div className="text-[9px] tracking-[0.12em] text-zinc-500">
            DATA COVERAGE
          </div>

          <div
            className={`mt-2 text-xl font-semibold ${currentCoverage.className}`}
          >
            {
              currentCoverage.label
            }
          </div>

          <div className="mt-1 text-[10px] text-zinc-500">
            Scope shown explicitly
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,.75fr)]">
        <div className="min-w-0">
          {graph ? (
            <InteractiveEvidenceGraph
              graph={graph}
              selection={evidenceSelection}
              onSelectionChange={
                setEvidenceSelection
              }
            />
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-[#26384f] bg-[#101d30] p-6 text-center text-xs text-zinc-600">
              Visual evidence graph is unavailable
              for the current bounded evidence.
            </div>
          )}
        </div>

        <aside className="flex min-h-[420px] flex-col rounded-3xl border border-[#26384f] bg-gradient-to-br from-[#13243a] to-[#101d30] p-5 sm:p-6">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.16em] text-cyan-300">
              AYZO EVIDENCE BRIEF
            </div>

            <h3 className="mt-2 text-lg font-semibold text-zinc-100">
              {evidenceSelection
                ? "Selected evidence"
                : "What we observed"}
            </h3>

            <p className="mt-1 text-[10px] text-zinc-500">
              {evidenceSelection
                ? "Inspect the selected relationship without leaving the investigation."
                : "Observation and limitation stay together."}
            </p>
          </div>

          {evidenceSelection ? (
            <div className="mt-5">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[9px] font-semibold tracking-[0.12em] text-cyan-300">
                    {
                      evidenceSelection.subtitle
                    }
                  </span>

                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.05] px-2 py-0.5 text-[8px] font-medium text-emerald-300">
                    SUPPORTED
                  </span>
                </div>

                <div className="mt-3 break-words text-base font-semibold leading-6 text-zinc-100">
                  {
                    evidenceSelection.title
                  }
                </div>

                {evidenceSelection.detail && (
                  <p className="mt-2 break-words text-xs leading-5 text-zinc-500">
                    {
                      evidenceSelection.detail
                    }
                  </p>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-[#26384f] bg-[#10233a] p-3">
                  <div className="text-[9px] text-zinc-600">
                    EVIDENCE COUNT
                  </div>

                  <div className="mt-1 text-sm font-semibold text-zinc-200">
                    {
                      evidenceSelection.evidenceCount
                    }
                  </div>
                </div>

                <div className="rounded-xl border border-[#26384f] bg-[#10233a] p-3">
                  <div className="text-[9px] text-zinc-600">
                    TX REFERENCES
                  </div>

                  <div className="mt-1 text-sm font-semibold text-zinc-200">
                    {
                      evidenceSelection.evidenceRefs.length
                    }
                  </div>
                </div>
              </div>

              {evidenceSelection.related.length >
                0 && (
                <div className="mt-4">
                  <div className="text-[9px] font-semibold tracking-[0.12em] text-zinc-600">
                    CONNECTED EVIDENCE
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {evidenceSelection.related
                      .slice(
                        0,
                        5
                      )
                      .map(
                        item => (
                          <span
                            key={
                              item
                            }
                            className="max-w-full truncate rounded-lg border border-zinc-800 bg-black/20 px-2 py-1 font-mono text-[9px] text-zinc-500"
                          >
                            {
                              item
                            }
                          </span>
                        )
                      )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setEvidenceSelection(
                    null
                  );

                  window.dispatchEvent(
                    new CustomEvent(
                      "ayzo:evidence-selection",
                      {
                        detail: {
                          evidenceRefs:
                            [],
                        },
                      }
                    )
                  );
                }}
                className="mt-4 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800"
              >
                Return to general overview
              </button>
            </div>
          ) : observations.length >
            0 ? (
            <div className="mt-5 space-y-3">
              {observations.map(
                (
                  finding,
                  index
                ) => (
                  <div
                    key={
                      finding.id
                    }
                    className={`rounded-xl border p-4 ${
                      index ===
                      0
                        ? "border-cyan-500/20 bg-cyan-500/[0.06]"
                        : "border-zinc-800 bg-black/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 text-[9px] font-semibold text-cyan-300">
                        {
                          index +
                          1
                        }
                      </span>

                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-5 text-zinc-200">
                          {
                            finding.title
                          }
                        </div>

                        <p className="mt-2 text-xs leading-5 text-zinc-500">
                          {
                            finding.summary
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-zinc-800 bg-black/20 p-4 text-xs leading-5 text-zinc-600">
              No additional finding was generated
              from the current bounded evidence.
            </div>
          )}

          <div className="mt-5 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
            <div className="text-[9px] font-semibold tracking-[0.14em] text-amber-300">
              EVIDENCE LIMIT
            </div>

            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {
                limitations[0] ??
                currentCoverage.detail
              }
            </p>
          </div>

          <div className="mt-auto pt-5">
            <div className="border-t border-[#26384f] pt-4">
              <div className="text-[9px] font-semibold tracking-[0.14em] text-zinc-500">
                {
                  currentPlan.title
                }
              </div>

              <p className="mt-2 text-[10px] leading-5 text-zinc-500">
                {
                  currentPlan.description
                }
              </p>

              {activeCapabilities.length >
                0 && (
                <>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {activeCapabilities
                      .slice(
                        0,
                        plan ===
                          "advanced"
                          ? 8
                          : 6
                      )
                      .map(
                        item => (
                          <span
                            key={
                              item.feature
                            }
                            className="rounded-lg border border-zinc-800 bg-black/20 px-2 py-1 text-[9px] text-zinc-500"
                          >
                            {
                              item.label
                            }
                          </span>
                        )
                      )}
                  </div>

                  <p className="mt-3 text-[9px] leading-4 text-zinc-700">
                    Plan access shown here is based on
                    AYZO&apos;s live registry. Network
                    evidence support may vary.
                  </p>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
