import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  getAdminUserSnapshot,
} from "@/lib/adminAnalyticsRead";

export const dynamic =
  "force-dynamic";

function formatDate(
  value:
    string |
    number |
    null
) {
  if (!value) {
    return "—";
  }

  const date =
    typeof value ===
    "number"
      ? new Date(
          value
        )
      : new Date(
          value
        );

  return new Intl.DateTimeFormat(
    "en",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
    }
  ).format(
    date
  );
}

function Card({
  label,
  value,
  detail,
}: {
  label:
    string;
  value:
    string |
    number;
  detail?:
    string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
        {label}
      </div>

      <div className="mt-2 break-words text-xl font-semibold">
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

export default async function AdminUserPage({
  params,
}: {
  params:
    Promise<{
      userId:
        string;
    }>;
}) {
  const {
    userId,
  } =
    await params;

  let snapshot:
    Awaited<
      ReturnType<
        typeof getAdminUserSnapshot
      >
    >;

  try {
    snapshot =
      await getAdminUserSnapshot(
        userId
      );
  } catch {
    notFound();
  }

  const used =
    snapshot.quota.remaining ===
    null
      ? null
      : Math.max(
          0,
          snapshot.quota.limit -
            snapshot.quota.remaining
        );

  return (
    <div className="py-8">
      <Link
        href="/admin/users"
        className="text-xs font-medium text-zinc-600 transition hover:text-zinc-300"
      >
        ← Users
      </Link>

      <div className="mt-5">
        <div className="text-xs font-medium tracking-[0.16em] text-violet-300">
          USER DETAIL
        </div>

        <h1 className="mt-2 break-all text-3xl font-semibold tracking-[-0.04em]">
          {snapshot.user.email ??
            snapshot.user.id}
        </h1>

        <div className="mt-2 break-all font-mono text-[10px] text-zinc-700">
          {snapshot.user.id}
        </div>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          label="Signup channel"
          value={
            snapshot.signupSource?.channel ??
            "unknown"
          }
        />

        <Card
          label="Signup device"
          value={
            snapshot.signupSource?.deviceClass ??
            "unknown"
          }
        />

        <Card
          label="Signup OS"
          value={
            snapshot.signupSource?.osFamily ??
            "unknown"
          }
        />

        <Card
          label="Signup country"
          value={
            snapshot.signupSource?.countryCode ??
            "unknown"
          }
        />

        <Card
          label="Signup recorded"
          value={
            formatDate(
              snapshot.signupSource?.createdAt ??
              null
            )
          }
        />
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          label="Plan"
          value={
            snapshot
              .entitlement
              .planId
          }
        />

        <Card
          label="Quota remaining"
          value={
            snapshot
              .quota
              .remaining ??
            "Unavailable"
          }
          detail={
            used === null
              ? "Counter unavailable"
              : `${used} used of ${snapshot.quota.limit}`
          }
        />

        <Card
          label="Quota reset"
          value={
            formatDate(
              snapshot
                .quota
                .resetAt
            )
          }
        />

        <Card
          label="Last sign in"
          value={
            formatDate(
              snapshot
                .user
                .lastSignInAt
            )
          }
        />
      </section>

      <section className="mt-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          SUBSCRIPTIONS
        </div>

        <div className="mt-4 space-y-3">
          {snapshot.subscriptions.length ===
          0 ? (
            <div className="rounded-2xl border border-zinc-800 p-5 text-sm text-zinc-500">
              No paid subscription records.
            </div>
          ) : (
            snapshot.subscriptions.map(
              subscription => (
                <div
                  key={`${subscription.provider}:${subscription.created_at}`}
                  className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5 sm:grid-cols-2 lg:grid-cols-5"
                >
                  <Card
                    label="Provider"
                    value={
                      subscription.provider
                    }
                  />

                  <Card
                    label="Plan"
                    value={
                      subscription.plan_id
                    }
                  />

                  <Card
                    label="Interval"
                    value={
                      subscription.billing_interval
                    }
                  />

                  <Card
                    label="Status"
                    value={
                      subscription.status
                    }
                  />

                  <Card
                    label="Period end"
                    value={
                      formatDate(
                        subscription.current_period_end
                      )
                    }
                  />
                </div>
              )
            )
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
              ANALYSIS ACTIVITY
            </div>

            <h2 className="mt-2 text-xl font-semibold">
              Latest 100 events
            </h2>
          </div>

          <div className="text-xs text-zinc-600">
            Web + Android
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-zinc-950 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                <tr>
                  <th className="px-4 py-3">
                    Time
                  </th>

                  <th className="px-4 py-3">
                    Platform
                  </th>

                  <th className="px-4 py-3">
                    Network
                  </th>

                  <th className="px-4 py-3">
                    Plan
                  </th>

                  <th className="px-4 py-3">
                    Result
                  </th>

                  <th className="px-4 py-3">
                    HTTP
                  </th>

                  <th className="px-4 py-3">
                    Remaining
                  </th>

                  <th className="px-4 py-3">
                    Reset
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-900">
                {snapshot.activity.map(
                  event => (
                    <tr
                      key={
                        event.id
                      }
                    >
                      <td className="px-4 py-3 text-zinc-500">
                        {formatDate(
                          event.created_at
                        )}
                      </td>

                      <td className="px-4 py-3 text-zinc-300">
                        {event.platform}
                      </td>

                      <td className="px-4 py-3 text-zinc-300">
                        {event.network}
                      </td>

                      <td className="px-4 py-3 text-zinc-400">
                        {event.plan_id}
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-zinc-300">
                          {event.outcome}
                        </span>

                        {event.failure_code && (
                          <div className="mt-1 font-mono text-[10px] text-zinc-600">
                            {event.failure_code}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-zinc-500">
                        {event.http_status ??
                          "—"}
                      </td>

                      <td className="px-4 py-3 text-zinc-300">
                        {event.quota_remaining ??
                          "—"}
                        {event.quota_limit !==
                          null &&
                          ` / ${event.quota_limit}`}
                      </td>

                      <td className="px-4 py-3 text-zinc-500">
                        {formatDate(
                          event.quota_reset_at
                        )}
                      </td>
                    </tr>
                  )
                )}

                {snapshot.activity.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-sm text-zinc-600"
                    >
                      No server-side analysis activity recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
