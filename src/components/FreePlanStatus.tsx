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

  return (
    <div
      className={`mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-left text-xs ${
        exhausted
          ? "text-amber-300"
          : "text-[#a8b5cc]"
      }`}
    >
      <span>
        <strong className="font-semibold text-[#f3f6fc]">
          {guest
            ? "Guest"
            : plan ===
                "advanced"
              ? "Advanced"
              : plan ===
                  "pro"
                ? "Pro"
                : "Free"}
        </strong>

        {" · "}

        {status.remaining ===
          null
          ? `${fallbackLimit} analyses / 24h`
          : `${status.remaining} of ${status.limit} analyses remaining`}
      </span>

      <span>
        {guest
          ? `Free account · ${quotaCount(
              "free"
            )} analyses / 24h`
          : freeAccount
            ? status.networkRemaining !==
                null &&
              perNetworkLimit !==
                null
              ? `${NETWORKS[network].name}: ${status.networkRemaining} of ${perNetworkLimit} same-network analyses remaining`
              : `Max ${perNetworkLimit ?? 2} per network / 24h`
            : "No per-network analysis limit"}
      </span>

      {guest && (
        <Link
          href="/login?mode=signup"
          className="inline-flex min-h-11 items-center font-semibold text-[#a8fcdb] transition hover:text-white"
        >
          Create Free Account →
        </Link>
      )}

      <Link
        href="#ayzo-plans-access-trigger"
        className="inline-flex min-h-11 items-center font-semibold text-[#a8fcdb] transition hover:text-white"
      >
        View plans ↗
      </Link>
    </div>
  );
}
