"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type FreeStatus = {
  ok: true;
  plan: "free";
  available: boolean;
  limit: number;
  remaining: number | null;
  resetAt: number | null;
};

export default function FreePlanStatus() {
  const [status, setStatus] =
    useState<FreeStatus | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/free/status",
        {
          cache: "no-store",
          credentials: "same-origin",
        }
      );

      const data =
        (await response.json()) as FreeStatus;

      if (data.ok) {
        setStatus(data);
      }
    } catch {
      // The product remains usable if quota status
      // cannot be displayed temporarily.
    }
  }, []);

  useEffect(() => {
    loadStatus();

    const refresh = () => {
      loadStatus();
    };

    window.addEventListener(
      "ayzo:quota-updated",
      refresh
    );

    return () => {
      window.removeEventListener(
        "ayzo:quota-updated",
        refresh
      );
    };
  }, [loadStatus]);

  const exhausted =
    status?.remaining === 0;

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
            : "border-violet-500/20 bg-violet-500/5 text-violet-300"
        }`}
      >
        FREE PLAN
      </span>

      <span>
        {status?.remaining === null ||
        status === null
          ? "3 analyses per 24 hours"
          : `${status.remaining} of ${status.limit} analyses remaining`}
      </span>
    </div>
  );
}
