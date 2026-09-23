import Link from "next/link";

import AdminLocalDateTime from "@/components/admin/AdminLocalDateTime";

import {
  searchAdminUsers,
} from "@/lib/adminAnalyticsRead";

import {
  parseAdminUserFilters,
} from "@/lib/adminUserFilters";

export const dynamic =
  "force-dynamic";

type SearchParams = Promise<
  Record<
    string,
    string |
    string[] |
    undefined
  >
>;

function readRaw(
  params:
    Record<
      string,
      string |
      string[] |
      undefined
    >,
  key: string
) {
  const value =
    params[key];

  return typeof value ===
    "string"
    ? value
    : "";
}

function buildPageHref(
  params:
    Record<
      string,
      string |
      string[] |
      undefined
    >,
  page: number
) {
  const query =
    new URLSearchParams();

  for (
    const [
      key,
      value,
    ] of Object.entries(
      params
    )
  ) {
    if (
      key === "page" ||
      typeof value !==
        "string" ||
      !value
    ) {
      continue;
    }

    query.set(
      key,
      value
    );
  }

  query.set(
    "page",
    String(
      page
    )
  );

  return `/admin/users?${query.toString()}`;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams:
    SearchParams;
}) {
  const rawParams =
    await searchParams;

  const filters =
    parseAdminUserFilters(
      rawParams
    );

  const result =
    await searchAdminUsers(
      filters
    );

  const hasPrevious =
    result.page > 1;

  const hasNext =
    result.page <
    result.totalPages;

  return (
    <div className="py-8">
      <div>
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          ACCOUNTS
        </div>

        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Users
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Server-side AYZO account search with signup and billing filters.
        </p>
      </div>

      <form
        method="get"
        className="mt-6 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5 md:grid-cols-2 xl:grid-cols-4"
      >
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Email
          </span>

          <input
            name="email"
            type="search"
            defaultValue={
              readRaw(
                rawParams,
                "email"
              )
            }
            placeholder="user@example.com"
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-violet-500"
          />
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Channel
          </span>

          <select
            name="channel"
            defaultValue={
              readRaw(
                rawParams,
                "channel"
              )
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-violet-500"
          >
            <option value="">
              All
            </option>
            <option value="web">
              Web
            </option>
            <option value="android">
              Android
            </option>
            <option value="ios">
              iOS
            </option>
            <option value="unknown">
              Unknown
            </option>
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Device
          </span>

          <select
            name="device"
            defaultValue={
              readRaw(
                rawParams,
                "device"
              )
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-violet-500"
          >
            <option value="">
              All
            </option>
            <option value="desktop">
              Desktop
            </option>
            <option value="phone">
              Phone
            </option>
            <option value="tablet">
              Tablet
            </option>
            <option value="unknown">
              Unknown
            </option>
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            OS
          </span>

          <select
            name="os"
            defaultValue={
              readRaw(
                rawParams,
                "os"
              )
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-violet-500"
          >
            <option value="">
              All
            </option>
            <option value="windows">
              Windows
            </option>
            <option value="macos">
              macOS
            </option>
            <option value="linux">
              Linux
            </option>
            <option value="android">
              Android
            </option>
            <option value="ios">
              iOS
            </option>
            <option value="other">
              Other
            </option>
            <option value="unknown">
              Unknown
            </option>
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Country
          </span>

          <input
            name="country"
            type="text"
            maxLength={7}
            defaultValue={
              readRaw(
                rawParams,
                "country"
              )
            }
            placeholder="TR"
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm uppercase text-zinc-200 outline-none transition focus:border-violet-500"
          />
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Created from
          </span>

          <input
            name="from"
            type="date"
            defaultValue={
              readRaw(
                rawParams,
                "from"
              )
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-violet-500"
          />
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Created to
          </span>

          <input
            name="to"
            type="date"
            defaultValue={
              readRaw(
                rawParams,
                "to"
              )
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-violet-500"
          />
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Plan
          </span>

          <select
            name="plan"
            defaultValue={
              readRaw(
                rawParams,
                "plan"
              )
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-violet-500"
          >
            <option value="">
              All
            </option>
            <option value="free">
              Free
            </option>
            <option value="pro">
              Pro
            </option>
            <option value="advanced">
              Advanced
            </option>
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Provider
          </span>

          <select
            name="provider"
            defaultValue={
              readRaw(
                rawParams,
                "provider"
              )
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-violet-500"
          >
            <option value="">
              All
            </option>
            <option value="creem">
              Creem
            </option>
            <option value="google_play">
              Google Play
            </option>
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Subscription status
          </span>

          <select
            name="status"
            defaultValue={
              readRaw(
                rawParams,
                "status"
              )
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-violet-500"
          >
            <option value="">
              All
            </option>
            <option value="pending">
              Pending
            </option>
            <option value="active">
              Active
            </option>
            <option value="canceling">
              Canceling
            </option>
            <option value="past_due">
              Past due
            </option>
            <option value="inactive">
              Inactive
            </option>
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Billing interval
          </span>

          <select
            name="interval"
            defaultValue={
              readRaw(
                rawParams,
                "interval"
              )
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-violet-500"
          >
            <option value="">
              All
            </option>
            <option value="monthly">
              Monthly
            </option>
            <option value="annual">
              Annual
            </option>
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Per page
          </span>

          <select
            name="perPage"
            defaultValue={
              String(
                filters.perPage
              )
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-violet-500"
          >
            <option value="10">
              10
            </option>
            <option value="25">
              25
            </option>
            <option value="50">
              50
            </option>
            <option value="100">
              100
            </option>
          </select>
        </label>

        <div className="flex items-end gap-3 md:col-span-2 xl:col-span-4">
          <button
            type="submit"
            className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400"
          >
            Apply filters
          </button>

          <Link
            href="/admin/users"
            className="rounded-xl border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-500">
          {result.total.toLocaleString(
            "en"
          )}{" "}
          matching account
          {result.total === 1
            ? ""
            : "s"}
        </div>

        <div className="text-xs text-zinc-600">
          Page{" "}
          {result.page} of{" "}
          {result.totalPages}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1660px] text-left text-sm">
            <thead className="bg-zinc-950 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              <tr>
                <th className="px-5 py-4">
                  User
                </th>

                <th className="px-5 py-4">
                  Plan
                </th>

                <th className="px-5 py-4">
                  Provider
                </th>

                <th className="px-5 py-4">
                  Sub status
                </th>

                <th className="px-5 py-4">
                  Billing
                </th>

                <th className="px-5 py-4">
                  Channel
                </th>

                <th className="px-5 py-4">
                  Device
                </th>

                <th className="px-5 py-4">
                  OS
                </th>

                <th className="px-5 py-4">
                  Country
                </th>

                <th className="px-5 py-4">
                  Created
                </th>

                <th className="px-5 py-4">
                  Last sign in
                </th>

                <th className="px-5 py-4 text-right">
                  Detail
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-900 bg-black">
              {result.users.map(
                user => (
                  <tr
                    key={
                      user.id
                    }
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-zinc-200">
                        {user.email ??
                          "No email"}
                      </div>

                      <div className="mt-1 font-mono text-[10px] text-zinc-700">
                        {user.id}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-medium text-zinc-200">
                        {
                          user
                            .billing
                            .currentPlan
                        }
                      </span>
                    </td>

                    <td className="px-5 py-4 text-zinc-300">
                      {
                        user
                          .billing
                          .provider ??
                        "—"
                      }
                    </td>

                    <td className="px-5 py-4 text-zinc-300">
                      {
                        user
                          .billing
                          .status ??
                        "—"
                      }
                    </td>

                    <td className="px-5 py-4 text-zinc-300">
                      {
                        user
                          .billing
                          .interval ??
                        "—"
                      }
                    </td>

                    <td className="px-5 py-4 text-zinc-300">
                      {
                        user
                          .signupSource
                          .channel
                      }
                    </td>

                    <td className="px-5 py-4 text-zinc-300">
                      {
                        user
                          .signupSource
                          .deviceClass
                      }
                    </td>

                    <td className="px-5 py-4 text-zinc-300">
                      {
                        user
                          .signupSource
                          .osFamily
                      }
                    </td>

                    <td className="px-5 py-4 text-zinc-300">
                      {
                        user
                          .signupSource
                          .countryCode
                      }
                    </td>

                    <td className="px-5 py-4 text-zinc-500">
                      <AdminLocalDateTime
                        value={
                          user.createdAt
                        }
                      />
                    </td>

                    <td className="px-5 py-4 text-zinc-500">
                      <AdminLocalDateTime
                        value={
                          user.lastSignInAt
                        }
                      />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/users/${encodeURIComponent(
                          user.id
                        )}`}
                        className="font-medium text-violet-300 hover:text-violet-200"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                )
              )}

              {result.users.length ===
                0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="px-5 py-12 text-center text-sm text-zinc-600"
                  >
                    No users match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        {hasPrevious ? (
          <Link
            href={
              buildPageHref(
                rawParams,
                result.page -
                  1
              )
            }
            className="rounded-xl border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-700"
          >
            ← Previous
          </Link>
        ) : (
          <span className="rounded-xl border border-zinc-900 px-4 py-2 text-sm text-zinc-700">
            ← Previous
          </span>
        )}

        <div className="text-xs text-zinc-600">
          {result.total.toLocaleString(
            "en"
          )}{" "}
          total
        </div>

        {hasNext ? (
          <Link
            href={
              buildPageHref(
                rawParams,
                result.page +
                  1
              )
            }
            className="rounded-xl border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-700"
          >
            Next →
          </Link>
        ) : (
          <span className="rounded-xl border border-zinc-900 px-4 py-2 text-sm text-zinc-700">
            Next →
          </span>
        )}
      </div>
    </div>
  );
}
