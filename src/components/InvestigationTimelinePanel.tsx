"use client";

import {
  useEffect,
  useState,
} from "react";

type SubjectType =
  | "wallet"
  | "token"
  | "transaction"
  | "entity"
  | "protocol";

type TimelineChange = {
  category:
    | "metric"
    | "module"
    | "finding";

  key: string;
  label: string;

  direction:
    | "increased"
    | "decreased"
    | "changed"
    | "added"
    | "removed";
};

type TimelineEntry = {
  id: string;

  kind:
    | "saved_analysis"
    | "current_analysis";

  capturedAt:
    string;

  savedAt:
    string | null;

  coverage:
    string | null;

  changeCount:
    number;

  hasChanges:
    boolean;

  changes:
    TimelineChange[];
};

type InvestigationTimeline = {
  version: 1;

  status:
    | "ready"
    | "no-history";

  savedSnapshotCount:
    number;

  entries:
    TimelineEntry[];

  limitation:
    string;
};

type ApiResponse = {
  ok?: boolean;

  timeline?:
    InvestigationTimeline;

  code?: string;

  error?: string;
};

type State =
  | "loading"
  | "locked"
  | "no-history"
  | "ready"
  | "error";

type Props = {
  network:
    string;

  subjectType:
    SubjectType;

  subjectValue:
    string;

  currentSnapshot:
    unknown;
};

function formatDate(
  value:
    string | null
) {
  if (!value) {
    return "Time unavailable";
  }

  const date =
    new Date(
      value
    );

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
      year:
        "numeric",

      month:
        "short",

      day:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}

function directionLabel(
  direction:
    TimelineChange[
      "direction"
    ]
) {
  switch (direction) {
    case "increased":
      return "INCREASED";

    case "decreased":
      return "DECREASED";

    case "changed":
      return "CHANGED";

    case "added":
      return "ADDED";

    case "removed":
      return "REMOVED";
  }
}

function coverageLabel(
  value:
    string | null
) {
  if (!value) {
    return null;
  }

  return value
    .replaceAll(
      "_",
      " "
    )
    .toUpperCase();
}

