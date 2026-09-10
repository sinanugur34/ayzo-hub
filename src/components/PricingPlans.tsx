"use client";

import PlanComparisonMatrix from "@/components/PlanComparisonMatrix";
import WaitlistForm from "@/components/WaitlistForm";
import ProCheckoutButton from "@/components/billing/ProCheckoutButton";

import { PLANS } from "@/lib/plans/registry";

export default function PricingPlans() {
  const proCheckoutEnabled =
    process.env
      .NEXT_PUBLIC_AYZO_PRO_CHECKOUT_ENABLED
      ?.trim() === "true";

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
          Compare Free, Pro and Advanced access in one place.
        </p>
      </div>

      <PlanComparisonMatrix />

      <div className="mx-auto mt-8 grid w-full max-w-4xl gap-4 md:grid-cols-2">
        {/* PRO ACCESS */}
        <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.05] p-5">
          <div className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold tracking-[0.16em] text-violet-300">
                  PRO ACCESS
                </div>

                <div className="mt-1 text-lg font-semibold text-white">
                  AYZO Pro
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-semibold text-white">
                  ${PLANS.pro.monthlyPriceUsd?.toFixed(0)}
                  <span className="ml-1 text-[10px] font-normal text-zinc-500">
                    /mo
                  </span>
                </div>

                <div className="mt-1 text-[9px] text-zinc-600">
                  Founding price
                </div>
              </div>
            </div>

            {!proCheckoutEnabled && (
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                Join the waitlist for Pro access and launch updates.
              </p>
            )}
          </div>

          {proCheckoutEnabled ? (
            <div className="space-y-2">
              <ProCheckoutButton
                interval="monthly"
                label={`Start Monthly · $${PLANS.pro.monthlyPriceUsd?.toFixed(0)}/mo`}
              />

              <ProCheckoutButton
                interval="annual"
                variant="secondary"
                label={`Start Annual · $${PLANS.pro.annualPriceUsd?.toFixed(2)}/yr`}
              />

              <p className="pt-1 text-center text-[10px] leading-5 text-zinc-600">
                Secure checkout powered by FastSpring.
              </p>
            </div>
          ) : (
            <WaitlistForm
              source="pro-card"
              compact
              buttonLabel="Join Pro Waitlist"
            />
          )}
        </div>

        {/* ADVANCED ACCESS */}
        <div className="rounded-2xl border border-purple-400/25 bg-purple-500/[0.05] p-5">
          <div className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold tracking-[0.16em] text-purple-300">
                  ADVANCED ACCESS
                </div>

                <div className="mt-1 text-lg font-semibold text-white">
                  AYZO Advanced
                </div>
              </div>

              <div className="text-right text-[10px] font-medium text-zinc-500">
                Pricing
                <br />
                coming soon
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Join the waitlist for Advanced investigation workflows,
              API access and team-scale features.
            </p>
          </div>

          <WaitlistForm
            source="advanced-card"
            compact
            buttonLabel="Join Advanced Waitlist"
          />
        </div>
      </div>

      <div className="mt-5 text-center text-[10px] leading-5 text-zinc-600">
        Roadmap features are not represented as available today.{" "}
        {proCheckoutEnabled
          ? "Pro checkout is available for authenticated customers."
          : "Pro checkout remains disabled until billing is connected."}
      </div>
    </section>
  );
}
