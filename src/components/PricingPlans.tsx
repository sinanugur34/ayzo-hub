"use client";

import {
  useEffect,
  useState,
} from "react";

import PlanComparisonMatrix from "@/components/PlanComparisonMatrix";
import PlanCheckoutButton from "@/components/billing/PlanCheckoutButton";

import {
  PLANS,
} from "@/lib/plans/registry";

import type {
  PlanId,
} from "@/lib/plans/types";

const PLAN_ORDER:
  readonly PlanId[] = [
    "free",
    "pro",
    "advanced",
  ];

type AccountState = {
  authenticated: boolean;
  plan: PlanId;
};

function isPlanId(
  value: unknown
): value is PlanId {
  return (
    value === "free" ||
    value === "pro" ||
    value === "advanced"
  );
}

function annualLabel(
  value: number | null
) {
  return value === null
    ? "—"
    : value.toFixed(2);
}

export default function PricingPlans() {
  const [
    account,
    setAccount,
  ] =
    useState<
      AccountState | null
    >(null);

  const paidCheckoutEnabled =
    process.env
      .NEXT_PUBLIC_AYZO_PAID_CHECKOUT_ENABLED
      ?.trim() === "true";

  useEffect(() => {
    let cancelled =
      false;

    async function loadPlan() {
      try {
        const response =
          await fetch(
            "/api/account/plan",
            {
              cache:
                "no-store",

              credentials:
                "same-origin",
            }
          );

        const data:
          unknown =
          await response.json();

        if (
          cancelled ||
          typeof data !==
            "object" ||
          data === null
        ) {
          return;
        }

        const row =
          data as Record<
            string,
            unknown
          >;

        setAccount({
          authenticated:
            row.authenticated ===
            true,

          plan:
            isPlanId(
              row.plan
            )
              ? row.plan
              : "free",
        });
      } catch {
        if (!cancelled) {
          setAccount({
            authenticated:
              false,
            plan:
              "free",
          });
        }
      }
    }

    loadPlan();

    return () => {
      cancelled =
        true;
    };
  }, []);

  if (!account) {
    return null;
  }

  const currentPlan =
    account.authenticated
      ? account.plan
      : null;

  const currentIndex =
    PLAN_ORDER.indexOf(
      account.plan
    );

  const visiblePlans =
    account.authenticated
      ? PLAN_ORDER.slice(
          Math.max(
            0,
            currentIndex
          )
        )
      : [...PLAN_ORDER];

  const showPro =
    visiblePlans.includes(
      "pro"
    );

  const showAdvanced =
    visiblePlans.includes(
      "advanced"
    );

  const currentPro =
    currentPlan ===
    "pro";

  const currentAdvanced =
    currentPlan ===
    "advanced";

  return (
    <section
      id="plans"
      className="mt-24 w-full max-w-6xl text-left"
    >
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-xs font-medium tracking-[0.2em] text-violet-300">
          AYZO PLANS
        </div>

        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
          Start simple. Go as deep as you need.
        </h2>

        <p className="mt-4 text-sm leading-6 text-zinc-500 sm:text-base">
          {account.authenticated
            ? "Your current plan and available upgrade paths."
            : "Compare Free, Pro and Advanced access in one place."}
        </p>
      </div>

      <PlanComparisonMatrix
        visiblePlans={
          visiblePlans
        }
        currentPlan={
          currentPlan
        }
      />

      {(showPro ||
        showAdvanced) && (
        <div
          className={`mx-auto mt-8 grid w-full gap-4 ${
            showPro &&
            showAdvanced
              ? "max-w-4xl md:grid-cols-2"
              : "max-w-2xl md:grid-cols-1"
          }`}
        >
          {showPro && (
            <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.05] p-5">
              <div className="mb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold tracking-[0.16em] text-violet-300">
                      PRO ACCESS
                    </div>

                    <div className="mt-1 text-lg font-semibold text-white">
                      AYZO Pro
                    </div>
                  </div>

                  {currentPro ? (
                    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-emerald-300">
                      CURRENT PLAN
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">
                        $
                        {PLANS.pro.monthlyPriceUsd?.toFixed(
                          0
                        )}

                        <span className="ml-1 text-[10px] font-normal text-zinc-500">
                          /mo
                        </span>
                      </div>

                      <div className="mt-1 text-[9px] text-zinc-600">
                        Founding price
                      </div>
                    </div>
                  )}
                </div>

                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  {currentPro
                    ? "Your AYZO Pro access is active."
                    : "Higher usage limits and live Pro intelligence features for individual research."}
                </p>
              </div>

              {!currentPro && (
                paidCheckoutEnabled ? (
                  <div className="space-y-2">
                    <PlanCheckoutButton
                      plan="pro"
                      interval="monthly"
                      label={`Start Monthly · $${PLANS.pro.monthlyPriceUsd?.toFixed(
                        0
                      )}/mo`}
                    />

                    <PlanCheckoutButton
                      plan="pro"
                      interval="annual"
                      variant="secondary"
                      label={`Start Annual · $${annualLabel(
                        PLANS.pro.annualPriceUsd
                      )}/yr`}
                    />
                  </div>
                ) : (
                  <p className="rounded-xl border border-zinc-800 bg-black/20 px-4 py-3 text-xs leading-5 text-zinc-500">
                    Secure checkout is temporarily unavailable.
                  </p>
                )
              )}
            </div>
          )}

          {showAdvanced && (
            <div className="rounded-2xl border border-purple-400/25 bg-purple-500/[0.05] p-5">
              <div className="mb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold tracking-[0.16em] text-purple-300">
                      ADVANCED ACCESS
                    </div>

                    <div className="mt-1 text-lg font-semibold text-white">
                      AYZO Advanced
                    </div>
                  </div>

                  {currentAdvanced ? (
                    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-emerald-300">
                      CURRENT PLAN
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">
                        $
                        {PLANS.advanced.monthlyPriceUsd?.toFixed(
                          0
                        )}

                        <span className="ml-1 text-[10px] font-normal text-zinc-500">
                          /mo
                        </span>
                      </div>

                      <div className="mt-1 text-[9px] text-zinc-600">
                        Premium individual plan
                      </div>
                    </div>
                  )}
                </div>

                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  {currentAdvanced
                    ? "Your AYZO Advanced access is active."
                    : "Includes every live Pro capability plus live Advanced investigation workflows."}
                </p>
              </div>

              {!currentAdvanced && (
                paidCheckoutEnabled ? (
                  <div className="space-y-2">
                    <PlanCheckoutButton
                      plan="advanced"
                      interval="monthly"
                      label={`Start Monthly · $${PLANS.advanced.monthlyPriceUsd?.toFixed(
                        0
                      )}/mo`}
                    />

                    <PlanCheckoutButton
                      plan="advanced"
                      interval="annual"
                      variant="secondary"
                      label={`Start Annual · $${annualLabel(
                        PLANS.advanced.annualPriceUsd
                      )}/yr`}
                    />
                  </div>
                ) : (
                  <p className="rounded-xl border border-zinc-800 bg-black/20 px-4 py-3 text-xs leading-5 text-zinc-500">
                    Secure checkout is temporarily unavailable.
                  </p>
                )
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 text-center text-[10px] leading-5 text-zinc-600">
        Lower tiers are hidden for authenticated paid accounts.
        Roadmap features are not represented as available today.
      </div>
    </section>
  );
}
