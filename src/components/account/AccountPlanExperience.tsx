import {
  getPlan,
  planHasFeature,
  planHasRoadmapFeature,
} from "@/lib/plans/registry";

import type {
  FeatureId,
  PlanId,
} from "@/lib/plans/types";

const FEATURE_LABELS: Record<
  FeatureId,
  string
> = {
  basicVerification:
    "Basic Verification",
  basicHolderIntelligence:
    "Holder Intelligence",
  basicRelationships:
    "Observed Relationships",
  basicFunding:
    "Funding Evidence",
  evidenceSummary:
    "Evidence Summary",
  fundingProvenance:
    "Funding Provenance",
  developerHistory:
    "Developer History",
  walletGraph:
    "Wallet Graph",
  savedAnalyses:
    "Saved Analyses",
  watchlists:
    "Watchlists",
  historicalChanges:
    "Historical Changes",
  alerts:
    "Alerts",
  activityTimeline:
    "Activity Timeline",
  entityLabels:
    "Entity Labels",
  walletTrackRecord:
    "Wallet Track Record",
  walletProfiler:
    "Wallet Profiler",
  askAyzo:
    "Ask AYZO Investigator",
  visualEvidenceGraph:
    "Visual Evidence Graph",
  marketFlowIntelligence:
    "Market Flow Intelligence",
  investigationTimeline:
    "Investigation Timeline",
  batchAnalysis:
    "Batch Analysis",
  compareInvestigations:
    "Compare Investigations",
  cases:
    "Cases",
  evidenceLocker:
    "Evidence Locker",
  customLabelsNotes:
    "Custom Labels & Notes",
  advancedWatchlists:
    "Advanced Watchlists",
  customAlertRules:
    "Custom Alert Rules",
  advancedReports:
    "Advanced Reports",
  dataExport:
    "Data Export",
  apiAccess:
    "API Access",
  teamWorkspace:
    "Team Workspace",
  noCodeDashboards:
    "No-Code Dashboards",
  mobileApp:
    "AYZO Mobile App",
  priorityAnalysis:
    "Priority Analysis",
};

const PLAN_COPY: Record<
  PlanId,
  {
    eyebrow: string;
    title: string;
    description: string;
    liveFeatures:
      readonly FeatureId[];
  }
> = {
  free: {
    eyebrow:
      "FREE · CORE INTELLIGENCE",
    title:
      "Core Intelligence",
    description:
      "Evidence-first on-chain analysis with the core research surfaces needed to inspect, save and revisit observed evidence.",
    liveFeatures: [
      "evidenceSummary",
      "fundingProvenance",
      "walletGraph",
      "savedAnalyses",
      "watchlists",
      "activityTimeline",
      "walletTrackRecord",
      "visualEvidenceGraph",
    ],
  },

  pro: {
    eyebrow:
      "PRO · RESEARCH WORKSPACE",
    title:
      "Research Workspace",
    description:
      "Deeper research, monitoring and reporting capabilities built on top of AYZO Core Intelligence.",
    liveFeatures: [
      "alerts",
      "historicalChanges",
      "investigationTimeline",
      "entityLabels",
      "askAyzo",
      "marketFlowIntelligence",
      "advancedReports",
      "dataExport",
    ],
  },

  advanced: {
    eyebrow:
      "ADVANCED · INVESTIGATION WORKSPACE",
    title:
      "Investigation Workspace",
    description:
      "AYZO's deepest individual investigation workspace for structured research, automation, evidence organization and programmatic access.",
    liveFeatures: [
      "cases",
      "evidenceLocker",
      "compareInvestigations",
      "advancedWatchlists",
      "customAlertRules",
      "batchAnalysis",
      "customLabelsNotes",
      "apiAccess",
      "noCodeDashboards",
      "priorityAnalysis",
    ],
  },
};

const PLAN_STYLE: Record<
  PlanId,
  {
    border: string;
    background: string;
    eyebrow: string;
    badge: string;
    feature: string;
  }
