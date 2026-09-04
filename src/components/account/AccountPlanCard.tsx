import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

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

  const periodEnd =
    formatPeriodEnd(
      entitlement
        .currentPeriodEnd
    );

  if (
    entitlement.planId ===
    "pro"
  ) {
    const interval =
      entitlement
        .billingInterval ===
      "annual"
        ? "Annual"
        : "Monthly";

    return (
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
        <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
          Plan
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-violet-200">
            Pro
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
    </div>
  );
}
