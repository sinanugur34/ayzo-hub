"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AnalysisActions from "@/components/AnalysisActions";
import AnalysisLimitCard from "@/components/AnalysisLimitCard";
import AnalysisWorkspaceDetails from "@/components/AnalysisWorkspaceDetails";
import AnalysisWorkspaceOverview from "@/components/AnalysisWorkspaceOverview";
import AnalysisWorkspaceResearchTools from "@/components/AnalysisWorkspaceResearchTools";
import ActivityTimeline from "@/components/ActivityTimeline";

import {
  trackEvent,
} from "@/lib/analytics/client";

import {
  buildHistoricalSnapshot,
} from "@/lib/account/historicalSnapshot";

import {
  buildTonActivityTimeline,
  buildTonVisualEvidenceGraph,
} from "@/lib/intelligence/ton/presentation";

import type {
  TonIntelligence,
} from "@/lib/intelligence/ton/engine";

function formatNano(
  value:
    string
) {
  try {
    const nano =
      BigInt(
        value
      );

    const whole =
      nano /
      1_000_000_000n;

    const fraction =
      (
        nano %
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
      ? `${whole}.${fraction} TON`
      : `${whole} TON`;
  } catch {
    return `${value} nanotons`;
  }
}

export default function TonIntelligenceReport({
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
      TonIntelligence |
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
    limited,
    setLimited,
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
                "ton_intelligence",

              network:
                "ton",
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
                      "ton",

                    address,
                  }),
              }
            );

          const body =
            await response
              .json();

          if (cancelled) {
            return;
          }

          if (
            response.status ===
              429
          ) {
            setLimited(
              true
            );

            return;
          }

          if (
            !response.ok ||
            !body.ok
          ) {
            setError(
              body.error ||
                "TON intelligence request failed."
            );

            return;
          }

          setData(
            body as
              TonIntelligence
          );
        } catch {
          if (!cancelled) {
            setError(
              "TON intelligence is temporarily unavailable."
            );
          }
        } finally {
          if (!cancelled) {
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
          ? buildTonActivityTimeline(
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
          ? buildTonVisualEvidenceGraph(
              data
            )
          : null,
      [
        data,
      ]
    );

  const historical =
    useMemo(
      () =>
        data
          ? buildHistoricalSnapshot(
              "ton",
              data
            )
          : null,
      [
        data,
      ]
    );

  if (loading) {
    return (
      <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-8 text-zinc-400">
        Reading TON account, transaction and Jetton evidence…
      </div>
    );
  }

  if (limited) {
    return (
      <AnalysisLimitCard />
    );
  }

  if (
    error ||
    !data
  ) {
    return (
      <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-red-300">
        {error ||
          "TON intelligence unavailable."}
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 text-left">
      <AnalysisWorkspaceOverview
        networkLabel="TON"
        subject={data.address}
        coverage={data.coverage}
        findings={data.findings}
        caveats={data.caveats}
        graph={graph}
        timeline={timeline}
      />

      <AnalysisWorkspaceDetails>
        <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4 sm:p-8">
          {[
            [
              "TON balance",
              formatNano(
                data.account
                  .balanceNano
              ),
            ],
            [
              "Account status",
              data.account.status ||
                "unknown",
            ],
            [
              "Transactions",
              String(
                data.history
                  .transactions
                  .length
              ),
            ],
            [
              "Jetton holdings",
              String(
                data.derived
                  .jettons
                  .positiveBalanceCount
              ),
            ],
            [
              "Incoming TON",
              formatNano(
                data.derived
                  .flow
                  .incomingNano
              ),
            ],
            [
              "Outgoing TON",
              formatNano(
                data.derived
                  .flow
                  .outgoingNano
              ),
            ],
            [
              "Observed fees",
              formatNano(
                data.derived
                  .flow
                  .totalFeesNano
              ),
            ],
            [
              "Relationships",
              String(
                data.derived
                  .counterparties
                  .count
              ),
            ],
          ].map(
            (
              [
                label,
                value,
              ]
            ) => (
              <div
                key={label}
                className="rounded-2xl border border-zinc-900 bg-black/20 p-4"
              >
                <div className="text-[9px] tracking-[0.12em] text-zinc-700">
                  {label.toUpperCase()}
                </div>

                <div className="mt-2 break-words text-sm font-medium text-zinc-200">
                  {value}
                </div>
              </div>
            )
          )}
        </div>

        {data.jettons
          .wallets
          .length >
          0 && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              JETTON HOLDINGS
            </div>

            <div className="mt-4 space-y-2">
              {data.jettons
                .wallets
                .slice(
                  0,
                  12
                )
                .map(
                  wallet => (
                    <div
                      key={
                        wallet
                          .walletAddress
                      }
                      className="rounded-xl border border-zinc-900 bg-black/20 p-4"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <strong className="text-xs text-zinc-300">
                          {wallet.symbol ||
                            wallet.name ||
                            "Jetton"}
                        </strong>

                        <span className="text-xs text-zinc-500">
                          {wallet.balance}
                        </span>
                      </div>

                      <div className="mt-2 break-all font-mono text-[10px] text-zinc-700">
                        Master:{" "}
                        {wallet.jettonMaster}
                      </div>

                      {wallet.scamMetadata ===
                        true && (
                        <p className="mt-2 text-xs text-amber-400">
                          Provider metadata flags this token as suspicious. Metadata is not used as proof of authenticity.
                        </p>
                      )}
                    </div>
                  )
                )}
            </div>
          </div>
        )}

        {data.derived
          .observedFunding && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-emerald-400">
              OBSERVED INBOUND TON EVIDENCE
            </div>

            <p className="mt-3 break-all font-mono text-xs text-zinc-400">
              {
                data.derived
                  .observedFunding
                  .sourceAddress
              }
            </p>

            <p className="mt-2 text-xs text-zinc-600">
              {
                formatNano(
                  data.derived
                    .observedFunding
                    .amountNano
                )
              }
            </p>
          </div>
        )}

        {timeline && (
          <ActivityTimeline
            timeline={timeline}
          />
        )}
      </AnalysisWorkspaceDetails>

      <div className="border-t border-zinc-900 p-6 sm:p-8">
        <AnalysisWorkspaceResearchTools>
          <AnalysisActions
            network="ton"
            subjectType="wallet"
            subjectValue={data.address}
            title="TON Address Analysis"
            analysisPayload={historical}
            askEvidencePayload={{
              adapter:
                "ton",

              network:
                "ton",

              account:
                data.account,

              history:
                data.history,

              jettons:
                data.jettons,

              derived:
                data.derived,

              modules:
                data.modules,

              findings:
                data.findings,

              caveats:
                data.caveats,
            }}
          />
        </AnalysisWorkspaceResearchTools>
      </div>
    </div>
  );
}
