"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import InteractiveEvidenceGraph, {
  type InteractiveEvidenceSelection,
} from "@/components/InteractiveEvidenceGraph";

import AnalysisWorkspaceActivity from "@/components/AnalysisWorkspaceActivity";

import styles from "@/components/AnalysisWorkspaceConcept.module.css";


import {
  planHasFeature,
} from "@/lib/plans/registry";

import type {
  PlanId,
} from "@/lib/plans/types";

import type {
  VisualEvidenceGraph as VisualEvidenceGraphData,
} from "@/lib/intelligence/visualEvidenceGraph";

import type {
  ActivityTimeline as ActivityTimelineData,
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

  const planState =
    planCopy(
      plan
    );

  const visualEvidenceAccess =
    plan
      ? planHasFeature(
          plan,
          "visualEvidenceGraph"
        )
      : null;

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

  const timelineEvents =
    timeline?.events ??
    [];

  const timelineUnavailable =
    !timeline ||
    timeline.status ===
      "unavailable";

  const incomingEvents =
    timelineEvents.filter(
      event =>
        event.direction ===
        "incoming"
    );

  const outgoingEvents =
    timelineEvents.filter(
      event =>
        event.direction ===
        "outgoing"
    );

  const shareText =
    `I investigated ${networkLabel} on-chain evidence with @IOAYZO.\n\nExplore AYZO → https://app.ayzo.io`;

  return (
    <section
      id="analysis-overview"
      data-evidence-access={
        visualEvidenceAccess ===
        null
          ? "unknown"
          : visualEvidenceAccess
            ? "enabled"
            : "restricted"
      }
      className={`${styles.workspace} scroll-mt-24`}
    >
      <header className={styles.top}>
        <div>
          <div className={styles.eyebrow}>
            AYZO · ON-CHAIN INTELLIGENCE
          </div>

          <h2 className={styles.title}>
            Follow the evidence.
          </h2>

          <p className={styles.sub}>
            See the finding first, then inspect
            addresses, observed connections and
            transaction evidence behind it.
          </p>
        </div>

        <div className={styles.topActions}>
          <span
            className={styles.chip}
          >
            {planState.name}
          </span>

          <span className={styles.chip}>
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
            className={styles.softButton}
          >
            Share evidence ↗
          </a>
        </div>
      </header>

      <div className={styles.subjectBar}>
        <span className={styles.subjectSymbol}>
          ⌕
        </span>

        <div className={styles.subjectText}>
          <strong className="truncate font-mono">
            Analyzed subject · {short(subject)}
          </strong>

          <small>
            {timelineUnavailable
              ? "Current transaction evidence window is unavailable."
              : `${timelineEvents.length} recent evidence record(s) in the current bounded window.`}
          </small>
        </div>

        <span className={styles.subjectTag}>
          EVIDENCE AVAILABLE
        </span>
      </div>

      <div className={styles.metrics}>
        {[
          [
            "Observed incoming",
            timelineUnavailable
              ? "—"
              : String(
                  incomingEvents.length
                ),
            timelineUnavailable
              ? "Incoming activity evidence unavailable"
              : `${incomingEvents.length} incoming evidence item(s)`,
            "bg-cyan-300",
          ],
          [
            "Observed outgoing",
            timelineUnavailable
              ? "—"
              : String(
                  outgoingEvents.length
                ),
            timelineUnavailable
              ? "Outgoing activity evidence unavailable"
              : `${outgoingEvents.length} outgoing evidence item(s)`,
            "bg-violet-300",
          ],
          [
            "Transaction evidence",
            timelineUnavailable
              ? "—"
              : String(
                  timelineEvents.length
                ),
            timelineUnavailable
              ? "Transaction evidence unavailable"
              : `${timelineEvents.length} bounded activity record(s)`,
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
              className={styles.metric}
            >
              <span
                className={`${styles.metricDot} ${dot}`}
              />

              <div className={styles.metricLabel}>
                {label}
              </div>

              <div
                className={`${styles.metricValue} ${
                  label ===
                  "Data coverage"
                    ? `${styles.metricValueCoverage} ${coverageState.className}`
                    : ""
                }`}
              >
                {value}
              </div>

              <div className={styles.metricDetail}>
                {detail}
              </div>
            </div>
          )
        )}
      </div>

      <div className={styles.sectionGrid}>
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
          className={`${styles.card} ${styles.panel} ${styles.brief}`}
        >
          <div>
            <h3 className={styles.briefTitle}>
              AYZO Evidence Brief
            </h3>

            <p className={styles.briefSub}>
              Observation and limitation stay together.
            </p>
          </div>

          <div className={styles.mainFinding}>
            <strong>
              {
                observations[0]?.title ??
                "No additional evidence-backed finding"
              }
            </strong>

            <p>
              {
                observations[0]?.summary ??
                "The current bounded evidence window did not produce an additional finding."
              }
            </p>
          </div>

          <div className={styles.detailHead}>
            <strong>
              Selected item
            </strong>

            <span>
              {
                evidenceSelection
                  ? evidenceSelection.subtitle
                  : "General overview"
              }
            </span>
          </div>

          <div className={styles.detailTitle}>
            {
              evidenceSelection
                ? evidenceSelection.title
                : "Evidence overview"
            }
          </div>

          <p className={styles.detailDescription}>
            {
              evidenceSelection?.detail ??
              "Select a node, connection or transaction to inspect the evidence collected behind it."
            }
          </p>

          <div className={styles.detailGrid}>
            <div>
              <span>
                Incoming / outgoing
              </span>

              <b>
                {
                  timelineUnavailable
                    ? "— / —"
                    : `${incomingEvents.length} / ${outgoingEvents.length}`
                }
              </b>
            </div>

            <div>
              <span>
                {
                  evidenceSelection
                    ? "Evidence / tx refs"
                    : "Observed records"
                }
              </span>

              <b>
                {
                  evidenceSelection
                    ? `${evidenceSelection.evidenceCount} / ${evidenceSelection.evidenceRefs.length}`
                    : timelineUnavailable
                      ? "—"
                      : timelineEvents.length
                }
              </b>
            </div>
          </div>

          {evidenceSelection && (
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
              className={styles.softButton}
            >
              Return to general overview
            </button>
          )}

          <div className={styles.limit}>
            <strong>
              Evidence limit
            </strong>

            <span>
              {
                limitations[0] ??
                coverageState.detail
              }
            </span>
          </div>
        </aside>
      </div>

      <AnalysisWorkspaceActivity
        timeline={timeline}
        subject={subject}
        selectedEvidenceRefs={
          evidenceSelection?.evidenceRefs ??
          []
        }
      />

      <p className={styles.disclaimer}>
        AYZO presents observed on-chain evidence. Connections do not establish identity,
        common ownership, intent or control.
      </p>
    </section>
  );
}
