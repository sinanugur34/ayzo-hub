"use client";

import Link from "next/link";

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

import {
  GUEST_ANALYSIS_POLICY,
} from "@/lib/guestAnalysisPolicy";

type PlanStatus = {
  ok:
    true;

  authenticated:
    boolean;

  accessMode:
    "guest" |
    "account";

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
           * Quota display must never prevent
           * the analysis form from working.
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

  if (!status) {
    return (
      <div className="mt-4 text-center text-xs text-zinc-600">
        Checking analysis access…
      </div>
    );
  }

  const plan =
    status.plan;

  const guest =
    status.accessMode ===
      "guest";

  const freeAccount =
    !guest &&
    plan ===
      "free";

  const fallbackLimit =
    guest
      ? GUEST_ANALYSIS_POLICY.limit
      : quotaCount(
          plan
        );

  const perNetworkLimit =
    status.networkLimit ??
    freeNetworkLimit();

  const totalExhausted =
    status.remaining ===
      0;

  const networkExhausted =
    freeAccount &&
    status.networkRemaining ===
      0;

  const exhausted =
    totalExhausted ||
    networkExhausted;

  const planLabel =
    guest
      ? "GUEST ACCESS"
      : plan ===
          "advanced"
        ? "ADVANCED PLAN"
        : plan ===
            "pro"
          ? "PRO PLAN"
          : "FREE ACCOUNT";

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
            : guest ||
              plan ===
                "free"
              ? "border-cyan-500/20 bg-cyan-500/5 text-cyan-300"
              : "border-violet-400/30 bg-violet-500/10 text-violet-200"
        }`}
      >
        {planLabel}
      </span>

      <span>
        {status.remaining ===
          null
          ? `${fallbackLimit} analyses per 24 hours`
          : guest
            ? `${status.remaining} of ${status.limit} guest analysis remaining`
            : `${status.remaining} of ${status.limit} total analyses remaining`}
      </span>

      <span className="text-zinc-700">
        ·
      </span>

      {guest ? (
        <span>
          Create a free account for{" "}
          <strong className="font-medium text-cyan-300">
            {quotaCount(
              "free"
            )} analyses / 24h
          </strong>
          {" · "}
          <Link
            href="/login?mode=signup"
            className="font-medium text-violet-300 transition hover:text-violet-200"
          >
            Create Free Account
          </Link>
        </span>
      ) : (
        <span>
          {freeAccount
            ? status.networkRemaining !==
                null &&
              perNetworkLimit !==
                null
              ? `${NETWORKS[network].name}: ${status.networkRemaining} of ${perNetworkLimit} same-network analyses remaining`
              : `Max ${perNetworkLimit ?? 2} analyses on the same network per 24 hours`
            : "No per-network analysis limit"}
        </span>
      )}
    </div>
  );
}
