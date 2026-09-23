import Link from "next/link";

import {
  listAdminUsers,
} from "@/lib/adminAnalyticsRead";

export const dynamic =
  "force-dynamic";

function formatDate(
  value:
    string |
    null
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
    }
  ).format(
    new Date(value)
  );
}

export default async function AdminUsersPage() {
  const users =
    await listAdminUsers(
      1,
      100
    );

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
          Showing up to the first 100 AYZO accounts.
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-950 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              <tr>
                <th className="px-5 py-4">
                  User
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
              {users.map(
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

                    <td className="px-5 py-4 text-zinc-500">
                      {formatDate(
                        user.createdAt
                      )}
                    </td>

                    <td className="px-5 py-4 text-zinc-500">
                      {formatDate(
                        user.lastSignInAt
                      )}
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
