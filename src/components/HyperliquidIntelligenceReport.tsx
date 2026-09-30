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
  buildHistoricalSnapshot,
} from "@/lib/account/historicalSnapshot";

import {
  buildHyperliquidActivityTimeline,
  buildHyperliquidVisualEvidenceGraph,
} from "@/lib/intelligence/hyperliquid/presentation";

import type {
  HyperliquidIntelligence,
} from "@/lib/intelligence/hyperliquid/engine";

function formatHypeWei(
  value:
    string
) {
  try {
    const raw =
      BigInt(
        value
      );

    const divisor =
      10n ** 18n;

    const whole =
      raw /
      divisor;

    const fraction =
      (
        raw %
        divisor
      )
        .toString()
        .padStart(
          18,
          "0"
        )
        .replace(
          /0+$/,
          ""
        )
        .slice(
          0,
          6
        );

    return fraction
      ? `${whole}.${fraction} HYPE`
      : `${whole} HYPE`;
  } catch {
    return value;
  }
}

export default function HyperliquidIntelligenceReport({
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
      HyperliquidIntelligence |
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
    limited,
    setLimited,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(
    () => {
      let cancelled =
        false;

      void (async () => {
        try {
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
                      "hyperliquid",

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
                "Hyperliquid intelligence request failed."
            );

            return;
          }

          setData(
            body as
              HyperliquidIntelligence
          );
        } catch {
          if (!cancelled) {
            setError(
              "Hyperliquid intelligence is temporarily unavailable."
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
          ? buildHyperliquidActivityTimeline(
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
          ? buildHyperliquidVisualEvidenceGraph(
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
              "hyperliquid",
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
        Reading HyperCore and HyperEVM evidence…
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
          "Hyperliquid intelligence unavailable."}
      </div>
    );
  }

  const core =
    data.executionSurfaces
      .hyperCore;

  const evm =
    data.executionSurfaces
      .hyperEvm;

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 text-left">
      <AnalysisWorkspaceOverview
        networkLabel="Hyperliquid"
        subject={data.address}
        coverage={data.coverage}
        findings={data.findings}
        caveats={data.caveats}
        graph={graph}
        timeline={timeline}
      />

      <AnalysisWorkspaceDetails>
        <div className="border-b border-zinc-900 p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
            HYPERCORE
          </div>

          <p className="mt-2 text-sm text-zinc-500">
            Exchange execution and clearinghouse evidence.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "Account value",
                core.accountValue ??
                  "Unavailable",
              ],
              [
                "Withdrawable",
                core.withdrawable ??
                  "Unavailable",
              ],
              [
                "Open positions",
                String(
                  data.derived
                    .hyperCore
                    .openPositionCount
                ),
              ],
              [
                "Spot balances",
                String(
                  data.derived
                    .hyperCore
                    .positiveSpotBalanceCount
                ),
              ],
              [
                "Recent fills",
                String(
                  data.derived
                    .hyperCore
                    .recentFillCount
                ),
              ],
              [
                "Funding payments",
                String(
                  data.derived
                    .hyperCore
                    .fundingPaymentCount
                ),
              ],
              [
                "Total position notional",
                core.totalNotionalPosition ??
                  "Unavailable",
              ],
              [
                "Margin used",
                core.totalMarginUsed ??
                  "Unavailable",
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
        </div>

        <div className="border-b border-zinc-900 p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
            HYPEREVM
          </div>

          <p className="mt-2 text-sm text-zinc-500">
            Latest EVM state. This is deliberately separate from HyperCore.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "Chain ID",
                String(
                  evm.chainId
                ),
              ],
              [
                "Native balance",
                formatHypeWei(
                  evm.balanceWei
                ),
              ],
              [
                "Transaction count",
                String(
                  evm.transactionCount
                ),
              ],
              [
                "Runtime code",
                evm.isContract
                  ? "Contract code observed"
                  : "No runtime code",
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
        </div>

        {core.positions.length >
          0 && (
          <div className="border-b border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              OPEN POSITIONS
            </div>

            <div className="mt-4 space-y-2">
              {core.positions.map(
                position => (
                  <div
                    key={
                      position.coin
                    }
                    className="rounded-xl border border-zinc-900 bg-black/20 p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong className="text-sm text-zinc-200">
                        {position.coin}
                      </strong>

                      <span className="text-xs text-zinc-500">
                        Size{" "}
                        {position.size}
                      </span>
                    </div>

                    <div className="mt-2 grid gap-2 text-xs text-zinc-600 sm:grid-cols-3">
                      <span>
                        Entry:{" "}
                        {position.entryPrice ??
                          "—"}
                      </span>

                      <span>
                        PnL:{" "}
                        {position.unrealizedPnl ??
                          "—"}
                      </span>

                      <span>
                        Liq:{" "}
                        {position.liquidationPrice ??
                          "—"}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {core.spotBalances.length >
          0 && (
          <div className="border-b border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              SPOT BALANCES
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {core.spotBalances.map(
                balance => (
                  <div
                    key={`${balance.coin}:${balance.token ?? "n"}`}
                    className="rounded-xl border border-zinc-900 bg-black/20 p-4"
                  >
                    <strong className="text-xs text-zinc-300">
                      {balance.coin}
                    </strong>

                    <div className="mt-2 text-sm text-zinc-500">
                      {balance.total}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <div className="border-b border-amber-500/10 bg-amber-500/[0.025] p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.18em] text-amber-400">
            FUNDING TERMINOLOGY
          </div>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            HyperCore funding payments shown here are perpetual funding-rate settlements. AYZO does not classify them as wallet funding provenance or as evidence of who funded this address.
          </p>
        </div>

        {timeline && (
          <ActivityTimeline
            timeline={timeline}
          />
        )}
      </AnalysisWorkspaceDetails>

      <div className="border-t border-zinc-900 p-6 sm:p-8">
        <AnalysisWorkspaceResearchTools>
          <AnalysisActions
            network="hyperliquid"
            subjectType="wallet"
            subjectValue={data.address}
            title="Hyperliquid Account Analysis"
            analysisPayload={historical}
            askEvidencePayload={{
              adapter:
                "hyperliquid",

              network:
                "hyperliquid",

              executionSurfaces:
                data.executionSurfaces,

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
