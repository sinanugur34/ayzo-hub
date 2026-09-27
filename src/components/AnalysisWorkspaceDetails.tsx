"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import type {
  PlanId,
} from "@/lib/plans/types";

type QuotaStatus = {
  ok: true;
  plan: PlanId;
};

function planViewCopy(
  plan:
    PlanId | null
) {
  switch (plan) {
    case "free":
      return {
        label:
          "FREE · CORE EVIDENCE",

        title:
          "Core evidence view",

        description:
          "Key evidence stays simple first. Full technical modules remain available on demand.",

        className:
          "border-cyan-500/20 bg-cyan-500/[0.06] text-cyan-300",
      };

    case "pro":
      return {
        label:
          "PRO · RESEARCH",

        title:
          "Research evidence view",

        description:
          "Research signals are summarized first while the complete evidence stack remains available.",

        className:
          "border-violet-500/20 bg-violet-500/[0.06] text-violet-300",
      };

    case "advanced":
      return {
        label:
          "ADVANCED · INVESTIGATION",

        title:
          "Investigation evidence view",

        description:
          "Deep investigation evidence is organized into a compact overview with full drill-down preserved.",

        className:
          "border-purple-500/25 bg-purple-500/[0.07] text-purple-300",
      };

    default:
      return {
        label:
          "AYZO · EVIDENCE",

        title:
          "Evidence view",

        description:
          "Current analysis evidence is summarized first. Full technical detail remains available.",

        className:
          "border-zinc-700 bg-zinc-900 text-zinc-400",
      };
  }
}

export default function AnalysisWorkspaceDetails({
  children,
  summary = null,
}: {
  children:
    ReactNode;

  summary?:
    ReactNode;
}) {
  const detailsRef =
    useRef<HTMLDetailsElement>(
      null
    );

  const [
    plan,
    setPlan,
  ] =
    useState<
      PlanId | null
    >(null);

  useEffect(() => {
    let cancelled =
      false;

    async function loadPlan() {
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
          !response.ok ||
          cancelled
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
    }

    void loadPlan();

    return () => {
      cancelled =
        true;
    };
  }, []);

  function handleToggle() {
    const node =
      detailsRef.current;

    if (!node?.open) {
      return;
    }

    window.requestAnimationFrame(
      () => {
        node.scrollIntoView({
          behavior:
            "smooth",

          block:
            "start",
        });
      }
    );
  }

  const view =
    planViewCopy(
      plan
    );

  return (
    <details
      ref={detailsRef}
      onToggle={handleToggle}
      id="analysis-details"
      data-analysis-plan={
        plan ??
        "unknown"
      }
      className="group scroll-mt-24 overflow-hidden rounded-xl border border-[#26384f] bg-[#0b1727]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="text-[9px] font-semibold tracking-[0.15em] text-cyan-300">
            DETAILED EVIDENCE
          </div>

          <div className="hidden text-[11px] text-zinc-500 sm:block">
            Compact first · full evidence preserved
          </div>
        </div>

        <span className="text-base text-zinc-500 transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>

      <div className="space-y-4 border-t border-[#26384f] p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#26384f] bg-black/15 px-4 py-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-xs font-semibold text-zinc-200">
              {
                view.title
              }
            </div>

            <p className="mt-1 max-w-3xl text-[10px] leading-5 text-zinc-600">
              {
                view.description
              }
            </p>
          </div>

          <span
            className={`w-fit shrink-0 rounded-full border px-3 py-1.5 text-[8px] font-semibold tracking-[0.12em] ${view.className}`}
          >
            {
              view.label
            }
          </span>
        </div>

        {summary}

        <details
          data-full-evidence
          className="overflow-hidden rounded-2xl border border-[#26384f] bg-black/10"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-white/[0.02]">
            <div>
              <div className="text-[10px] font-semibold tracking-[0.12em] text-cyan-200">
                FULL EVIDENCE
              </div>

              <div className="mt-1 text-[10px] text-zinc-600">
                Every existing technical module, methodology and evidence
                detail. Nothing removed.
              </div>
            </div>

            <span className="text-base text-zinc-500">
              ›
            </span>
          </summary>

          <div className="space-y-5 border-t border-[#26384f] p-4 sm:p-5">
            {children}
          </div>
        </details>
      </div>
    </details>
  );
}
