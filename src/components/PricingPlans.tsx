"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import PlanComparisonMatrix, {
  PLAN_COMPARISON_CATEGORY_COUNT,
  PLAN_COMPARISON_FEATURE_COUNT,
} from "@/components/PlanComparisonMatrix";

import PricingPlanCards from "@/components/PricingPlanCards";
import {
  trackEvent,
} from "@/lib/analytics/client";

import {
  PLANS,
} from "@/lib/plans/registry";

import {
  GUEST_ANALYSIS_POLICY,
} from "@/lib/guestAnalysisPolicy";

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
type BillingPeriod =
  | "monthly"
  | "annual";


function isPlanId(
  value: unknown
): value is PlanId {
  return (
    value === "free" ||
    value === "pro" ||
    value === "advanced"
  );
}

export default function PricingPlans() {
  const [
    account,
    setAccount,
  ] =
    useState<
      AccountState | null
    >(null);

  const [
    billingPeriod,
    setBillingPeriod,
  ] =
    useState<BillingPeriod>(
      "monthly"
    );



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

  useEffect(() => {
    if (!account) {
      return;
    }

    trackEvent(
      "pricing_viewed",
      {
        surface:
          "home",

        plan:
          account.authenticated
            ? account.plan
            : "anonymous",
      }
    );
  }, [account]);

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

  return (
    <section
      id="plans"
      data-ayzo-pricing
      data-authenticated={
        account.authenticated
      }
      data-current-plan={
        currentPlan ??
        "guest"
      }
      className="ayzo-pricing-v2 mt-24 w-full max-w-6xl text-left"
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

        {!account.authenticated && (
          <div
            data-ayzo-guest-access
            className="mx-auto mt-5 max-w-2xl rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.035] px-4 py-3"
          >
            <div className="text-[9px] font-semibold tracking-[0.14em] text-cyan-300">
              TRY AYZO WITHOUT AN ACCOUNT
            </div>

            <p className="mt-1.5 text-xs leading-5 text-zinc-500">
              Guest access includes{" "}
              <strong className="font-medium text-zinc-300">
                {GUEST_ANALYSIS_POLICY.limit} analysis / 24h
              </strong>
              . Create a free account for{" "}
              <strong className="font-medium text-zinc-300">
                {PLANS.free.analysisQuota.kind === "fixed"
                  ? PLANS.free.analysisQuota.count
                  : 3} analyses / 24h
              </strong>
              {" "}and up to{" "}
              <strong className="font-medium text-zinc-300">
                {PLANS.free.analysisQuota.kind === "fixed"
                  ? PLANS.free.analysisQuota.perNetworkCount ?? 2
                  : 2} on the same network
              </strong>
              .
            </p>

            <Link
              href="/login?mode=signup"
              className="mt-2 inline-flex text-xs font-medium text-violet-300 transition hover:text-violet-200"
            >
              Create Free Account →
            </Link>
          </div>
        )}
      </div>

      <div className="ayzo-pricing-matrix-shell">
        <PricingPlanCards
        visiblePlans={
          visiblePlans
        }
        currentPlan={
          currentPlan
        }
        authenticated={
          account.authenticated
        }
        billingPeriod={
          billingPeriod
        }
        onBillingPeriodChange={
          setBillingPeriod
        }
        paidCheckoutEnabled={
          paidCheckoutEnabled
        }
      />

      <details
        data-ayzo-plan-comparison="true"
        className="mx-auto mt-8 w-full max-w-6xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#101829]/55"
      >
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden">
          <div>
            <div className="text-sm font-semibold text-zinc-100">
              Compare key features
            </div>

            <div className="mt-1 text-[10px] leading-5 text-zinc-500">
              {PLAN_COMPARISON_FEATURE_COUNT} features ·{" "}
              {PLAN_COMPARISON_CATEGORY_COUNT} categories ·
              full plan-access detail
            </div>
          </div>

          <span className="shrink-0 text-xs font-medium text-violet-300">
            Open comparison ↓
          </span>
        </summary>

        <div className="border-t border-zinc-800 px-4 pb-6 sm:px-6">
          <PlanComparisonMatrix
            visiblePlans={
              visiblePlans
            }
            currentPlan={
              currentPlan
            }
            billingPeriod={
              billingPeriod
            }
          />
        </div>
      </details>
      </div>


      <div className="mt-5 text-center text-[10px] leading-5 text-zinc-600">
        Lower tiers are hidden for authenticated paid accounts.
        Roadmap features are not represented as available today.
      </div>
    </section>
  );
}
