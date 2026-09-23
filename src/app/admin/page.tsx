import Link from "next/link";

import {
  getAdminDashboardSnapshot,
} from "@/lib/adminAnalyticsRead";

import {
  getAdminSignupInsights,
} from "@/lib/adminSignupInsights";

export const dynamic =
  "force-dynamic";

function Metric({
  label,
  value,
  detail,
}: {
  label:
    string;
  value:
    number |
    string;
  detail?:
    string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
        {label}
      </div>

      <div className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
        {value}
      </div>

      {detail && (
        <div className="mt-2 text-xs text-zinc-500">
          {detail}
        </div>
      )}
    </div>
  );
}

export default async function AdminPage() {
  const [
    snapshot,
    signup,
  ] =
    await Promise.all([
      getAdminDashboardSnapshot(),
      getAdminSignupInsights(),
    ]);

  const signupTracked =
    signup.tracking.recorded +
    signup.tracking.unknown;

  const signupCoverage =
    signupTracked > 0
      ? Math.round(
          signup.tracking.recorded /
            signupTracked *
            100
        )
      : 0;

  const resolvedAnalyses =
    snapshot.activity.completed7d +
    snapshot.activity.failed7d;

  const successRate =
    resolvedAnalyses > 0
      ? Math.round(
          (
            snapshot.activity.completed7d /
            resolvedAnalyses
          ) *
            100
        )
      : 0;

  return (
    <div className="py-8">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
              SYSTEM OVERVIEW
            </div>

            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
              AYZO at a glance
            </h1>
          </div>

          <Link
            href="/admin/users"
            className="text-sm font-medium text-violet-300 transition hover:text-violet-200"
          >
            View all users →
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Users"
            value={
              snapshot.users
            }
          />

          <Metric
            label="Active subscriptions"
            value={
              snapshot
                .subscriptions
                .active
            }
          />

          <Metric
            label="Analyses · 24h"
            value={
              snapshot
                .activity
                .last24h
            }
          />

          <Metric
            label="Success · 7d"
            value={`${successRate}%`}
            detail={`${snapshot.activity.completed7d} completed`}
          />
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
              SIGNUP INTELLIGENCE
            </div>

            <h2 className="mt-2 text-xl font-semibold">
              Acquisition overview
            </h2>
          </div>

          <Link
            href="/admin/users"
            className="text-xs font-medium text-violet-300 transition hover:text-violet-200"
          >
            Explore users →
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="New users · 7d"
            value={
              signup.period.last7d
            }
          />

          <Metric
            label="New users · 30d"
            value={
              signup.period.last30d
            }
          />

          <Metric
            label="Signup tracking"
            value={`${signupCoverage}%`}
            detail={`${signup.tracking.recorded} recorded · ${signup.tracking.unknown} historical/unknown`}
          />

          <Metric
            label="Web signups"
            value={
              signup.channel.web
            }
          />

          <Metric
            label="Android signups"
            value={
              signup.channel.android
            }
          />

          <Metric
            label="iOS signups"
            value={
              signup.channel.ios
            }
          />

          <Metric
            label="Desktop"
            value={
              signup.device.desktop
            }
          />

          <Metric
            label="Phone"
            value={
              signup.device.phone
            }
          />
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Top signup countries
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {signup.countries
              .slice(
                0,
                8
              )
              .map(
                country => (
                  <Link
                    key={
                      country.code
                    }
                    href={`/admin/users?country=${encodeURIComponent(
                      country.code
                    )}`}
                    className="rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-300 transition hover:border-violet-500 hover:text-violet-200"
                  >
                    {country.code} · {country.total}
                  </Link>
                )
              )}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          ANALYSIS ACTIVITY · 7 DAYS
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric
            label="Total"
            value={
              snapshot
                .activity
                .last7d
            }
          />

          <Metric
            label="Web"
            value={
              snapshot
                .activity
                .web7d
            }
          />

          <Metric
            label="Android"
            value={
              snapshot
                .activity
                .android7d
            }
          />

          <Metric
            label="Completed"
            value={
              snapshot
                .activity
                .completed7d
            }
          />

          <Metric
            label="Failed"
            value={
              snapshot
                .activity
                .failed7d
            }
          />

          <Metric
            label="Quota blocked"
            value={
              snapshot
                .activity
                .quotaBlocked7d
            }
          />
        </div>
      </section>

      <section className="mt-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          SUBSCRIPTIONS
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Pro"
            value={
              snapshot
                .subscriptions
                .pro
            }
          />

          <Metric
            label="Advanced"
            value={
              snapshot
                .subscriptions
                .advanced
            }
          />

          <Metric
            label="Google Play"
            value={
              snapshot
                .subscriptions
                .googlePlay
            }
          />

          <Metric
            label="Creem"
            value={
              snapshot
                .subscriptions
                .creem
            }
          />
        </div>
      </section>

      <div className="mt-8 rounded-2xl border border-zinc-900 bg-zinc-950/50 px-5 py-4 text-xs leading-5 text-zinc-600">
        Operational activity intentionally excludes raw wallet addresses,
        transaction hashes, Ask AYZO question text and payment secrets.
      </div>
    </div>
  );
}