export default function InvestigationTimelinePanel({
  network,
  subjectType,
  subjectValue,
  currentSnapshot,
}: Props) {
  const [
    state,
    setState,
  ] =
    useState<State>(
      "loading"
    );

  const [
    timeline,
    setTimeline,
  ] =
    useState<
      InvestigationTimeline | null
    >(null);

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      setState(
        "loading"
      );

      setTimeline(
        null
      );

      try {
        const response =
          await fetch(
            "/api/account/investigation-timeline",
            {
              method:
                "POST",

              credentials:
                "same-origin",

              cache:
                "no-store",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  network,
                  subjectType,
                  subjectValue,
                  currentSnapshot,
                }),
            }
          );

        const body =
          await response
            .json()
            .catch(
              () => null
            ) as ApiResponse | null;

        if (cancelled) {
          return;
        }

        if (
          response.status ===
            403 &&
          body?.code ===
            "PLAN_REQUIRED"
        ) {
          setState(
            "locked"
          );

          return;
        }

        if (
          response.status ===
          401
        ) {
          setState(
            "locked"
          );

          return;
        }

        if (
          !response.ok ||
          !body?.timeline
        ) {
          setState(
            "error"
          );

          return;
        }

        setTimeline(
          body.timeline
        );

        setState(
          body.timeline.status ===
            "no-history"
            ? "no-history"
            : "ready"
        );
      } catch {
        if (
          !cancelled
        ) {
          setState(
            "error"
          );
        }
      }
    }

    load();

    return () => {
      cancelled =
        true;
    };
  }, [
    network,
    subjectType,
    subjectValue,
    currentSnapshot,
  ]);

  if (
    state ===
    "loading"
  ) {
    return (
      <div className="mt-5 rounded-2xl border border-zinc-900 bg-black/20 p-4">
        <div className="text-[10px] font-medium tracking-[0.14em] text-violet-400">
          INVESTIGATION TIMELINE
        </div>

        <p className="mt-2 text-xs text-zinc-600">
          Building your saved research chronology…
        </p>
      </div>
    );
  }

  if (
    state ===
    "locked"
  ) {
    return (
      <div className="mt-5 rounded-2xl border border-zinc-900 bg-black/20 p-4">
        <div className="text-[10px] font-medium tracking-[0.14em] text-violet-400">
          PRO · INVESTIGATION TIMELINE
        </div>

        <div className="mt-2 text-sm font-medium text-zinc-300">
          Follow an investigation across saved analyses
        </div>

        <p className="mt-2 text-xs leading-5 text-zinc-600">
          Investigation Timeline is available with AYZO Pro and Advanced.
        </p>
      </div>
    );
  }

  if (
    state ===
    "error"
  ) {
    return null;
  }

  if (
    state ===
      "no-history" ||
    !timeline
  ) {
    return (
      <div className="mt-5 rounded-2xl border border-zinc-900 bg-black/20 p-4">
        <div className="text-[10px] font-medium tracking-[0.14em] text-violet-400">
          PRO · INVESTIGATION TIMELINE
        </div>

        <div className="mt-2 text-sm font-medium text-zinc-300">
          No saved investigation history yet
        </div>

        <p className="mt-2 text-xs leading-5 text-zinc-600">
          Save this analysis to establish the first research milestone.
          Future saved analyses can then be compared chronologically.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-violet-500/20 bg-black/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-medium tracking-[0.14em] text-violet-400">
            PRO · INVESTIGATION TIMELINE
          </div>

          <div className="mt-2 text-sm font-medium text-zinc-200">
            Research chronology
          </div>

          <p className="mt-1 text-[10px] leading-5 text-zinc-600">
            Saved AYZO analyses for this exact subject, newest first.
          </p>
        </div>

        <div className="rounded-full border border-zinc-800 px-3 py-1 text-[10px] text-zinc-500">
          {timeline.savedSnapshotCount}
          {" "}
          {timeline.savedSnapshotCount ===
          1
            ? "SAVED SNAPSHOT"
            : "SAVED SNAPSHOTS"}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {timeline.entries.map(
          (
            entry,
            index
          ) => {
            const coverage =
              coverageLabel(
                entry.coverage
              );

            return (
              <article
                key={
                  entry.id
                }
                className="relative rounded-xl border border-zinc-900 bg-zinc-950/60 p-4"
              >
                {index <
                  timeline.entries.length -
                    1 && (
                  <div className="absolute -bottom-3 left-[21px] h-3 w-px bg-zinc-800" />
                )}

                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs ${
                      entry.kind ===
                      "current_analysis"
                        ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-500"
                    }`}
                  >
                    {entry.kind ===
                    "current_analysis"
                      ? "NOW"
                      : "✓"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-medium text-zinc-300">
                          {entry.kind ===
                          "current_analysis"
                            ? "Current analysis"
                            : "Saved analysis"}
                        </div>

                        <div className="mt-1 text-[10px] text-zinc-600">
                          {formatDate(
                            entry.capturedAt
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {coverage && (
                          <span className="rounded-full border border-zinc-800 px-2 py-1 text-[8px] tracking-[0.1em] text-zinc-600">
                            {coverage}
                          </span>
                        )}

                        <span className="rounded-full border border-zinc-800 px-2 py-1 text-[8px] tracking-[0.1em] text-zinc-500">
                          {entry.changeCount}
                          {" "}
                          {entry.changeCount ===
                          1
                            ? "CHANGE"
                            : "CHANGES"}
                        </span>
                      </div>
                    </div>

                    {entry.changes.length >
                    0 ? (
                      <div className="mt-3 space-y-1.5">
                        {entry.changes
                          .slice(
                            0,
                            3
                          )
                          .map(
                            (
                              change,
                              changeIndex
                            ) => (
                              <div
                                key={`${change.category}-${change.key}-${changeIndex}`}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-900 bg-black/20 px-3 py-2"
                              >
                                <span className="text-[10px] text-zinc-500">
                                  {
                                    change.label
                                  }
                                </span>

                                <span className="text-[8px] font-medium tracking-[0.1em] text-violet-400">
                                  {directionLabel(
                                    change.direction
                                  )}
                                </span>
                              </div>
                            )
                          )}

                        {entry.changeCount >
                          3 && (
                          <div className="px-1 pt-1 text-[9px] text-zinc-700">
                            +
                            {entry.changeCount -
                              3}
                            {" "}
                            additional tracked changes
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 text-[10px] leading-5 text-zinc-600">
                        {entry.kind ===
                          "saved_analysis"
                          ? "Baseline or no tracked evidence change from the previous saved analysis."
                          : "No tracked evidence change from the latest saved analysis."}
                      </div>
                    )}

                    {entry.savedAt && (
                      <div className="mt-3 text-[9px] text-zinc-700">
                        Saved{" "}
                        {formatDate(
                          entry.savedAt
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          }
        )}
      </div>

      <p className="mt-4 border-t border-zinc-900 pt-4 text-[9px] leading-5 text-zinc-700">
        {timeline.limitation}
      </p>
    </div>
  );
}
