import AccountPlanCard from "@/components/account/AccountPlanCard";
import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import SignOutButton from "@/components/auth/SignOutButton";

import {
  createClient,
} from "@/lib/supabase/server";

export const dynamic =
  "force-dynamic";

export default async function AccountPage() {
  const supabase =
    await createClient();

  const {
    data:
      claimsData,
    error:
      claimsError,
  } =
    await supabase.auth
      .getClaims();

  const claims =
    claimsData?.claims;

  if (
    claimsError ||
    !claims?.sub
  ) {
    redirect(
      "/login"
    );
  }

  const userId =
    claims.sub;

  const email =
    typeof claims.email ===
      "string"
      ? claims.email
      : "Authenticated user";

  const [
    savedResult,
    watchlistsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "saved_analyses"
        )
        .select(`
          id,
          network,
          subject_type,
          subject_value,
          title,
          created_at
        `)
        .eq(
          "user_id",
          userId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(10),

      supabase
        .from(
          "watchlists"
        )
        .select(`
          id,
          name,
          description,
          created_at
        `)
        .eq(
          "user_id",
          userId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(10),
    ]);

  const savedAnalyses =
    savedResult.data ?? [];

  const watchlists =
    watchlistsResult.data ??
    [];

  return (
    <main className="min-h-screen bg-black px-4 py-12 text-white">
      <div className="mx-auto w-full max-w-5xl">
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

            <AccountPlanCard />
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium tracking-[0.16em] text-violet-300">
                  RESEARCH
                </div>

                <h2 className="mt-2 text-xl font-semibold">
                  Saved Analyses
                </h2>
              </div>

              <div className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1 text-xs text-zinc-500">
                {savedAnalyses.length}
              </div>
            </div>

            {savedResult.error ? (
              <p className="mt-6 text-sm text-rose-300">
                Saved analyses are temporarily unavailable.
              </p>
            ) : savedAnalyses.length ===
              0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-zinc-800 p-5">
                <div className="text-sm text-zinc-300">
                  No saved analyses yet.
                </div>

                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  Your saved wallet, token and investigation
                  research will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                {savedAnalyses.map(
                  analysis => (
                    <div
                      key={
                        analysis.id
                      }
                      className="rounded-2xl border border-zinc-900 bg-black/30 p-4"
                    >
                      <div className="text-sm font-medium text-zinc-200">
                        {analysis.title ||
                          analysis.subject_value}
                      </div>

                      <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                        {analysis.network}
                        {" · "}
                        {analysis.subject_type}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium tracking-[0.16em] text-violet-300">
                  MONITORING
                </div>

                <h2 className="mt-2 text-xl font-semibold">
                  Watchlists
                </h2>
              </div>

              <div className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1 text-xs text-zinc-500">
                {watchlists.length}
              </div>
            </div>

            {watchlistsResult.error ? (
              <p className="mt-6 text-sm text-rose-300">
                Watchlists are temporarily unavailable.
              </p>
            ) : watchlists.length ===
              0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-zinc-800 p-5">
                <div className="text-sm text-zinc-300">
                  No watchlists yet.
                </div>

                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  Wallets, tokens and entities you monitor
                  will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                {watchlists.map(
                  watchlist => (
                    <div
                      key={
                        watchlist.id
                      }
                      className="rounded-2xl border border-zinc-900 bg-black/30 p-4"
                    >
                      <div className="text-sm font-medium text-zinc-200">
                        {watchlist.name}
                      </div>

                      {watchlist.description && (
                        <p className="mt-2 text-xs leading-5 text-zinc-600">
                          {watchlist.description}
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        </div>

        <div className="mt-5 rounded-2xl border border-violet-500/10 bg-violet-500/5 px-5 py-4 text-xs leading-5 text-zinc-500">
          Saved research and watchlists are backed by authenticated AYZO account storage. Save analyses and organize monitored entities directly from AYZO intelligence reports.
        </div>
      </div>
    </main>
  );
}
