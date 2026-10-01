"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import ActivityTimeline from "@/components/ActivityTimeline";
import AnalysisActions from "@/components/AnalysisActions";
import AnalysisLimitCard from "@/components/AnalysisLimitCard";
import AnalysisWorkspaceDetails from "@/components/AnalysisWorkspaceDetails";
import AnalysisWorkspaceOverview from "@/components/AnalysisWorkspaceOverview";
import AnalysisWorkspaceResearchTools from "@/components/AnalysisWorkspaceResearchTools";

import {
  buildHistoricalSnapshot,
} from "@/lib/account/historicalSnapshot";

import type {
  CosmosIntelligence,
} from "@/lib/intelligence/cosmos/engine";

import type {
  InjectiveIntelligence,
} from "@/lib/intelligence/injective/engine";

import {
  buildCosmosSdkActivityTimeline,
  buildCosmosSdkVisualEvidenceGraph,
} from "@/lib/intelligence/cosmosSdkPresentation";

type Network =
  "cosmos" |
  "injective";

type Data =
  CosmosIntelligence |
  InjectiveIntelligence;

type Failure = {
  ok:
    false;

  error:
    string;
};

export default function CosmosSdkIntelligenceReport({
  address,
  network,
}: {
  address:
    string;

  network:
    Network;
}) {
  const [
    data,
    setData,
  ] =
    useState<
      Data |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    limited,
    setLimited,
  ] =
    useState(false);

  const label =
    network ===
      "injective"
      ? "Injective"
      : "Cosmos Hub";

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
                    network,
                    address,
                  }),
              }
            );

          const body =
            await response
              .json() as
              | Data
              | Failure;

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
              (
                "error" in body &&
                typeof body.error ===
                  "string"
                  ? body.error
                  : null
              ) ||
              `${label} intelligence request failed.`
            );

            return;
          }

          setData(
            body
          );
        } catch {
          if (!cancelled) {
            setError(
              `${label} intelligence is temporarily unavailable.`
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
      label,
      network,
    ]
  );

  const timeline =
    useMemo(
      () =>
        data
          ? buildCosmosSdkActivityTimeline(
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
          ? buildCosmosSdkVisualEvidenceGraph(
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
              network,
              data
            )
          : null,
      [
        data,
        network,
      ]
    );

  if (loading) {
    return (
      <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 text-left sm:p-8">
        <div className="text-xs font-medium tracking-[0.18em] text-cyan-300">
          AYZO {label.toUpperCase()} INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-zinc-100">
          Reading native Cosmos SDK evidence
        </h3>
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
      <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/5 p-6 text-left sm:p-8">
        <h3 className="text-xl font-semibold text-white">
          {label} analysis unavailable
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 text-left">
      <AnalysisWorkspaceOverview
        networkLabel={
          label
        }
        subject={
          data.address
        }
        coverage={
          data.coverage
        }
        findings={
          data.findings
        }
        caveats={
          data.caveats
        }
        graph={
          graph
        }
        timeline={
          timeline
        }
      />

      <AnalysisWorkspaceDetails>
        <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
          {[
            [
              "BALANCE DENOMS",
              String(
                data.balances
                  .length
              ),
            ],
            [
              "TRANSACTIONS",
              String(
                data.transactions
                  .length
              ),
            ],
            [
              "DELEGATIONS",
              String(
                data.delegations
                  .length
              ),
            ],
            [
              "COUNTERPARTIES",
              String(
                data.derived
                  .counterparties
                  .count
              ),
            ],
          ].map(
            (
              [
                itemLabel,
                value,
              ]
            ) => (
              <div
                key={
                  itemLabel
                }
                className="rounded-2xl border border-zinc-800 bg-black/20 p-4"
              >
                <div className="text-[10px] tracking-[0.14em] text-zinc-600">
                  {itemLabel}
                </div>

                <div className="mt-2 text-sm font-medium text-zinc-200">
                  {value}
                </div>
              </div>
            )
          )}
        </div>

        <div className="border-t border-zinc-900 p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
            STAKING + IBC
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                DELEGATIONS
              </div>

              <div className="mt-2 text-sm text-zinc-200">
                {
                  data.derived
                    .staking
                    .delegationCount
                }
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                IBC TRANSFERS
              </div>

              <div className="mt-2 text-sm text-zinc-200">
                {
                  data.derived
                    .ibc
                    .transferMessageCount
                }
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                IBC CHANNELS
              </div>

              <div className="mt-2 text-sm text-zinc-200">
                {
                  data.derived
                    .ibc
                    .channels
                    .length
                }
              </div>
            </div>
          </div>
        </div>

        {network ===
          "injective" && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              INJECTIVE NATIVE MODULE ACTIVITY
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
                <div className="text-[10px] text-zinc-600">
                  EXCHANGE
                </div>

                <div className="mt-2 text-sm text-zinc-200">
                  {
                    data.derived
                      .modules
                      .exchangeMessageCount
                  }
                </div>
              </div>

              <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
                <div className="text-[10px] text-zinc-600">
                  COSMWASM
                </div>

                <div className="mt-2 text-sm text-zinc-200">
                  {
                    data.derived
                      .modules
                      .wasmMessageCount
                  }
                </div>
              </div>

              <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
                <div className="text-[10px] text-zinc-600">
                  TOKEN FACTORY
                </div>

                <div className="mt-2 text-sm text-zinc-200">
                  {
                    data.derived
                      .modules
                      .tokenFactoryMessageCount
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {data.derived
          .observedFunding && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              OBSERVED NATIVE FUNDING
            </div>

            <div className="mt-4 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.03] p-4">
              <div className="break-all font-mono text-xs text-zinc-300">
                {
                  data.derived
                    .observedFunding
                    .sourceAddress
                }
              </div>

              <div className="mt-2 text-xs text-zinc-500">
                {
                  data.derived
                    .observedFunding
                    .amount
                }
                {" "}
                {
                  data.derived
                    .observedFunding
                    .denom
                }
              </div>
            </div>
          </div>
        )}

        {timeline && (
          <ActivityTimeline
            timeline={
              timeline
            }
          />
        )}
      </AnalysisWorkspaceDetails>

      <div className="border-t border-zinc-900 p-6 sm:p-8">
        <AnalysisWorkspaceResearchTools>
          <AnalysisActions
            network={
              network
            }
            subjectType="wallet"
            subjectValue={
              data.address
            }
            title={`${label} Account Analysis`}
            analysisPayload={
              historicalSnapshot
            }
            askEvidencePayload={
              data
            }
          />
        </AnalysisWorkspaceResearchTools>
      </div>
    </div>
  );
}
