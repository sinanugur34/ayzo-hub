"use client";

import Link from "next/link";

import PlanCheckoutButton from "@/components/billing/PlanCheckoutButton";

import {
  NETWORKS,
} from "@/lib/networks/registry";

import {
  PLANS,
} from "@/lib/plans/registry";

import type {
  PlanId,
} from "@/lib/plans/types";

type BillingPeriod =
  | "monthly"
  | "annual";

const LIVE_NETWORK_COUNT =
  Object.values(
    NETWORKS
  ).filter(
    network =>
      network.status ===
      "live"
  ).length;

const PLAN_COPY = {
  free: {
    eyebrow:
      "START HERE",

    description:
      "Start an investigation, inspect the evidence and save your work.",

    tools: [
      "Funding & wallet relationships",
      "Visual evidence graph",
      "Saved analyses with an account",
      "Up to 2 analyses per network / 24h",
    ],
  },

  pro: {
    eyebrow:
      "REGULAR RESEARCH",

    description:
      "Return to your research, follow changes and ask about the evidence.",

    tools: [
      "Historical changes",
      "Smart Alerts & Monitoring",
      "Ask AYZO Investigator",
      "Reports & structured exports",
    ],
  },

  advanced: {
    eyebrow:
      "INVESTIGATION WORKFLOWS",

    description:
      "Organize investigations and connect them to your workflow.",

    tools: [
      "Everything in Pro",
      "Cases & Evidence Locker",
      "Comparison & batch analysis",
      "API & custom dashboards",
      "Priority analysis",
    ],
  },
} as const;

function planName(
  plan:
    PlanId
) {
  if (
    plan ===
      "free"
  ) {
    return "Free";
  }

  if (
    plan ===
      "pro"
  ) {
    return "Pro";
  }

  return "Advanced";
}

function quotaLabel(
  plan:
    PlanId
) {
  const quota =
    PLANS[plan]
      .analysisQuota;

  if (
    quota.kind !==
      "fixed"
  ) {
    return "Usage policy";
  }

  return `${quota.count} analyses / 24h`;
}

function monthlyPrice(
  plan:
    "pro" |
    "advanced"
) {
  return PLANS[
    plan
  ].monthlyPriceUsd;
}

function annualPrice(
  plan:
    "pro" |
    "advanced"
) {
  return PLANS[
    plan
  ].annualPriceUsd;
}

function displayPrice(
  plan:
    "pro" |
    "advanced",
  billingPeriod:
    BillingPeriod
) {
  if (
    billingPeriod ===
      "annual"
  ) {
    const annual =
      annualPrice(
        plan
      );

    if (
      annual === null
    ) {
      return "—";
    }

    return (
      annual /
      12
    ).toFixed(
      2
    );
  }

  return (
    monthlyPrice(
      plan
    )
      ?.toFixed(
        0
      ) ??
    "—"
  );
}

function chargeLabel(
  plan:
    "pro" |
    "advanced",
  billingPeriod:
    BillingPeriod
) {
  if (
    billingPeriod ===
      "annual"
  ) {
    const annual =
      annualPrice(
        plan
      );

    return annual ===
      null
      ? "Annual billing unavailable"
      : `$${annual.toFixed(
          2
        )} billed annually`;
  }

  const monthly =
    monthlyPrice(
      plan
    );

  return monthly ===
    null
    ? "Monthly billing unavailable"
    : `$${monthly.toFixed(
        2
      )} billed monthly`;
}

function checkoutLabel(
  plan:
    "pro" |
    "advanced",
  billingPeriod:
    BillingPeriod
) {
  if (
    billingPeriod ===
      "annual"
  ) {
    const annual =
      annualPrice(
        plan
      );

    return `Start Annual · $${annual?.toFixed(
      2
    ) ?? "—"}/yr`;
  }

  return `Start Monthly · $${monthlyPrice(
    plan
  )?.toFixed(
    0
  ) ?? "—"}/mo`;
}

