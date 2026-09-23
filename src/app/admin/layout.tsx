import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  getAdminAccess,
} from "@/lib/adminAccess";

export const dynamic =
  "force-dynamic";

export const metadata: Metadata = {
  title:
    "AYZO Admin",

  robots: {
    index:
      false,
    follow:
      false,
    nocache:
      true,
  },
};

export default async function AdminLayout({
  children,
}: {
  children:
    ReactNode;
}) {
  const access =
    await getAdminAccess();

  if (
    !access.authorized
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-900 pb-6">
          <div>
            <div className="text-xs font-semibold tracking-[0.18em] text-violet-300">
              AYZO INTERNAL
            </div>

            <div className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              Admin Analytics
            </div>
          </div>

          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/admin"
              className="rounded-xl border border-zinc-800 px-3 py-2 text-zinc-300 transition hover:border-zinc-600 hover:text-white"
            >
              Dashboard
            </Link>

            <Link
              href="/admin/users"
              className="rounded-xl border border-zinc-800 px-3 py-2 text-zinc-300 transition hover:border-zinc-600 hover:text-white"
            >
              Users
            </Link>

            <Link
              href="/account"
              className="rounded-xl border border-zinc-800 px-3 py-2 text-zinc-500 transition hover:text-zinc-300"
            >
              Account
            </Link>
          </nav>
        </header>

        {children}
      </div>
    </main>
  );
}