> = {
  free: {
    border:
      "border-cyan-500/20",
    background:
      "bg-gradient-to-br from-cyan-500/[0.04] via-emerald-500/[0.015] to-transparent",
    eyebrow:
      "text-cyan-300",
    badge:
      "border-cyan-500/20 bg-cyan-500/5 text-cyan-300",
    feature:
      "border-cyan-500/10 bg-cyan-500/[0.025]",
  },

  pro: {
    border:
      "border-violet-400/25",
    background:
      "bg-gradient-to-br from-violet-500/[0.055] via-indigo-500/[0.025] to-transparent",
    eyebrow:
      "text-violet-300",
    badge:
      "border-violet-500/20 bg-violet-500/5 text-violet-300",
    feature:
      "border-violet-500/10 bg-violet-500/[0.025]",
  },

  advanced: {
    border:
      "border-purple-400/30",
    background:
      "bg-gradient-to-br from-purple-500/[0.075] via-violet-500/[0.04] to-cyan-500/[0.025]",
    eyebrow:
      "text-purple-300",
    badge:
      "border-purple-500/20 bg-purple-500/5 text-purple-300",
    feature:
      "border-purple-500/10 bg-purple-500/[0.025]",
  },
};

function quotaLabel(
  planId: PlanId
) {
  const plan =
    getPlan(
      planId
    );

  if (
    plan.analysisQuota.kind !==
    "fixed"
  ) {
    return "Usage configured separately";
  }

  return `${plan.analysisQuota.count} analyses / 24h`;
}

export default function AccountPlanExperience({
  planId,
}: {
  planId: PlanId;
}) {
  const plan =
    getPlan(
      planId
    );

  const copy =
    PLAN_COPY[
      planId
    ];

  const style =
    PLAN_STYLE[
      planId
    ];

  const liveFeatures =
    copy.liveFeatures.filter(
      feature =>
        planHasFeature(
          planId,
          feature
        )
    );

  const mobileRoadmap =
    planHasRoadmapFeature(
      planId,
      "mobileApp"
    );

  return (
    <section
      id="plan-experience"
      className={`mt-5 scroll-mt-24 rounded-3xl border p-6 sm:p-7 ${style.border} ${style.background}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <div
            className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${style.eyebrow}`}
          >
            {copy.eyebrow}
          </div>

          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-white">
            {copy.title}
          </h2>

          <p className="mt-2 text-xs leading-6 text-zinc-500">
            {copy.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${style.badge}`}
          >
            Current · {plan.name}
          </span>

          <span className="rounded-full border border-emerald-500/15 bg-emerald-500/[0.04] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
            Live
          </span>

          <span className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1 text-[9px] font-medium tracking-[0.08em] text-zinc-500">
            {quotaLabel(
              planId
            )}
          </span>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Included live capabilities
          </div>

          <div className="text-[9px] uppercase tracking-[0.12em] text-emerald-400/70">
            Live now
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {liveFeatures.map(
            feature => (
              <div
                key={
                  feature
                }
                className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2.5 ${style.feature}`}
              >
                <span
                  aria-hidden="true"
                  className="text-[10px] text-emerald-300"
                >
                  ●
                </span>

                <span className="text-[11px] font-medium leading-4 text-zinc-300">
                  {
                    FEATURE_LABELS[
                      feature
                    ]
                  }
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {mobileRoadmap && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-zinc-800 bg-black/20 px-4 py-3">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
              Roadmap
            </div>

            <div className="mt-1 text-xs font-medium text-zinc-300">
              {
                FEATURE_LABELS
                  .mobileApp
              }
            </div>
          </div>

          <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Roadmap
          </span>
        </div>
      )}

      <p className="mt-4 text-[10px] leading-5 text-zinc-600">
        Network-specific capabilities remain subject to supported network coverage and the evidence actually observed for the analyzed subject.
      </p>
    </section>
  );
}
