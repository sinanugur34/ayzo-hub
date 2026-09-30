"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  trackEvent,
} from "@/lib/analytics/client";

import AnalysisActions from "@/components/AnalysisActions";
import AnalysisLimitCard from "@/components/AnalysisLimitCard";
import AnalysisWorkspaceDetails from "@/components/AnalysisWorkspaceDetails";
import AnalysisWorkspaceOverview from "@/components/AnalysisWorkspaceOverview";
import AnalysisWorkspaceResearchTools from "@/components/AnalysisWorkspaceResearchTools";
import ActivityTimeline from "@/components/ActivityTimeline";
import WalletTrackRecordPanel from "@/components/WalletTrackRecord";
import SuiExpandedAnalysis from "@/components/SuiExpandedAnalysis";

import {
  buildHistoricalSnapshot,
} from "@/lib/account/historicalSnapshot";

import {
  buildSuiActivityTimeline,
  buildSuiVisualEvidenceGraph,
  buildSuiWalletTrackRecord,
} from "@/lib/intelligence/sui/presentation";

import type {
  SuiIntelligence,
} from "@/lib/intelligence/sui/engine";

type SuiFailure = {
  ok:
    false;

  error:
    string;
};

function formatMist(
  value:
    string
) {
  try {
    const mist =
      BigInt(
        value
      );

    const whole =
      mist /
      1_000_000_000n;

    const fraction =
      (
        mist %
        1_000_000_000n
      )
        .toString()
        .padStart(
          9,
          "0"
        )
        .replace(
          /0+$/,
          ""
        );

    return fraction
      ? `${whole}.${fraction} SUI`
      : `${whole} SUI`;
  } catch {
    return `${value} MIST`;
  }
}

function short(
  value:
    string | null
) {
  if (!value) {
    return "Unavailable";
  }

  return value.length <=
    24
    ? value
    : (
        value.slice(
          0,
          10
        ) +
        "..." +
        value.slice(
          -8
        )
      );
}

