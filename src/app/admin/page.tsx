import Link from "next/link";

import {
  getAdminDashboardSnapshot,
} from "@/lib/adminAnalyticsRead";

import {
  getAdminSignupInsights,
} from "@/lib/adminSignupInsights";
import {
  getAdminBillingInsights,
} from "@/lib/adminBillingInsights";

import {
  getAdminConversionFunnel,
} from "@/lib/adminConversionFunnel";

import {
  buildAdminConversionRates,
  formatAdminConversionRate,
  type AdminConversionRate,
} from "@/lib/adminConversionRatesCore";

import {
  getAdminAuthenticatedAttribution,
} from "@/lib/adminAttribution";

import {
  formatAdminAttributionCoverage,
  type AdminAttributionBucket,
} from "@/lib/adminAttributionCore";


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


function conversionRateDetail(
  last7d:
    AdminConversionRate,

  last30d:
    AdminConversionRate
) {
  return `${last7d.numerator}/${last7d.denominator} sessions · 30d ${formatAdminConversionRate(
    last30d
  )}`;
}


function AttributionBreakdown({
  title,
  items,
}: {
  title:
    string;

  items:
    AdminAttributionBucket[];
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
        {title}
      </div>

      <div className="mt-4 space-y-2">
        {items.length > 0 ? (
          items
            .slice(
              0,
              8
            )
            .map(
              item => (
                <div
                  key={
                    item.value
                  }
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="truncate text-zinc-400">
                    {item.value}
                  </span>

                  <span className="font-medium text-zinc-200">
                    {item.total}
                  </span>
                </div>
              )
            )
        ) : (
          <div className="text-xs text-zinc-600">
            No attributed users in this window.
          </div>
        )}
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const [
    snapshot,
    signup,
    billing,
    funnel,
    attribution,
  ] =
    await Promise.all([
      getAdminDashboardSnapshot(),
      getAdminSignupInsights(),
      getAdminBillingInsights(),
      getAdminConversionFunnel(),
      getAdminAuthenticatedAttribution(),
    ]);

  const conversionRates7d =
    funnel.available
      ? buildAdminConversionRates(
          funnel.last7d
        )
      : null;

  const conversionRates30d =
    funnel.available
      ? buildAdminConversionRates(
          funnel.last30d
        )
      : null;

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

  const mrrEquivalent =
    new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",
        currency:
          "USD",
        minimumFractionDigits:
          2,
        maximumFractionDigits:
          2,
      }
    ).format(
      billing.mrrEquivalentUsdCents /
      100
    );

  const nonRevenuePaidAccess =
    Math.max(
      0,
      billing.activeSubscriptions -
        billing.creem -
        billing.googlePlay
    );

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
            label="Paid access users"
            value={
              billing
                .activeSubscriptions
            }
            detail="Effective active or canceling access"
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
              .filter(
                country =>
                  country.code !==
                  "unknown"
              )
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
        <div>
          <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
            PRODUCT FUNNEL · 7 DAYS
          </div>

          <h2 className="mt-2 text-xl font-semibold">
            Conversion & engagement signals
          </h2>

          <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-600">
            Unique consented web sessions. These are directional product signals, not a strict sequential cohort.
          </p>
        </div>

        {funnel.available ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Consented sessions"
              value={
                funnel
                  .last7d
                  .product_session_started
                  .sessions
              }
              detail={`${funnel.last30d.product_session_started.sessions} sessions · 30d`}
            />

            <Metric
              label="Example opened"
              value={
                funnel
                  .last7d
                  .example_opened
                  .sessions
              }
              detail={`${funnel.last30d.example_opened.sessions} sessions · 30d`}
            />

            <Metric
              label="Analyze submitted"
              value={
                funnel
                  .last7d
                  .analysis_submitted
                  .sessions
              }
              detail={`${funnel.last30d.analysis_submitted.sessions} sessions · 30d`}
            />

            <Metric
              label="Analysis started"
              value={
                funnel
                  .last7d
                  .analysis_started
                  .sessions
              }
              detail={`${funnel.last30d.analysis_started.sessions} sessions · 30d`}
            />

            <Metric
              label="Analysis completed"
              value={
                funnel
                  .last7d
                  .intelligence_completed
                  .sessions
              }
              detail={`${funnel.last30d.intelligence_completed.sessions} sessions · 30d`}
            />

            <Metric
              label="Analysis failed"
              value={
                funnel
                  .last7d
                  .analysis_failed
                  .sessions
              }
              detail={`${funnel.last30d.analysis_failed.sessions} sessions · 30d`}
            />

            <Metric
              label="Quota blocked"
              value={
                funnel
                  .last7d
                  .analysis_quota_blocked
                  .sessions
              }
              detail={`${funnel.last30d.analysis_quota_blocked.sessions} sessions · 30d`}
            />

            <Metric
              label="Analysis saved"
              value={
                funnel
                  .last7d
                  .analysis_saved
                  .sessions
              }
              detail={`${funnel.last30d.analysis_saved.sessions} sessions · 30d`}
            />

            <Metric
              label="Watchlist add"
              value={
                funnel
                  .last7d
                  .watchlist_item_added
                  .sessions
              }
              detail={`${funnel.last30d.watchlist_item_added.sessions} sessions · 30d`}
            />

            <Metric
              label="Ask AYZO opened"
              value={
                funnel
                  .last7d
                  .ask_ayzo_opened
                  .sessions
              }
              detail={`${funnel.last30d.ask_ayzo_opened.sessions} sessions · 30d`}
            />

            <Metric
              label="Pricing viewed"
              value={
                funnel
                  .last7d
                  .pricing_viewed
                  .sessions
              }
              detail={`${funnel.last30d.pricing_viewed.sessions} sessions · 30d`}
            />

            <Metric
              label="Checkout started"
              value={
                funnel
                  .last7d
                  .checkout_started
                  .sessions
              }
              detail={`${funnel.last30d.checkout_started.sessions} sessions · 30d`}
            />

            <Metric
              label="Checkout created"
              value={
                funnel
                  .last7d
                  .checkout_created
                  .sessions
              }
              detail={`${funnel.last30d.checkout_created.sessions} sessions · 30d`}
            />

            <Metric
              label="Verified paid"
              value={
                funnel
                  .last7d
                  .subscription_paid
                  .sessions
              }
              detail={`${funnel.last30d.subscription_paid.sessions} sessions · 30d`}
            />
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5 text-xs leading-5 text-zinc-500">
            Product funnel telemetry is not available yet. Existing Admin Analytics remains fully available.
          </div>
        )}

        {conversionRates7d &&
          conversionRates30d && (
            <div className="mt-6">
              <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                DIRECTIONAL RATES · 7 DAYS
              </div>

              <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-600">
                Ratios compare unique-session signals inside the same time window. They are directional diagnostics, not strict same-session cohorts.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric
                  label="Session → analyze"
                  value={
                    formatAdminConversionRate(
                      conversionRates7d
                        .sessionToSubmit
                    )
                  }
                  detail={
                    conversionRateDetail(
                      conversionRates7d
                        .sessionToSubmit,
                      conversionRates30d
                        .sessionToSubmit
                    )
                  }
                />

                <Metric
                  label="Submit → start"
                  value={
                    formatAdminConversionRate(
                      conversionRates7d
                        .submitToStart
                    )
                  }
                  detail={
                    conversionRateDetail(
                      conversionRates7d
                        .submitToStart,
                      conversionRates30d
                        .submitToStart
                    )
                  }
                />

                <Metric
                  label="Start → complete"
                  value={
                    formatAdminConversionRate(
                      conversionRates7d
                        .startToComplete
                    )
                  }
                  detail={
                    conversionRateDetail(
                      conversionRates7d
                        .startToComplete,
                      conversionRates30d
                        .startToComplete
                    )
                  }
                />

                <Metric
                  label="Submit → complete"
                  value={
                    formatAdminConversionRate(
                      conversionRates7d
                        .submitToComplete
                    )
                  }
                  detail={
                    conversionRateDetail(
                      conversionRates7d
                        .submitToComplete,
                      conversionRates30d
                        .submitToComplete
                    )
                  }
                />

                <Metric
                  label="Session → pricing"
                  value={
                    formatAdminConversionRate(
                      conversionRates7d
                        .sessionToPricing
                    )
                  }
                  detail={
                    conversionRateDetail(
                      conversionRates7d
                        .sessionToPricing,
                      conversionRates30d
                        .sessionToPricing
                    )
                  }
                />

                <Metric
                  label="Pricing → checkout"
                  value={
                    formatAdminConversionRate(
                      conversionRates7d
                        .pricingToCheckout
                    )
                  }
                  detail={
                    conversionRateDetail(
                      conversionRates7d
                        .pricingToCheckout,
                      conversionRates30d
                        .pricingToCheckout
                    )
                  }
                />

                <Metric
                  label="Checkout → created"
                  value={
                    formatAdminConversionRate(
                      conversionRates7d
                        .checkoutToCreated
                    )
                  }
                  detail={
                    conversionRateDetail(
                      conversionRates7d
                        .checkoutToCreated,
                      conversionRates30d
                        .checkoutToCreated
                    )
                  }
                />

                <Metric
                  label="Created → verified paid"
                  value={
                    formatAdminConversionRate(
                      conversionRates7d
                        .createdToPaid
                    )
                  }
                  detail={
                    conversionRateDetail(
                      conversionRates7d
                        .createdToPaid,
                      conversionRates30d
                        .createdToPaid
                    )
                  }
                />
              </div>
            </div>
          )}
      </section>

      <section className="mt-8">
        <div>
          <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
            AUTHENTICATED ATTRIBUTION · 7 DAYS
          </div>

          <h2 className="mt-2 text-xl font-semibold">
            Acquisition → product behavior
          </h2>

          <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-600">
            Authenticated product-event users only. Signup channel, device and country come from normalized signup metadata. Anonymous consented sessions are intentionally excluded from these breakdowns.
          </p>
        </div>

        {attribution.available ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Attribution coverage"
                value={
                  formatAdminAttributionCoverage(
                    attribution
                      .last7d
                      .coverage
                      .percent
                  )
                }
                detail={`${attribution.last7d.coverage.recorded}/${attribution.last7d.coverage.total} authenticated users · 30d ${formatAdminAttributionCoverage(
                  attribution
                    .last30d
                    .coverage
                    .percent
                )}`}
              />

              <Metric
                label="Attributed users"
                value={
                  attribution
                    .last7d
                    .coverage
                    .recorded
                }
                detail={`${attribution.last30d.coverage.recorded} · 30d`}
              />

              <Metric
                label="Unknown signup source"
                value={
                  attribution
                    .last7d
                    .coverage
                    .unknown
                }
                detail="Authenticated users without normalized signup metadata"
              />
            </div>

            <div className="mt-6">
              <div className="text-sm font-medium text-zinc-300">
                Analyze submitted
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <AttributionBreakdown
                  title="Signup channel"
                  items={
                    attribution
                      .last7d
                      .events
                      .analysis_submitted
                      .channel
                  }
                />

                <AttributionBreakdown
                  title="Device"
                  items={
                    attribution
                      .last7d
                      .events
                      .analysis_submitted
                      .device
                  }
                />

                <AttributionBreakdown
                  title="Country"
                  items={
                    attribution
                      .last7d
                      .events
                      .analysis_submitted
                      .country
                  }
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-medium text-zinc-300">
                Analysis completed
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <AttributionBreakdown
                  title="Signup channel"
                  items={
                    attribution
                      .last7d
                      .events
                      .intelligence_completed
                      .channel
                  }
                />

                <AttributionBreakdown
                  title="Device"
                  items={
                    attribution
                      .last7d
                      .events
                      .intelligence_completed
                      .device
                  }
                />

                <AttributionBreakdown
                  title="Country"
                  items={
                    attribution
                      .last7d
                      .events
                      .intelligence_completed
                      .country
                  }
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-medium text-zinc-300">
                Pricing viewed
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <AttributionBreakdown
                  title="Signup channel"
                  items={
                    attribution
                      .last7d
                      .events
                      .pricing_viewed
                      .channel
                  }
                />

                <AttributionBreakdown
                  title="Device"
                  items={
                    attribution
                      .last7d
                      .events
                      .pricing_viewed
                      .device
                  }
                />

                <AttributionBreakdown
                  title="Country"
                  items={
                    attribution
                      .last7d
                      .events
                      .pricing_viewed
                      .country
                  }
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-medium text-zinc-300">
                Verified paid
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <AttributionBreakdown
                  title="Signup channel"
                  items={
                    attribution
                      .last7d
                      .events
                      .subscription_paid
                      .channel
                  }
                />

                <AttributionBreakdown
                  title="Device"
                  items={
                    attribution
                      .last7d
                      .events
                      .subscription_paid
                      .device
                  }
                />

                <AttributionBreakdown
                  title="Country"
                  items={
                    attribution
                      .last7d
                      .events
                      .subscription_paid
                      .country
                  }
                />
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5 text-xs leading-5 text-zinc-500">
            Authenticated attribution is not available yet. Existing Admin Analytics remains fully available.
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
              BILLING INTELLIGENCE
            </div>

            <h2 className="mt-2 text-xl font-semibold">
              Commercial overview
            </h2>
          </div>

          <Link
            href="/admin/users?plan=pro"
            className="text-xs font-medium text-violet-300 transition hover:text-violet-200"
          >
            Explore paid users →
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Paid access users"
            value={
              billing.activeSubscriptions
            }
            detail="Effective active or canceling access"
          />

          <Metric
            label="MRR equivalent"
            value={
              mrrEquivalent
            }
            detail="Annual plans normalized monthly; before fees, tax and refunds"
          />

          <Metric
            label="Pro"
            value={
              billing.pro
            }
          />

          <Metric
            label="Advanced"
            value={
              billing.advanced
            }
          />

          <Metric
            label="Monthly"
            value={
              billing.monthly
            }
          />

          <Metric
            label="Annual"
            value={
              billing.annual
            }
          />

          <Metric
            label="Canceling"
            value={
              billing.canceling
            }
          />

          <Metric
            label="Revenue providers"
            value={`${billing.creem} / ${billing.googlePlay}`}
            detail="Creem / Google Play"
          />

          <Metric
            label="Internal / review"
            value={
              nonRevenuePaidAccess
            }
            detail="Effective access not backed by Creem or Google Play billing"
          />
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
          EFFECTIVE ACCESS MIX
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Pro"
            value={
              billing.pro
            }
          />

          <Metric
            label="Advanced"
            value={
              billing.advanced
            }
          />

          <Metric
            label="Google Play"
            value={
              billing.googlePlay
            }
          />

          <Metric
            label="Creem"
            value={
              billing.creem
            }
          />

          <Metric
            label="Internal / review"
            value={
              nonRevenuePaidAccess
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
