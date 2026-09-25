"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type AccountQuotaStatus = {
  ok: true;
  plan: "free" | "pro" | "advanced";
  available: boolean;
  limit: number;
  remaining: number | null;
  resetAt: number | null;
};

function planLabel(plan: AccountQuotaStatus["plan"]) {
  if (plan === "advanced") return "Advanced";
  if (plan === "pro") return "Pro";
  return "Free";
}

function formatReset(resetAt: number | null) {
  if (resetAt === null) return null;

  const date = new Date(resetAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function AccountUsageCard() {
  const [status, setStatus] =
    useState<AccountQuotaStatus | null>(null);

  const [failed, setFailed] =
    useState(false);

  const loadStatus =
    useCallback(async () => {
      try {
        const response =
          await fetch("/api/free/status", {
            cache: "no-store",
            credentials: "same-origin",
          });

        if (!response.ok) {
          throw new Error(
            "Quota status request failed."
          );
        }

        const data =
          (await response.json()) as AccountQuotaStatus;

        if (data.ok) {
          setStatus(data);
          setFailed(false);
        }
      } catch {
        setFailed(true);
      }
    }, []);

  useEffect(() => {
    const initialLoad =
      window.setTimeout(
        () => {
          void loadStatus();
        },
        0
      );

    const refresh = () => {
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
  }, [loadStatus]);

  const remaining =
    status?.remaining ?? null;

  const used =
    status &&
    remaining !== null
      ? Math.max(
          0,
          status.limit - remaining
        )
      : null;

  const resetLabel =
    formatReset(
      status?.resetAt ?? null
    );

  const remainingPercent =
    status &&
    remaining !== null &&
    status.limit > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (remaining / status.limit) * 100
          )
        )
      : null;

  return (
    <div className="rounded-2xl border border-zinc-900 bg-black/30 p-5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
        Analysis usage
      </div>

      {status ? (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">
              {remaining === null
                ? `${status.limit} analyses / 24h`
                : `${remaining} of ${status.limit} remaining`}
            </span>

            <span className="rounded-full border border-violet-500/20 bg-violet-500/[0.06] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-violet-300">
              {planLabel(status.plan)}
            </span>
          </div>

          <div className="mt-2 text-[10px] leading-5 text-zinc-600">
            {used !== null
              ? `${used} used in the current 24-hour window.`
              : status.available
                ? "Usage details are temporarily unavailable."
                : "Live usage is temporarily unavailable."}

            {resetLabel
              ? ` Resets ${resetLabel}.`
              : ""}
          </div>

          {remainingPercent !== null && (
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-violet-400/70"
                style={{
                  width: `${remainingPercent}%`,
                }}
              />
            </div>
          )}
        </>
      ) : (
        <div className="mt-2 text-sm text-zinc-500">
          {failed
            ? "Usage status is temporarily unavailable."
            : "Loading usage…"}
        </div>
      )}
    </div>
  );
}