export default function SuiIntelligenceReport({
  address,
}: {
  address:
    string;
}) {
  const [
    data,
    setData,
  ] =
    useState<
      SuiIntelligence |
      null
    >(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    dailyLimitReached,
    setDailyLimitReached,
  ] =
    useState(
      false
    );

  useEffect(
    () => {
      let cancelled =
        false;

      void (async () => {
        try {
          trackEvent(
            "analysis_started",
            {
              feature:
                "sui_intelligence",

              network:
                "sui",
            }
          );

          const response =
            await fetch(
              "/api/intelligence",
              {
                method:
                  "POST",

                credentials:
                  "same-origin",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    network:
                      "sui",

                    address,
                  }),
              }
            );

          const body =
            await response
              .json() as
                | SuiIntelligence
                | SuiFailure;

          if (cancelled) {
            return;
          }

          if (
            response.status ===
              429
          ) {
            setDailyLimitReached(
              true
            );

            trackEvent(
              "analysis_quota_blocked",
              {
                feature:
                  "sui_intelligence",

                network:
                  "sui",

                status:
                  429,
              }
            );

            return;
          }

          if (
            !body.ok
          ) {
            setError(
              body.error
            );

            return;
          }

          if (
            !response.ok
          ) {
            setError(
              "Sui intelligence request failed."
            );

            return;
          }

          setData(
            body
          );

          trackEvent(
            "intelligence_completed",
            {
              feature:
                "sui_intelligence",

              network:
                "sui",
            }
          );
        } catch {
          if (
            !cancelled
          ) {
            setError(
              "Sui intelligence is temporarily unavailable."
            );
          }
        } finally {
          if (
            !cancelled
          ) {
            setLoading(
              false
            );
          }
        }
      })();

      return () => {
        cancelled =
          true;
      };
    },
    [
      address,
    ]
  );

  const timeline =
    useMemo(
      () =>
        data
          ? buildSuiActivityTimeline(
              data
            )
          : null,
      [
        data,
      ]
    );

  const graph =
    useMemo(
      () =>
        data
          ? buildSuiVisualEvidenceGraph(
              data
            )
          : null,
      [
        data,
      ]
    );

  const trackRecord =
    useMemo(
      () =>
        data
          ? buildSuiWalletTrackRecord(
              data
            )
          : null,
      [
        data,
      ]
    );

  const historicalSnapshot =
    useMemo(
      () =>
        data
          ? buildHistoricalSnapshot(
              "sui",
              data
            )
          : null,
      [
        data,
      ]
    );

  const askEvidencePayload =
    useMemo(
      () =>
        data
          ? {
              adapter:
                "sui",

              network:
                "sui",

              coverage:
                data.coverage,

              account:
                data.account,

              balances:
                data.balances,

              ownedObjects:
                data.ownedObjects,

              subjectObject:
                data.subjectObject,

              history:
                data.history,

              derived:
                data.derived,

              modules:
                data.modules,

              findings:
                data.findings,

              caveats:
                data.caveats,
            }
          : null,
      [
        data,
      ]
    );

  if (loading) {
    return (
      <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 text-left sm:p-8">
        <div className="text-xs font-medium tracking-[0.18em] text-cyan-300">
          AYZO SUI INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-zinc-100">
          Reading Sui mainnet evidence
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          Reading balances, owned objects and bounded affected-transaction evidence.
        </p>
      </div>
    );
  }

  if (
    dailyLimitReached
  ) {
    return (
      <AnalysisLimitCard />
    );
  }

  if (
    error ||
    !data
  ) {
    return (
      <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/5 p-6 text-left sm:p-8">
        <div className="text-xs font-medium tracking-[0.18em] text-red-300">
          SUI INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-white">
          Analysis unavailable
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          {error ||
            "Sui intelligence is temporarily unavailable."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 text-left">
      <AnalysisWorkspaceOverview
        networkLabel="Sui"
        subject={data.address}
        coverage={data.coverage}
        findings={data.findings}
        caveats={data.caveats}
        graph={graph}
        timeline={timeline}
      />

      <AnalysisWorkspaceDetails>
        <div className="border-b border-zinc-900 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium tracking-[0.18em] text-cyan-300">
                AYZO SUI INTELLIGENCE
              </div>

              <h3 className="mt-2 text-2xl font-semibold text-white">
                Evidence report
              </h3>

              <p className="mt-2 break-all font-mono text-xs text-zinc-500">
                {data.address}
              </p>
            </div>

            <div className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1.5 text-[10px] font-medium tracking-[0.12em] text-zinc-400">
              {data.coverage.toUpperCase()} COVERAGE
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              SUI BALANCE
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {formatMist(
                data.account
                  .suiBalanceMist
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              COIN TYPES
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {
                data.derived
                  .assets
                  .positiveBalanceCount
              }
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              OWNED OBJECTS
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {data.ownedObjects.length}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              TRANSACTIONS
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {data.history.transactions.length}
            </div>
          </div>
        </div>

        {data.balances.length >
          0 && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              OBSERVED COIN BALANCES
            </div>

            <div className="mt-4 space-y-2">
              {data.balances
                .slice(
                  0,
                  12
                )
                .map(
                  balance => (
                    <div
                      key={
                        balance.coinType
                      }
                      className="rounded-xl border border-zinc-900 bg-black/20 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-xs text-zinc-300">
                          {balance.symbol ||
                            balance.name ||
                            "Sui coin"}
                        </strong>

                        <span className="text-xs text-zinc-500">
                          {balance.totalBalance}
                        </span>
                      </div>

                      <div className="mt-2 break-all font-mono text-[10px] text-zinc-700">
                        {balance.coinType}
                      </div>
                    </div>
                  )
                )}
            </div>
          </div>
        )}

        {data.history
          .transactions
          .length >
          0 && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              RECENT AFFECTED TRANSACTIONS
            </div>

            <div className="mt-4 space-y-3">
              {data.history
                .transactions
                .slice(
                  0,
                  5
                )
                .map(
                  transaction => (
                    <div
                      key={
                        transaction
                          .transactionHash
                      }
                      className="rounded-2xl border border-zinc-800 bg-black/20 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="font-mono text-xs text-zinc-300">
                          {short(
                            transaction
                              .transactionHash
                          )}
                        </strong>

                        <span className="text-[10px] tracking-[0.12em] text-zinc-600">
                          {transaction.status ||
                            "OBSERVED"}
                        </span>
                      </div>

                      <div className="mt-3 text-xs text-zinc-600">
                        Sender:{" "}
                        {short(
                          transaction.sender
                        )}
                      </div>

                      <div className="mt-1 text-xs text-zinc-600">
                        Balance changes:{" "}
                        {
                          transaction
                            .balanceChanges
                            .length
                        }
                        {" · "}
                        Object changes:{" "}
                        {
                          transaction
                            .objectChanges
                            .length
                        }
                      </div>
                    </div>
                  )
                )}
            </div>
          </div>
        )}

        <div className="border-t border-zinc-900 p-6 sm:p-8">
          <SuiExpandedAnalysis
            data={data}
          />
        </div>

        {timeline && (
          <ActivityTimeline
            timeline={timeline}
          />
        )}

        {trackRecord && (
          <WalletTrackRecordPanel
            record={trackRecord}
            subjectLabel="Sui address"
            profileEligible={true}
          />
        )}
      </AnalysisWorkspaceDetails>

      <div className="border-t border-zinc-900 p-6 sm:p-8">
        <AnalysisWorkspaceResearchTools>
          <AnalysisActions
            network="sui"
            subjectType="wallet"
            subjectValue={data.address}
            title="Sui Address Analysis"
            analysisPayload={historicalSnapshot}
            askEvidencePayload={askEvidencePayload}
          />
        </AnalysisWorkspaceResearchTools>
      </div>

      <div className="border-t border-zinc-900 p-6 sm:p-8">
        <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
          EVIDENCE CAVEATS
        </div>

        <div className="mt-3 space-y-2">
          {data.caveats.map(
            caveat => (
              <p
                key={caveat}
                className="text-xs leading-5 text-zinc-600"
              >
                {caveat}
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
