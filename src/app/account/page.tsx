import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import SignOutButton from "@/components/auth/SignOutButton";

import {
  createClient,
} from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.auth
      .getClaims();

  const claims =
    data?.claims;

  if (
    error ||
    !claims?.sub
  ) {
    redirect(
      "/login"
    );
  }

  const email =
    typeof claims.email ===
      "string"
      ? claims.email
      : "Authenticated user";

  return (
    <main className="min-h-screen bg-black px-4 py-12 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-xs font-medium tracking-[0.15em] text-zinc-600 transition hover:text-zinc-300"
          >
            ← AYZO
          </Link>

          <SignOutButton />
        </div>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.18em] text-violet-300">
            AYZO ACCOUNT
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">
            Account
          </h1>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-900 bg-black/30 p-5">
              <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                Signed in as
              </div>

              <div className="mt-2 break-all text-sm text-zinc-300">
                {email}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-black/30 p-5">
              <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                Plan
              </div>

              <div className="mt-2 text-sm text-zinc-300">
                Free
              </div>

              <div className="mt-1 text-[10px] text-zinc-600">
                Billing is not connected yet.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
