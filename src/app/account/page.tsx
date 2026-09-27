import AccountPlanCard from "@/components/account/AccountPlanCard";
import AccountUsageCard from "@/components/account/AccountUsageCard";
import AccountAdvancedWorkspace from "@/components/account/AccountAdvancedWorkspace";
import AccountPlanExperience from "@/components/account/AccountPlanExperience";
import AlertRulesPanel from "@/components/account/AlertRulesPanel";
import CustomAlertRulesPanel from "@/components/account/CustomAlertRulesPanel";
import BatchAnalysisPanel from "@/components/account/BatchAnalysisPanel";
import CustomLabelsNotesPanel from "@/components/account/CustomLabelsNotesPanel";
import ApiAccessPanel from "@/components/account/ApiAccessPanel";
import NoCodeDashboardsPanel from "@/components/account/NoCodeDashboardsPanel";
import PriorityAnalysisPanel from "@/components/account/PriorityAnalysisPanel";
import AdvancedWatchlistsPanel from "@/components/account/AdvancedWatchlistsPanel";
import DeviceSecurityPanel from "@/components/account/DeviceSecurityPanel";
import CasesPanel from "@/components/account/CasesPanel";
import EvidenceLockerPanel from "@/components/account/EvidenceLockerPanel";
import CompareInvestigationsPanel from "@/components/account/CompareInvestigationsPanel";
import EvidenceHistoryPanel from "@/components/account/EvidenceHistoryPanel";
import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import SignOutButton from "@/components/auth/SignOutButton";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

import {
  planHasFeature,
} from "@/lib/plans/registry";

import type {
  FeatureId,
} from "@/lib/plans/types";

export const dynamic =
  "force-dynamic";

export default async function AccountPage() {
  const {
    supabase,
    userId,
    userEmail,
    deviceRevoked,
  } =
    await getAuthenticatedAccountContext();

  if (!userId) {
    redirect(
      deviceRevoked
        ? "/login?error=device_replaced"
        : "/login"
    );
  }

  const email =
    userEmail ??
    "Authenticated user";

  const {
    entitlement,
    billingAvailable,
  } =
    await getServerEntitlement();

  const accountFeatureEnabled =
    (
      feature:
        FeatureId
    ) =>
      billingAvailable &&
      planHasFeature(
        entitlement.planId,
        feature
      );

  const evidenceHistoryEnabled =
    accountFeatureEnabled(
      "historicalChanges"
    );

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

  const evidenceResult =
    evidenceHistoryEnabled
      ? await supabase
          .from(
            "evidence_snapshots"
          )
          .select(`
            id,
            network,
            subject_type,
            subject_value,
            captured_at,
            created_at
          `)
          .eq(
            "user_id",
            userId
          )
          .order(
            "captured_at",
            {
              ascending:
                false,
            }
          )
          .limit(
            12
          )
      : {
          data:
            [],
          error:
            null,
        };

  const evidenceSnapshots =
    evidenceResult.data ??
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

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AccountPlanCard />

            <AccountUsageCard />

            <div className="rounded-2xl border border-zinc-900 bg-black/30 p-5">
              <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                Signed in as
              </div>

              <div className="mt-2 break-all text-sm text-zinc-300">
                {email}
              </div>
            </div>
          </div>

          <nav
            aria-label="Account shortcuts"
            className="mt-5 flex flex-wrap gap-2 border-t border-zinc-900 pt-4"
          >
            <a
              href="#plan-experience"
              className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1.5 text-[10px] font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-200"
            >
              Plan capabilities
            </a>

            {evidenceHistoryEnabled && (
              <a
                href="#evidence-history"
                className="rounded-full border border-violet-500/15 bg-violet-500/[0.04] px-3 py-1.5 text-[10px] font-medium text-violet-300 transition hover:bg-violet-500/[0.08]"
              >
                Evidence history
              </a>
            )}

            <a
              href="#saved-analyses"
              className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1.5 text-[10px] font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-200"
            >
              Saved analyses
            </a>

            <a
              href="#watchlists"
              className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1.5 text-[10px] font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-200"
            >
              Watchlists
            </a>

            <a
              href="#account-essentials"
              className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1.5 text-[10px] font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-200"
            >
              Security & alerts
            </a>

            {accountFeatureEnabled(
              "advancedWatchlists"
            ) && (
              <a
                href="#advanced-workspace"
                className="rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1.5 text-[10px] font-medium text-violet-300 transition hover:bg-violet-500/10"
              >
                Advanced workspace
              </a>
            )}
          </nav>
        </section>

        <AccountPlanExperience
          planId={
            entitlement.planId
          }
        />

        {evidenceHistoryEnabled && (
          <EvidenceHistoryPanel
            snapshots={
              evidenceSnapshots
            }
            unavailable={
              Boolean(
                evidenceResult.error
              )
            }
          />
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section
            id="saved-analyses"
            className="scroll-mt-24 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6"
          >
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

          <section
            id="watchlists"
            className="scroll-mt-24 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6"
          >
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

        <div
          id="account-essentials"
          className="mt-8 scroll-mt-24 border-t border-zinc-900 pt-6"
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Account essentials
          </div>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-600">
            Security and monitoring controls that stay available as part of your AYZO account.
          </p>
        </div>

        <DeviceSecurityPanel />

        <AlertRulesPanel />

        {accountFeatureEnabled(
          "advancedWatchlists"
        ) && (
          <AccountAdvancedWorkspace
            title="Advanced workspace"
            investigations={
              <>
                <AdvancedWatchlistsPanel />

                {accountFeatureEnabled(
                  "compareInvestigations"
                ) && (
                  <CompareInvestigationsPanel />
                )}

                {accountFeatureEnabled(
                  "cases"
                ) && (
                  <CasesPanel />
                )}

                {accountFeatureEnabled(
                  "evidenceLocker"
                ) && (
                  <EvidenceLockerPanel />
                )}
              </>
            }
            monitoring={
              <>
                {accountFeatureEnabled(
                  "customAlertRules"
                ) && (
                  <CustomAlertRulesPanel />
                )}
              </>
            }
            automation={
              <>
                {accountFeatureEnabled(
                  "batchAnalysis"
                ) && (
                  <BatchAnalysisPanel />
                )}

                {accountFeatureEnabled(
                  "priorityAnalysis"
                ) && (
                  <PriorityAnalysisPanel />
                )}
              </>
            }
            developer={
              <>
                {accountFeatureEnabled(
                  "apiAccess"
                ) && (
                  <ApiAccessPanel />
                )}
              </>
            }
            customization={
              <>
                {accountFeatureEnabled(
                  "customLabelsNotes"
                ) && (
                  <CustomLabelsNotesPanel />
                )}

                {accountFeatureEnabled(
                  "noCodeDashboards"
                ) && (
                  <NoCodeDashboardsPanel />
                )}
              </>
            }
          />
        )}

        <div className="mt-5 rounded-2xl border border-violet-500/10 bg-violet-500/5 px-5 py-4 text-xs leading-5 text-zinc-500">
          Saved research and watchlists are backed by authenticated AYZO account storage. Save analyses and organize monitored entities directly from AYZO intelligence reports.
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-5 py-4 text-xs leading-5 text-zinc-500">
          Need help? Contact AYZO Support at{" "}
          <a
            href="mailto:contact@ayzo.io"
            className="font-medium text-zinc-300 transition hover:text-white"
          >
            contact@ayzo.io
          </a>
          .
        </div>
      </div>
    </main>
  );
}
