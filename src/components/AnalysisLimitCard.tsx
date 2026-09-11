"use client";

import WaitlistForm from "@/components/WaitlistForm";
import { PLANS } from "@/lib/plans/registry";

export default function AnalysisLimitCard() {
  const freeQuota =
    PLANS.free.analysisQuota.kind === "fixed"
      ? PLANS.free.analysisQuota.count
      : "—";

  const proQuota =
    PLANS.pro.analysisQuota.kind === "fixed"
      ? PLANS.pro.analysisQuota.count
      : "—";

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/10 to-zinc-950/80 text-left">
      <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium tracking-[0.18em] text-violet-300">
              USAGE LIMIT
            </div>

            <h3 className="mt-2 text-2xl font-semibold text-zinc-100">
              Daily Analysis Limit Reached
            </h3>

            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
              You&apos;ve used your {freeQuota} free analyses for the current
              24-hour window.
            </p>
          </div>

          <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[10px] font-medium tracking-wide text-violet-300">
            AYZO PRO · COMING SOON
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            `Up to ${proQuota} analyses / 24h`,
            "Smart Alerts & Monitoring",
            "Pro alert-rule management",
          ].map((feature) => (
            <div
              key={feature}
              className="rounded-2xl border border-zinc-800 bg-black/30 p-4"
            >
              <div className="text-[9px] font-medium tracking-[0.12em] text-violet-400">
                PRO
              </div>

              <div className="mt-2 text-sm text-zinc-300">
                {feature}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <WaitlistForm
            source="free-limit"
            compact
          />
        </div>
      </div>
    </div>
  );
}
