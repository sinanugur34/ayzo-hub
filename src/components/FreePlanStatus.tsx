"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type PlanStatus = {
  ok: true;

  plan:
    | "free"
    | "pro";

  available:
    boolean;

  limit:
    number;

  remaining:
    number | null;

  resetAt:
    number | null;
};

export default function FreePlanStatus() {
  const [
    status,
    setStatus,
  ] =
    useState<
      PlanStatus |
      null
    >(
      null
    );

  const loadStatus =
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

          const data =
            (
              await response.json()
            ) as PlanStatus;

          if (
            data.ok
          ) {
            setStatus(
              data
            );
          }
        } catch {
          /*
           * Product remains usable
           * when quota status cannot
           * be displayed.
           */
        }
      },
      []
    );

  useEffect(() => {
    const initialLoad =
      window.setTimeout(
        () => {
          void loadStatus();
        },
        0
      );

    const refresh =
      () => {
        void loadStatus();
      };

    window.addEventListener(
      "ayzo:quota-updated",
      refresh
    );

    return () => {
      window.clearTimeout(
        initialLoad
      );

      window.removeEventListener(
        "ayzo:quota-updated",
        refresh
      );
    };
  }, [
    loadStatus,
  ]);

  const plan =
    status?.plan ??
    "free";

  const exhausted =
    status?.remaining ===
    0;

  const fallbackLimit =
    plan ===
    "pro"
      ? 30
      : 3;

  return (
    <div
      className={`mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs ${
        exhausted
          ? "text-amber-300"
          : "text-zinc-500"
      }`}
    >
      <span
        className={`rounded-full border px-2.5 py-1 text-[9px] font-medium tracking-[0.14em] ${
          exhausted
            ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
            : plan ===
                "pro"
              ? "border-violet-400/30 bg-violet-500/10 text-violet-200"
              : "border-violet-500/20 bg-violet-500/5 text-violet-300"
        }`}
      >
        {plan ===
        "pro"
          ? "PRO PLAN"
          : "FREE PLAN"}
      </span>

      <span>
        {status ===
          null ||
        status.remaining ===
          null
          ? `${fallbackLimit} analyses per 24 hours`
          : `${status.remaining} of ${status.limit} analyses remaining`}
      </span>
    </div>
  );
}