export default function PricingPlanCards({
  visiblePlans,
  currentPlan,
  authenticated,
  billingPeriod,
  onBillingPeriodChange,
  paidCheckoutEnabled,
}: {
  visiblePlans:
    readonly PlanId[];

  currentPlan:
    PlanId | null;

  authenticated:
    boolean;

  billingPeriod:
    BillingPeriod;

  onBillingPeriodChange:
    (
      value:
        BillingPeriod
    ) => void;

  paidCheckoutEnabled:
    boolean;
}) {
  const hasPaidUpgrade =
    visiblePlans.some(
      plan =>
        plan !==
          "free" &&
        plan !==
          currentPlan
    );

  return (
    <div
      data-ayzo-plan-cards="true"
      className="mx-auto mt-12 w-full max-w-6xl"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.2em] text-violet-300">
            YOUR RESEARCH, YOUR PACE
          </div>

          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
            Choose how you investigate.
          </h3>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Start free. Add deeper research tools when you need them.
          </p>
        </div>

        <div className="shrink-0 self-start rounded-full border border-zinc-700 bg-[#101829] px-3 py-1.5 text-[10px] text-zinc-400">
          {authenticated &&
          currentPlan
            ? (
                <>
                  Your plan ·{" "}
                  <span className="font-semibold text-emerald-300">
                    {
                      planName(
                        currentPlan
                      )
                    }
                  </span>
                </>
              )
            : "Guest access"}
        </div>
      </div>

      {hasPaidUpgrade && (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-zinc-500">
            Choose billing for your upgrade
          </div>

          <div
            role="group"
            aria-label="Billing period"
            className="inline-flex min-h-12 self-start rounded-xl border border-zinc-700 bg-[#101829] p-1"
          >
            <button
              type="button"
              data-ayzo-billing-period="monthly"
              aria-pressed={
                billingPeriod ===
                  "monthly"
              }
              onClick={() =>
                onBillingPeriodChange(
                  "monthly"
                )
              }
              className={`min-h-10 rounded-lg px-5 text-xs font-medium transition ${
                billingPeriod ===
                "monthly"
                  ? "bg-violet-300 text-[#0b1020]"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              Monthly
            </button>

            <button
              type="button"
              data-ayzo-billing-period="annual"
              aria-pressed={
                billingPeriod ===
                  "annual"
              }
              onClick={() =>
                onBillingPeriodChange(
                  "annual"
                )
              }
              className={`min-h-10 rounded-lg px-5 text-xs font-medium transition ${
                billingPeriod ===
                "annual"
                  ? "bg-violet-300 text-[#0b1020]"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              Annual
            </button>
          </div>
        </div>
      )}

      <div
        className={`mt-5 grid gap-4 ${
          visiblePlans.length ===
          3
            ? "lg:grid-cols-3"
            : visiblePlans.length ===
                2
              ? "md:grid-cols-2"
              : "grid-cols-1"
        }`}
      >
        {visiblePlans.map(
          plan => {
            const copy =
              PLAN_COPY[
                plan
              ];

            const isCurrent =
              currentPlan ===
                plan;

            return (
              <article
                key={
                  plan
                }
                data-ayzo-plan-card={
                  plan
                }
                className={`flex min-h-full flex-col rounded-2xl border p-5 ${
                  plan ===
                  "pro"
                    ? "border-violet-400/45 bg-violet-500/[0.045]"
                    : plan ===
                        "advanced"
                      ? "border-purple-400/30 bg-purple-500/[0.035]"
                      : "border-zinc-700 bg-[#101829]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-white">
                      {
                        planName(
                          plan
                        )
                      }
                    </h4>
                  </div>

                  <span
                    className={`rounded border px-2 py-1 text-[8px] font-semibold tracking-[0.08em] ${
                      isCurrent
                        ? "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300"
                        : "border-zinc-700 text-violet-300"
                    }`}
                  >
                    {isCurrent
                      ? "CURRENT PLAN"
                      : copy.eyebrow}
                  </span>
                </div>

                <p className="mt-4 min-h-[3rem] text-xs leading-5 text-zinc-400">
                  {
                    copy.description
                  }
                </p>

                <div className="mt-4">
                  {plan ===
                  "free" ? (
                    <>
                      <div className="text-3xl font-semibold tracking-[-0.03em] text-white">
                        $0
                      </div>

                      <div className="mt-1 text-[10px] text-zinc-500">
                        No subscription payment required.
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-end gap-1">
                        <div className="text-3xl font-semibold tracking-[-0.03em] text-white">
                          $
                          {
                            displayPrice(
                              plan,
                              billingPeriod
                            )
                          }
                        </div>

                        <div className="pb-1 text-[10px] text-zinc-500">
                          {billingPeriod ===
                          "annual"
                            ? "/mo eq."
                            : "/month"}
                        </div>
                      </div>

                      <div
                        data-ayzo-plan-charge={
                          plan
                        }
                        className="mt-1 text-[10px] text-zinc-500"
                      >
                        {
                          chargeLabel(
                            plan,
                            billingPeriod
                          )
                        }
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-5 border-t border-zinc-700/80 pt-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                    <span className="text-violet-300">
                      ◌
                    </span>

                    {
                      quotaLabel(
                        plan
                      )
                    }
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-[9px] font-semibold tracking-[0.14em] text-zinc-500">
                    {plan ===
                    "free"
                      ? "YOUR INCLUDED TOOLS"
                      : "RESEARCH CAPABILITIES"}
                  </div>

                  <ul className="mt-3 space-y-2.5">
                    {copy.tools.map(
                      tool => (
                        <li
                          key={
                            tool
                          }
                          className="flex gap-2 text-xs leading-5 text-zinc-300"
                        >
                          <span className="mt-0.5 text-emerald-300">
                            ✓
                          </span>

                          <span>
                            {
                              tool
                            }
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </div>

                <div className="mt-auto pt-6">
                  {plan ===
                  "free" ? (
                    !authenticated ? (
                      <Link
                        href="/login?mode=signup"
                        className="flex min-h-12 w-full items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/[0.08] px-4 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/[0.14]"
                      >
                        Create Free Account
                      </Link>
                    ) : (
                      <div className="flex min-h-12 w-full items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 text-xs font-semibold text-emerald-300">
                        Free access active
                      </div>
                    )
                  ) : isCurrent ? (
                    <div className="flex min-h-12 w-full items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 text-xs font-semibold text-emerald-300">
                      Current plan active
                    </div>
                  ) : paidCheckoutEnabled ? (
                    <>
                      {billingPeriod ===
                        "monthly" && (
                        <PlanCheckoutButton
                          plan={
                            plan
                          }
                          interval="monthly"
                          label={
                            checkoutLabel(
                              plan,
                              "monthly"
                            )
                          }
                        />
                      )}

                      {billingPeriod ===
                        "annual" && (
                        <PlanCheckoutButton
                          plan={
                            plan
                          }
                          interval="annual"
                          label={
                            checkoutLabel(
                              plan,
                              "annual"
                            )
                          }
                        />
                      )}
                    </>
                  ) : (
                    <p className="rounded-xl border border-zinc-800 bg-black/20 px-4 py-3 text-xs leading-5 text-zinc-500">
                      Secure checkout is temporarily unavailable.
                    </p>
                  )}
                </div>
              </article>
            );
          }
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-800 bg-[#101829]/80 px-4 py-3 text-center text-[10px] leading-5 text-zinc-500">
        <span className="font-semibold text-zinc-300">
          {LIVE_NETWORK_COUNT} live networks
        </span>
        {" "}are available across AYZO plans.
        Intelligence depth depends on the selected network,
        subject type and available evidence.
      </div>
    </div>
  );
}
