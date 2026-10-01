"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import PlanCheckoutButton from "@/components/billing/PlanCheckoutButton";

import {
  PLANS,
} from "@/lib/plans/registry";

import type {
  PlanId,
} from "@/lib/plans/types";

type QuotaStatus = {
  ok: true;
  plan: PlanId;
  available: boolean;
  limit: number;
  remaining: number | null;
  resetAt: number | null;
};

function quota(
  plan: PlanId
) {
  const value =
    PLANS[
      plan
    ].analysisQuota;

  return value.kind ===
    "fixed"
    ? value.count
    : null;
}

function resetLabel(
  value: number | null
) {
  if (
    value === null
  ) {
    return null;
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
    return null;
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      month:
        "short",
      day:
        "numeric",
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
  ).format(
    date
  );
}

export default function AnalysisLimitCard() {
  const [
    status,
    setStatus,
  ] =
    useState<
      QuotaStatus |
      null
    >(null);

  const load =
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

          if (
            !response.ok
          ) {
            return;
          }

          const body =
            await response
              .json() as
              QuotaStatus;

          if (
            body.ok
          ) {
            setStatus(
              body
            );
          }
        } catch {
          return;
        }
      },
      []
    );

  useEffect(
    () => {
      const initialLoad =
        window.setTimeout(
          () => {
            void load();
          },
          0
        );

      return () => {
        window.clearTimeout(
          initialLoad
        );
      };
    },
    [
      load,
    ]
  );

  const plan =
    status?.plan ??
    "free";

  const reset =
    resetLabel(
      status?.resetAt ??
      null
    );

  const freeQuota =
    quota(
      "free"
    );

  const proQuota =
    quota(
      "pro"
    );

  const advancedQuota =
    quota(
      "advanced"
    );

  const isFree =
    plan ===
    "free";

  const isPro =
    plan ===
    "pro";

  const isAdvanced =
    plan ===
    "advanced";

  return (
    <div
      className={`mt-6 overflow-hidden rounded-3xl border text-left ${
        isFree
          ? "border-cyan-500/20 bg-gradient-to-b from-cyan-500/[0.08] to-zinc-950/80"
          : isPro
            ? "border-violet-500/25 bg-gradient-to-b from-violet-500/[0.10] to-zinc-950/80"
            : "border-purple-500/30 bg-gradient-to-b from-purple-500/[0.12] via-violet-500/[0.06] to-zinc-950/80"
      }`}
    >
      <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div
              className={`text-xs font-medium tracking-[0.18em] ${
                isFree
                  ? "text-cyan-300"
                  : isPro
                    ? "text-violet-300"
                    : "text-purple-300"
              }`}
            >
              {isFree
                ? "FREE · CORE INTELLIGENCE"
                : isPro
                  ? "PRO · RESEARCH WORKSPACE"
                  : "ADVANCED · INVESTIGATION WORKSPACE"}
            </div>

            <h3 className="mt-2 text-2xl font-semibold text-zinc-100">
              Analysis limit reached
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              {isFree &&
                `AYZO Free includes ${freeQuota ?? "the current"} total analyses per rolling 24-hour window, with a maximum of ${PLANS.free.analysisQuota.kind === "fixed" ? PLANS.free.analysisQuota.perNetworkCount ?? 2 : 2} analyses on the same network. If total analyses remain, you can continue with another supported network.`}

              {isPro &&
                `You have used the ${proQuota ?? "current"} analyses available to AYZO Pro in the current rolling 24-hour window.`}

              {isAdvanced &&
                `You have used the ${advancedQuota ?? "current"} analyses available to AYZO Advanced in the current rolling 24-hour window.`}
            </p>

            {reset && (
              <p className="mt-2 text-xs text-zinc-600">
                Current window resets {reset}.
              </p>
            )}
          </div>

          <span
            className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-wide ${
              isFree
                ? "border-cyan-500/20 bg-cyan-500/5 text-cyan-300"
                : isPro
                  ? "border-violet-500/20 bg-violet-500/5 text-violet-300"
                  : "border-purple-500/20 bg-purple-500/5 text-purple-300"
            }`}
          >
            {isFree
              ? "AYZO FREE"
              : isPro
                ? "AYZO PRO"
                : "AYZO ADVANCED"}
          </span>
        </div>

        {isFree && (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-4">
                <div className="text-[9px] font-semibold tracking-[0.14em] text-violet-300">
                  PRO · RESEARCH WORKSPACE
                </div>

                <div className="mt-2 text-lg font-semibold text-white">
                  {proQuota ?? "—"} analyses / 24h
                </div>

                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Adds monitoring, historical research, Ask AYZO, reporting and export capabilities. No per-network analysis limit.
                </p>
              </div>

              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-4">
                <div className="text-[9px] font-semibold tracking-[0.14em] text-purple-300">
                  ADVANCED · INVESTIGATION WORKSPACE
                </div>

                <div className="mt-2 text-lg font-semibold text-white">
                  {advancedQuota ?? "—"} analyses / 24h
                </div>

                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Adds structured investigation, automation, API and advanced account workflows. No per-network analysis limit.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <PlanCheckoutButton
                plan="pro"
                interval="monthly"
                label={`Start Pro · $${PLANS.pro.monthlyPriceUsd?.toFixed(
                  0
                )}/mo`}
              />

              <PlanCheckoutButton
                plan="advanced"
                interval="monthly"
                variant="secondary"
                label={`Start Advanced · $${PLANS.advanced.monthlyPriceUsd?.toFixed(
                  0
                )}/mo`}
              />
            </div>
          </>
        )}

        {isPro && (
          <>
            <div className="mt-6 rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-5">
              <div className="text-[9px] font-semibold tracking-[0.14em] text-purple-300">
                ADVANCED · INVESTIGATION WORKSPACE
              </div>

              <div className="mt-2 text-lg font-semibold text-white">
                {advancedQuota ?? "—"} analyses / 24h
              </div>

              <p className="mt-2 max-w-xl text-xs leading-5 text-zinc-500">
                Advanced includes every live Pro capability plus Cases, Evidence Locker, Compare Investigations, Batch Analysis, API Access and other investigation workflows. No per-network analysis limit.
              </p>
            </div>

            <div className="mt-5">
              <PlanCheckoutButton
                plan="advanced"
                interval="monthly"
                label={`Upgrade to Advanced · $${PLANS.advanced.monthlyPriceUsd?.toFixed(
                  0
                )}/mo`}
              />
            </div>
          </>
        )}

        {isAdvanced && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/25 p-5">
            <div className="text-sm font-medium text-zinc-200">
              Your current plan is already AYZO&apos;s deepest individual investigation tier.
            </div>

            <p className="mt-2 text-xs leading-5 text-zinc-500">
              No higher individual plan is presented here. Your current rolling 24-hour allowance will become available again as the window resets.
            </p>

            <Link
              href="/account"
              className="mt-4 inline-flex rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
            >
              Open Account
            </Link>
          </div>
        )}

        <p className="mt-4 text-[10px] leading-5 text-zinc-600">
          Plan limits and capabilities are derived from AYZO&apos;s canonical plan registry. Network-specific evidence remains subject to supported network coverage.
        </p>
      </div>
    </div>
  );
}
