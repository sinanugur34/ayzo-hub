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

import type {
  ActivityTimeline as ActivityTimelineData,
  ActivityTimelineEvent,
} from "@/lib/intelligence/activityTimeline";

type Finding = {
  id: string;
  title: string;
  summary: string;
  caveat: string;
  severity?: "attention" | "informational";
  confidence?: "low" | "medium" | "high";
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
  ["visualEvidenceGraph", "Evidence graph"],
  ["activityTimeline", "Timeline"],
  ["walletTrackRecord", "Track record"],
  ["historicalChanges", "Historical changes"],
  ["askAyzo", "Ask AYZO"],
  ["marketFlowIntelligence", "Market flow"],
  ["cases", "Cases"],
  ["evidenceLocker", "Evidence Locker"],
] as const satisfies readonly [
  FeatureId,
  string,
][];

function planCopy(
  plan:
    PlanId | null
) {
  switch (plan) {
    case "free":
      return {
        name: "FREE",
        description:
          "Strong evidence-first core analysis.",
        className:
          "border-zinc-700 bg-zinc-900 text-zinc-300",
      };

    case "pro":
      return {
        name: "PRO",
        description:
          "Context, changes and Pro investigation tools.",
        className:
          "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
      };

    case "advanced":
      return {
        name: "ADVANCED",
        description:
          "Deep investigation and Advanced case workflows.",
        className:
          "border-violet-500/30 bg-violet-500/10 text-violet-300",
      };

    default:
      return {
        name: "AYZO",
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
  if (
    coverage ===
    "full"
  ) {
    return {
      label: "FULL",
      className:
        "text-emerald-300",
      detail:
        "Supported modules completed their current evidence window.",
    };
  }

  return {
    label:
      coverage ===
        "partial"
        ? "PARTIAL"
        : "LIMITED",
    className:
      "text-amber-300",
    detail:
      "Evidence is bounded to the data successfully collected for this analysis.",
  };
}

function short(
  value:
    string
) {
  if (
    value.length <=
    22
  ) {
    return value;
  }

  return `${value.slice(
    0,
    8
  )}...${value.slice(
    -6
  )}`;
}

function eventTitle(
  event:
    ActivityTimelineEvent
) {
  const direction =
    event.direction ===
      "incoming"
      ? "Incoming"
      : event.direction ===
          "outgoing"
        ? "Outgoing"
        : event.direction ===
            "self"
          ? "Self"
          : "Observed";

  const kind =
    event.kind ===
      "native_transfer"
      ? "native transfer"
      : event.kind ===
          "token_transfer"
        ? "token transfer"
        : event.kind ===
            "funding_transfer"
          ? "funding transfer"
          : "transaction";

  return `${direction} ${kind}`;
}

function eventTime(
  value:
    string | null
) {
  if (!value) {
    return "Time unavailable";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Time unavailable";
  }

  return date.toLocaleString(
    "en-US",
    {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  ) + " UTC";
}

export default function AnalysisWorkspaceOverview({
  networkLabel,
  subject,
  coverage,
  findings,
  caveats = [],
  graph,
  timeline = null,
}: {
  networkLabel: string;
  subject: string;
  coverage: Coverage;
  findings: readonly Finding[];
  caveats?: readonly string[];
  graph: VisualEvidenceGraphData | null;
  timeline?: ActivityTimelineData | null;
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
              await response.json()
            ) as QuotaStatus;

          if (
            body.ok &&
            (
              body.plan === "free" ||
              body.plan === "pro" ||
              body.plan === "advanced"
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

      return () =>
        window.clearTimeout(
          timer
        );
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
                  item[0]
                )
            )
          : [],
      [
        plan,
      ]
    );

  const planState =
    planCopy(
      plan
    );

  const coverageState =
    coverageCopy(
      coverage
    );

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
    );

  const attentionCount =
    findings.filter(
      finding =>
        finding.severity ===
        "attention"
    ).length;

  const edges =
    graph?.edges ??
    [];

  const maxEvidence =
    Math.max(
      1,
      ...edges.map(
        edge =>
          edge.evidenceCount
      )
    );

  const recentEvents =
    timeline?.events.slice(
      0,
      5
    ) ??
    [];

  const shareText =
    `I investigated ${networkLabel} on-chain evidence with @IOAYZO.\n\nExplore AYZO → https://app.ayzo.io`;

  return (
    <section
      id="analysis-overview"
      className="scroll-mt-24"
    >
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.18em] text-cyan-300">
            AYZO · ON-CHAIN INTELLIGENCE
          </div>

          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[#edf5ff] sm:text-4xl">
            Follow the evidence.
          </h2>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-[#94a8bf] sm:text-sm">
            See the finding first, then inspect
            addresses, observed connections and
            transaction evidence behind it.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-lg border px-3 py-2 text-[10px] font-semibold tracking-[0.12em] ${planState.className}`}
          >
            {planState.name}
          </span>

          <span className="rounded-lg border border-[#26384f] bg-[#132239] px-3 py-2 text-[10px] font-semibold text-[#bac9dc]">
            <span className="mr-1 text-emerald-300">
              ●
            </span>
            {networkLabel}
          </span>

          <a
            href={`https://x.com/intent/post?text=${encodeURIComponent(
              shareText
            )}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[#26384f] bg-[#132239] px-3 py-2 text-[10px] font-semibold text-[#bac9dc] transition hover:border-[#466582] hover:bg-[#1b334d]"
          >
            Share evidence ↗
          </a>
        </div>
      </header>

      <div className="mt-6 flex min-h-[58px] items-center gap-3 rounded-[13px] border border-[#26384f] bg-[#0e1a2b] px-4 py-3">
        <span className="text-xl text-cyan-300">
          ⌕
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-[9px] tracking-[0.08em] text-[#94a8bf]">
            ANALYZED SUBJECT
          </div>

          <div className="mt-1 truncate font-mono text-xs font-semibold text-[#edf5ff]">
            {subject}
          </div>
        </div>

        <span className="hidden rounded-full border border-emerald-500/20 bg-[#11382c] px-3 py-1 text-[9px] font-medium text-emerald-300 sm:inline-flex">
          EVIDENCE AVAILABLE
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [
            "Observations",
            String(
              findings.length
            ),
            "Evidence-backed findings",
            "bg-cyan-300",
          ],
          [
            "Attention",
            String(
              attentionCount
            ),
            "Worth examining",
            "bg-violet-300",
          ],
          [
            "Graph evidence",
            String(
              edges.length
            ),
            "Observed connections",
            "bg-blue-300",
          ],
          [
            "Data coverage",
            coverageState.label,
            "Scope shown explicitly",
            "bg-amber-300",
          ],
        ].map(
          (
            [
              label,
              value,
              detail,
              dot,
            ]
          ) => (
            <div
              key={
                label
              }
              className="relative min-h-[112px] overflow-hidden rounded-[14px] border border-[#26384f] bg-gradient-to-br from-[#13243a] to-[#101d30] p-4"
            >
              <span
                className={`absolute right-4 top-4 h-2 w-2 rounded-full ${dot}`}
              />

              <div className="text-[9px] uppercase tracking-[0.1em] text-[#94a8bf]">
                {label}
              </div>

              <div
                className={`mt-2 text-2xl font-semibold ${
                  label ===
                  "Data coverage"
                    ? coverageState.className
                    : "text-[#edf5ff]"
                }`}
              >
                {value}
              </div>

              <div className="mt-1 text-[10px] text-[#bac9dc]">
                {detail}
              </div>
            </div>
          )
        )}
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.78fr)_minmax(320px,.82fr)]">
        <div className="min-w-0">
          {graph ? (
            <InteractiveEvidenceGraph
              graph={graph}
              subject={subject}
              selection={
                evidenceSelection
              }
              onSelectionChange={
                setEvidenceSelection
              }
            />
          ) : (
            <div className="flex min-h-[430px] items-center justify-center rounded-[14px] border border-[#293d57] bg-[#101d30] p-6">
              <div className="rounded-[13px] border border-cyan-500/40 bg-[#153e58] px-6 py-4 text-center">
                <div className="text-[9px] font-semibold tracking-[0.12em] text-cyan-300">
                  ANALYZED SUBJECT
                </div>

                <div className="mt-2 font-mono text-xs text-zinc-100">
                  {short(
                    subject
                  )}
                </div>

                <div className="mt-2 text-[10px] text-zinc-500">
                  No supported relationship edges in this evidence window.
                </div>
              </div>
            </div>
          )}
        </div>

        <aside
          aria-live="polite"
          className="flex min-h-[495px] flex-col rounded-[14px] border border-[#26384f] bg-gradient-to-br from-[#13243a] to-[#101d30] p-[18px]"
        >
          <div>
            <h3 className="text-lg font-semibold text-[#edf5ff]">
              AYZO Evidence Brief
            </h3>

            <p className="mt-1 text-xs text-[#94a8bf]">
              Observation and limitation stay together.
            </p>
          </div>

          {evidenceSelection ? (
            <>
              <div className="mt-4 rounded-[10px] border-l-[3px] border-cyan-300 bg-[#183246] p-4">
                <div className="text-[10px] font-semibold tracking-[0.1em] text-cyan-300">
                  {
                    evidenceSelection.subtitle
                  }
                </div>

                <div className="mt-2 text-base font-semibold leading-6 text-zinc-100">
                  {
                    evidenceSelection.title
                  }
                </div>

                {evidenceSelection.detail && (
                  <p className="mt-2 text-xs leading-5 text-[#c7e2ea]">
                    {
                      evidenceSelection.detail
                    }
                  </p>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[#26384f] bg-[#10233a] p-3">
                  <span className="text-[10px] text-[#94a8bf]">
                    Evidence count
                  </span>

                  <b className="mt-1 block text-sm text-[#edf5ff]">
                    {
                      evidenceSelection.evidenceCount
                    }
                  </b>
                </div>

                <div className="rounded-lg border border-[#26384f] bg-[#10233a] p-3">
                  <span className="text-[10px] text-[#94a8bf]">
                    Tx references
                  </span>

                  <b className="mt-1 block text-sm text-[#edf5ff]">
                    {
                      evidenceSelection.evidenceRefs.length
                    }
                  </b>
                </div>
              </div>

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
                className="mt-4 rounded-lg border border-[#26384f] bg-[#132239] px-3 py-2 text-xs text-[#bac9dc]"
              >
                General view
              </button>
            </>
          ) : observations.length >
            0 ? (
            <div className="mt-4">
              <div className="rounded-[10px] border-l-[3px] border-cyan-300 bg-[#183246] p-4">
                <b className="block text-base leading-6 text-[#edf5ff]">
                  {
                    observations[0].title
                  }
                </b>

                <p className="mt-2 text-xs leading-5 text-[#c7e2ea]">
                  {
                    observations[0].summary
                  }
                </p>
              </div>

              {observations
                .slice(
                  1
                )
                .map(
                  finding => (
                    <div
                      key={
                        finding.id
                      }
                      className="mt-3 rounded-lg border border-[#26384f] bg-[#102237] p-3"
                    >
                      <div className="text-xs font-semibold text-zinc-200">
                        {
                          finding.title
                        }
                      </div>

                      <p className="mt-1 text-[10px] leading-4 text-zinc-500">
                        {
                          finding.summary
                        }
                      </p>
                    </div>
                  )
                )}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-[#26384f] bg-[#102237] p-4 text-xs text-zinc-500">
              No additional finding was generated from the current bounded evidence.
            </div>
          )}

          <div className="mt-auto rounded-[9px] bg-[#302a32] p-3 text-[#f5d8bf]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em]">
              Evidence limit
            </div>

            <p className="mt-1 text-xs leading-5">
              {
                limitations[0] ??
                coverageState.detail
              }
            </p>
          </div>

          <div className="mt-4 border-t border-[#26384f] pt-3">
            <div className="text-[9px] tracking-[0.12em] text-zinc-600">
              {
                planState.name
              }{" "}
              WORKSPACE
            </div>

            <p className="mt-1 text-[9px] leading-4 text-zinc-600">
              {
                planState.description
              }
            </p>

            {activeCapabilities.length >
              0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {activeCapabilities.map(
                  item => (
                    <span
                      key={
                        item[0]
                      }
                      className="rounded-md border border-[#26384f] bg-black/20 px-2 py-1 text-[8px] text-zinc-500"
                    >
                      {
                        item[1]
                      }
                    </span>
                  )
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      <section
        id="analysis-activity"
        className="mt-3 grid scroll-mt-24 gap-3 lg:grid-cols-2"
      >
        <div className="rounded-[14px] border border-[#26384f] bg-gradient-to-br from-[#13243a] to-[#101d30] p-[18px]">
          <h3 className="text-lg font-semibold text-[#edf5ff]">
            Observed evidence flows
          </h3>

          <p className="mt-1 text-xs text-[#94a8bf]">
            Evidence-backed connections collected in this analysis.
          </p>

          {edges.length >
          0 ? (
            <div className="mt-4 space-y-2">
              {edges
                .slice(
                  0,
                  5
                )
                .map(
                  edge => (
                    <div
                      key={
                        edge.id
                      }
                      className="grid min-h-10 grid-cols-[minmax(100px,1fr)_minmax(70px,1.1fr)_70px] items-center gap-2 rounded-lg border border-[#26384f] bg-[#102237] px-3 py-2"
                    >
                      <span className="truncate text-[10px] text-[#bac9dc]">
                        {
                          edge.label
                        }
                      </span>

                      <span className="h-2 overflow-hidden rounded-full bg-[#274058]">
                        <i
                          className="block h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-400"
                          style={{
                            width:
                              `${
                                Math.max(
                                  8,
                                  Math.round(
                                    edge.evidenceCount /
                                    maxEvidence *
                                    100
                                  )
                                )
                              }%`,
                          }}
                        />
                      </span>

                      <span className="text-right text-[10px] font-semibold text-zinc-200">
                        {
                          edge.evidenceCount
                        }{" "}
                        evidence
                      </span>
                    </div>
                  )
                )}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-[#26384f] bg-[#102237] p-4 text-xs text-zinc-500">
              No supported relationship flow was observed in this evidence window.
            </div>
          )}

          <div className="mt-4 border-t border-[#26384f] pt-3 text-[10px] text-zinc-600">
            Connection ≠ common ownership
          </div>
        </div>

        <div className="rounded-[14px] border border-[#26384f] bg-gradient-to-br from-[#13243a] to-[#101d30] p-[18px]">
          <h3 className="text-lg font-semibold text-[#edf5ff]">
            Evidence timeline
          </h3>

          <p className="mt-1 text-xs text-[#94a8bf]">
            Recent activity already collected by AYZO.
          </p>

          {recentEvents.length >
          0 ? (
            <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-3">
              {recentEvents.map(
                event => {
                  const active =
                    evidenceSelection
                      ?.evidenceRefs
                      .some(
                        ref =>
                          ref.toLowerCase() ===
                          event.transactionHash.toLowerCase()
                      ) ??
                    false;

                  return (
                    <div
                      key={
                        event.id
                      }
                      className={`min-w-0 rounded-[10px] border p-3 ${
                        active
                          ? "border-cyan-500/40 bg-[#173a53]"
                          : "border-[#26384f] bg-[#102237]"
                      }`}
                    >
                      <time className="text-[9px] text-[#94a8bf]">
                        {
                          eventTime(
                            event.timestamp
                          )
                        }
                      </time>

                      <strong className="mt-1 block truncate text-[10px] text-zinc-200">
                        {
                          eventTitle(
                            event
                          )
                        }
                      </strong>

                      <span className="mt-1 block truncate font-mono text-[9px] text-zinc-500">
                        {
                          short(
                            event.transactionHash
                          )
                        }
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-[#26384f] bg-[#102237] p-4 text-xs text-zinc-500">
              No supported timeline activity was collected for this evidence window.
            </div>
          )}

          <div className="mt-4 border-t border-[#26384f] pt-3 text-[10px] text-zinc-600">
            Only the bounded evidence collected by AYZO is shown.
          </div>
        </div>
      </section>

      <p className="mt-4 text-[10px] leading-5 text-zinc-600">
        AYZO presents observed on-chain evidence. Connections do not establish identity,
        common ownership, intent or control.
      </p>
    </section>
  );
}
