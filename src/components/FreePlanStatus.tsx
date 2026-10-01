"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  NETWORKS,
} from "@/lib/networks/registry";

import type {
  LiveAnalysisNetworkId,
} from "@/lib/networks/addressSelection";

import {
  PLANS,
} from "@/lib/plans/registry";

type PlanStatus = {
  ok:
    true;

  plan:
    | "free"
    | "pro"
    | "advanced";

  available:
    boolean;

  limit:
    number;

  remaining:
    number | null;

  resetAt:
    number | null;

  network:
    string | null;

  networkLimit:
    number | null;

  networkRemaining:
    number | null;

  networkResetAt:
    number | null;
};

function quotaCount(
  plan:
    "free" |
    "pro" |
    "advanced"
) {
  const quota =
    PLANS[
      plan
    ].analysisQuota;

  return quota.kind ===
    "fixed"
    ? quota.count
    : 0;
}

function freeNetworkLimit() {
  const quota =
    PLANS.free
      .analysisQuota;

  return quota.kind ===
    "fixed"
    ? quota
        .perNetworkCount
    : null;
}

export default function FreePlanStatus({
  network,
}: {
  network:
    LiveAnalysisNetworkId;
}) {
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
              `/api/free/status?network=${encodeURIComponent(
                network
              )}`,
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
           * Product remains usable when
           * quota status cannot be shown.
           */
        }
      },
      [
        network,
      ]
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

  const fallbackLimit =
    quotaCount(
      plan
    );

  const perNetworkLimit =
    status?.networkLimit ??
    freeNetworkLimit();

  const totalExhausted =
    status?.remaining ===
    0;

  const networkExhausted =
    plan ===
      "free" &&
    status
      ?.networkRemaining ===
      0;

  const exhausted =
    totalExhausted ||
    networkExhausted;

  const planLabel =
    plan ===
      "advanced"
      ? "ADVANCED PLAN"
      : plan ===
          "pro"
        ? "PRO PLAN"
        : "FREE PLAN";

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
                "pro" ||
              plan ===
                "advanced"
              ? "border-violet-400/30 bg-violet-500/10 text-violet-200"
              : "border-violet-500/20 bg-violet-500/5 text-violet-300"
        }`}
      >
        {planLabel}
      </span>

      <span>
        {status ===
          null ||
        status.remaining ===
          null
          ? `${fallbackLimit} analyses per 24 hours`
          : `${status.remaining} of ${status.limit} total analyses remaining`}
      </span>

      <span className="text-zinc-700">
        ·
      </span>

      <span>
        {plan ===
          "free"
          ? status
              ?.networkRemaining !==
              null &&
            status
              ?.networkRemaining !==
              undefined &&
            perNetworkLimit !==
              null
            ? `${NETWORKS[network].name}: ${status.networkRemaining} of ${perNetworkLimit} same-network analyses remaining`
            : `Max ${perNetworkLimit ?? 2} analyses on the same network per 24 hours`
          : "No per-network analysis limit"}
      </span>
    </div>
  );
}
