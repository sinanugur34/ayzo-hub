import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

import {
  isPaidCheckoutEnabled,
} from "@/lib/billing/checkoutLaunchPolicy";

import PlanCheckoutButton from "@/components/billing/PlanCheckoutButton";

import {
  PLANS,
} from "@/lib/plans/registry";

function formatPeriodEnd(
  value:
    string | null
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      year:
        "numeric",
      month:
        "short",
      day:
        "numeric",
    }
  ).format(date);
}

export default async function AccountPlanCard() {
  const {
    entitlement,
    billingAvailable,
  } =
    await getServerEntitlement();

  const paidCheckoutEnabled =
    isPaidCheckoutEnabled();

  const periodEnd =
    formatPeriodEnd(
      entitlement
        .currentPeriodEnd
    );

  if (
    entitlement.planId ===
      "pro" ||
    entitlement.planId ===
      "advanced"
  ) {
    const interval =
      entitlement
        .billingInterval ===
      "annual"
        ? "Annual"
        : "Monthly";

    const isAdvanced =
      entitlement.planId ===
        "advanced";

    return (
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
        <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
          Plan
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-violet-200">
            {isAdvanced
              ? "Advanced"
              : "Pro"}
          </span>

          {entitlement
            .foundingCustomer && (
            <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[8px] font-semibold tracking-[0.1em] text-violet-300">
              FOUNDING
            </span>
          )}
        </div>

        <div className="mt-1 text-[10px] text-zinc-500">
          {entitlement
            .cancelAtPeriodEnd
            ? periodEnd
              ? `Access through ${periodEnd}`
              : "Cancellation scheduled"
            : `${interval} subscription · Active`}
        </div>

        {billingAvailable && (
          <form
            action="/api/billing/portal"
            method="post"
            className="mt-4"
          >
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-[10px] font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
            >
              Manage subscription
            </button>

            <div className="mt-2 text-[9px] text-zinc-600">
              Billing, payment method and cancellation
            </div>
          </form>
        )}

        {!isAdvanced &&
          billingAvailable &&
          paidCheckoutEnabled && (
            <div className="mt-4 border-t border-zinc-900 pt-4">
              <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                Upgrade to Advanced
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <PlanCheckoutButton
                  plan="advanced"
                  interval="monthly"
                  compact
                  label={`Monthly · $${PLANS.advanced.monthlyPriceUsd?.toFixed(
                    0
                  )}/mo`}
                />

                <PlanCheckoutButton
                  plan="advanced"
                  interval="annual"
                  compact
                  variant="secondary"
                  label={`Annual · $${PLANS.advanced.annualPriceUsd?.toFixed(
                    2
                  )}/yr`}
                />
              </div>
            </div>
          )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-900 bg-black/30 p-5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
        Plan
      </div>

      <div className="mt-2 text-sm text-zinc-300">
        Free
      </div>

      <div className="mt-1 text-[10px] text-zinc-600">
        {billingAvailable
          ? "No active paid subscription."
          : "Billing state is temporarily unavailable."}
      </div>

      {billingAvailable &&
        paidCheckoutEnabled && (
          <div className="mt-4 border-t border-zinc-900 pt-4">
            <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
              Upgrade
            </div>

            <div className="grid gap-3">
              <div>
                <div className="mb-2 text-[10px] font-medium text-violet-300">
                  AYZO Pro
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <PlanCheckoutButton
                    plan="pro"
                    interval="monthly"
                    compact
                    label={`Monthly · $${PLANS.pro.monthlyPriceUsd?.toFixed(
                      0
                    )}/mo`}
                  />

                  <PlanCheckoutButton
                    plan="pro"
                    interval="annual"
                    compact
                    variant="secondary"
                    label={`Annual · $${PLANS.pro.annualPriceUsd?.toFixed(
                      2
                    )}/yr`}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10px] font-medium text-purple-300">
                  AYZO Advanced
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <PlanCheckoutButton
                    plan="advanced"
                    interval="monthly"
                    compact
                    label={`Monthly · $${PLANS.advanced.monthlyPriceUsd?.toFixed(
                      0
                    )}/mo`}
                  />

                  <PlanCheckoutButton
                    plan="advanced"
                    interval="annual"
                    compact
                    variant="secondary"
                    label={`Annual · $${PLANS.advanced.annualPriceUsd?.toFixed(
                      2
                    )}/yr`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
