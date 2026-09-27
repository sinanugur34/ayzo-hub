"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

type EvidenceChangeSummaryStatus =
  | "loading"
  | "locked"
  | "no-baseline"
  | "ready";

type EvidenceChangeSummary = {
  status:
    EvidenceChangeSummaryStatus;

  changeCount:
    number | null;

  trackingActive:
    boolean;
};

export default function AnalysisWorkspaceResearchTools({
  children,
}: {
  children:
    ReactNode;
}) {
  const detailsRef =
    useRef<HTMLDetailsElement>(
      null
    );

  const [
    evidenceChange,
    setEvidenceChange,
  ] =
    useState<
      EvidenceChangeSummary | null
    >(null);

  useEffect(() => {
    function handleEvidenceChangeSummary(
      event:
        Event
    ) {
      const detail =
        (
          event as CustomEvent<
            Partial<
              EvidenceChangeSummary
            >
          >
        ).detail;

      if (!detail) {
        return;
      }

      const status =
        detail.status;

      if (
        status !==
          "loading" &&
        status !==
          "locked" &&
        status !==
          "no-baseline" &&
        status !==
          "ready"
      ) {
        return;
      }

      const rawCount =
        detail.changeCount;

      const changeCount =
        typeof rawCount ===
          "number" &&
        Number.isInteger(
          rawCount
        ) &&
        rawCount >= 0
          ? rawCount
          : null;

      setEvidenceChange({
        status,

        changeCount:
          status ===
            "ready"
            ? changeCount
            : null,

        trackingActive:
          detail.trackingActive ===
            true,
      });
    }

    window.addEventListener(
      "ayzo:evidence-change-summary",
      handleEvidenceChangeSummary
    );

    return () => {
      window.removeEventListener(
        "ayzo:evidence-change-summary",
        handleEvidenceChangeSummary
      );
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

  let helper =
    "Save, monitor and continue";

  let helperClass =
    "text-zinc-500";

  if (
    evidenceChange?.status ===
    "locked"
  ) {
    helper =
      "Pro · Evidence Change";

    helperClass =
      "text-violet-300";
  }

  if (
    evidenceChange?.status ===
    "no-baseline"
  ) {
    helper =
      evidenceChange.trackingActive
        ? "Tracking automatically"
        : "Save baseline to track change";

    helperClass =
      evidenceChange.trackingActive
        ? "text-emerald-300"
        : "text-zinc-400";
  }

  if (
    evidenceChange?.status ===
      "ready" &&
    evidenceChange.changeCount !==
      null
  ) {
    helper =
      evidenceChange.changeCount ===
        0
        ? "No evidence change"
        : `${
            evidenceChange.changeCount
          } evidence ${
            evidenceChange.changeCount ===
              1
              ? "change"
              : "changes"
          }`;

    helperClass =
      evidenceChange.changeCount >
        0
        ? "text-violet-300"
        : "text-emerald-300";
  }

  return (
    <details
      ref={detailsRef}
      onToggle={handleToggle}
      id="analysis-tools"
      className="group scroll-mt-24 overflow-hidden rounded-xl border border-violet-500/15 bg-[#0b1727]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="text-[9px] font-semibold tracking-[0.15em] text-violet-300">
            RESEARCH TOOLS
          </div>

          <div
            data-evidence-change-summary={
              evidenceChange?.status ??
              "unknown"
            }
            className={`hidden text-[11px] sm:block ${helperClass}`}
          >
            {helper}
          </div>
        </div>

        <span className="text-base text-zinc-500 transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>

      <div className="border-t border-[#26384f] p-4 sm:p-5">
        {children}
      </div>
    </details>
  );
}
