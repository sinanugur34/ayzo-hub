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
  buildStellarActivityTimeline,
  buildStellarVisualEvidenceGraph,
} from "@/lib/intelligence/stellar/presentation";

import type {
  StellarIntelligence,
} from "@/lib/intelligence/stellar/engine";

export default function StellarIntelligenceReport({
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
      StellarIntelligence |
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
                      "stellar",

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
                "Stellar intelligence request failed."
            );

            return;
          }

          setData(
            body as
              StellarIntelligence
          );
        } catch {
          if (!cancelled) {
            setError(
              "Stellar intelligence is temporarily unavailable."
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
          ? buildStellarActivityTimeline(
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
          ? buildStellarVisualEvidenceGraph(
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
              "stellar",
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
        Reading Stellar account, trustline and payment evidence…
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
          "Stellar intelligence unavailable."}
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 text-left">
      <AnalysisWorkspaceOverview
        networkLabel="Stellar"
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
              "XLM balance",
              data.derived
                .nativeBalanceXlm,
            ],
            [
              "Trustlines",
              String(
                data.derived
                  .trustlines
                  .count
              ),
            ],
            [
              "Asset issuers",
              String(
                data.derived
                  .trustlines
                  .issuerCount
              ),
            ],
            [
              "Signers",
              String(
                data.account
                  .signers
                  .length
              ),
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
              "Payments",
              String(
                data.history
                  .payments
                  .length
              ),
            ],
            [
              "Open offers",
              String(
                data.derived
                  .trading
                  .openOfferCount
              ),
            ],
            [
              "Trades observed",
              String(
                data.derived
                  .trading
                  .observedTradeCount
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

        {data.account
          .balances
          .length >
          0 && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              BALANCES & TRUSTLINES
            </div>

            <div className="mt-4 space-y-2">
              {data.account
                .balances
                .slice(
                  0,
                  16
                )
                .map(
                  (
                    balance,
                    index
                  ) => (
                    <div
                      key={`${balance.assetType}:${balance.assetCode ?? "native"}:${balance.assetIssuer ?? index}`}
                      className="rounded-xl border border-zinc-900 bg-black/20 p-4"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <strong className="text-xs text-zinc-300">
                          {balance.assetType ===
                            "native"
                            ? "XLM"
                            : balance.assetCode ||
                              balance.assetType}
                        </strong>

                        <span className="text-xs text-zinc-500">
                          {balance.balance}
                        </span>
                      </div>

                      {balance.assetIssuer && (
                        <div className="mt-2 break-all font-mono text-[10px] text-zinc-700">
                          Issuer:{" "}
                          {balance.assetIssuer}
                        </div>
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
              OBSERVED EARLY INBOUND EVIDENCE
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
                data.derived
                  .observedFunding
                  .amount ??
                "Amount unavailable"
              }{" "}
              {
                data.derived
                  .observedFunding
                  .asset
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
            network="stellar"
            subjectType="wallet"
            subjectValue={data.address}
            title="Stellar Account Analysis"
            analysisPayload={historical}
            askEvidencePayload={{
              adapter:
                "stellar",

              network:
                "stellar",

              account:
                data.account,

              history:
                data.history,

              market:
                data.market,

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
