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
  buildCardanoActivityTimeline,
  buildCardanoVisualEvidenceGraph,
} from "@/lib/intelligence/cardano/presentation";

import type {
  CardanoIntelligence,
} from "@/lib/intelligence/cardano/engine";

type Failure = {
  ok:
    false;

  error:
    string;
};

function formatAda(
  value:
    string | null
) {
  if (!value) {
    return "Unavailable";
  }

  try {
    const raw =
      BigInt(value);

    const whole =
      raw /
      1_000_000n;

    const fraction =
      (
        raw %
        1_000_000n
      )
        .toString()
        .padStart(
          6,
          "0"
        )
        .replace(
          /0+$/,
          ""
        );

    return fraction
      ? `${whole}.${fraction} ADA`
      : `${whole} ADA`;
  } catch {
    return `${value} lovelace`;
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
    : `${value.slice(0, 10)}...${value.slice(-8)}`;
}

export default function CardanoIntelligenceReport({
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
      CardanoIntelligence |
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
                      "cardano",

                    address,
                  }),
              }
            );

          const body =
            await response.json() as
              | CardanoIntelligence
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

          /*
           * Narrow the API union before consulting
           * the HTTP transport status.
           *
           * A failed HTTP response can theoretically
           * still contain a structurally successful
           * payload, so response.ok alone must not be
           * used to assume Failure.
           */
          if (!body.ok) {
            setError(
              body.error ||
              "Cardano intelligence request failed."
            );

            return;
          }

          if (!response.ok) {
            setError(
              "Cardano intelligence request failed."
            );

            return;
          }

          setData(
            body
          );
        } catch {
          if (!cancelled) {
            setError(
              "Cardano intelligence is temporarily unavailable."
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
          ? buildCardanoActivityTimeline(
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
          ? buildCardanoVisualEvidenceGraph(
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
              "cardano",
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
                "cardano",

              network:
                "cardano",

              coverage:
                data.coverage,

              account:
                data.account,

              history:
                data.history,

              utxos:
                data.utxos,

              canonicalTransactions:
                data.canonicalTransactions,

              stake:
                data.stake,

              derived:
                data.derived,

              evidenceCoverage:
                data.evidenceCoverage,

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
          AYZO CARDANO INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-zinc-100">
          Reading Cardano mainnet evidence
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          Reading UTXOs, canonical transactions, native assets, staking and bounded relationship evidence.
        </p>
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
        <div className="text-xs font-medium tracking-[0.18em] text-red-300">
          CARDANO INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-white">
          Analysis unavailable
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          {error ||
            "Cardano intelligence is temporarily unavailable."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 text-left">
      <AnalysisWorkspaceOverview
        networkLabel="Cardano"
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
                AYZO CARDANO INTELLIGENCE
              </div>

              <h3 className="mt-2 text-2xl font-semibold text-white">
                Native evidence report
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
              ADA BALANCE
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {formatAda(
                data.account
                  .nativeBalanceLovelace
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              HISTORY
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {data.history.transactions.length}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              CANONICAL VERIFIED
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {
                data.evidenceCoverage
                  .canonicalVerified
              }
              {" / "}
              {
                data.evidenceCoverage
                  .canonicalRequested
              }
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              UTXOS
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {data.utxos.length}
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-zinc-900 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              INCOMING
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {
                data.derived.flow
                  .incomingTransactionCount
              }
              {" tx · "}
              {formatAda(
                data.derived.flow
                  .incomingLovelace
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              OUTGOING
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {
                data.derived.flow
                  .outgoingTransactionCount
              }
              {" tx · "}
              {formatAda(
                data.derived.flow
                  .outgoingLovelace
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              COUNTERPARTIES
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {
                data.derived
                  .counterparties
                  .count
              }
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              NATIVE ASSETS
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {
                data.derived
                  .assets
                  .currentNativeAssetCount
              }
            </div>
          </div>
        </div>

        {data.stake && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              STAKING EVIDENCE
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
                <div className="text-[10px] text-zinc-600">
                  STAKE ADDRESS
                </div>

                <div className="mt-2 break-all font-mono text-xs text-zinc-300">
                  {data.stake.stakeAddress}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
                <div className="text-[10px] text-zinc-600">
                  DELEGATED POOL
                </div>

                <div className="mt-2 break-all font-mono text-xs text-zinc-300">
                  {data.stake.poolId ||
                    "Unavailable"}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
                <div className="text-[10px] text-zinc-600">
                  CONTROLLED ADA
                </div>

                <div className="mt-2 text-xs text-zinc-300">
                  {formatAda(
                    data.stake
                      .controlledAmount
                  )}
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-zinc-600">
              Delegation evidence is an observed staking relationship and does not establish wallet ownership.
            </p>
          </div>
        )}

        {data.account.assets.length >
          0 && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              CARDANO NATIVE ASSETS
            </div>

            <div className="mt-4 space-y-2">
              {data.account.assets
                .slice(
                  0,
                  12
                )
                .map(
                  (
                    asset,
                    index
                  ) => (
                    <div
                      key={`${asset.unit}-${index}`}
                      className="rounded-xl border border-zinc-900 bg-black/20 px-4 py-3"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <div className="font-mono text-xs text-zinc-300">
                          {asset.assetNameHex ||
                            short(
                              asset.unit
                            )}
                        </div>

                        <div className="text-xs text-zinc-400">
                          {asset.quantity}
                        </div>
                      </div>

                      {asset.policyId && (
                        <div className="mt-2 break-all font-mono text-[10px] text-zinc-700">
                          Policy {asset.policyId}
                        </div>
                      )}
                    </div>
                  )
                )}
            </div>
          </div>
        )}

        {data.derived
          .counterparties
          .items.length >
          0 && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              EXPLICIT COUNTERPARTIES
            </div>

            <div className="mt-4 space-y-2">
              {data.derived
                .counterparties
                .items
                .slice(
                  0,
                  10
                )
                .map(
                  item => (
                    <div
                      key={
                        item.address
                      }
                      className="rounded-xl border border-zinc-900 bg-black/20 px-4 py-3"
                    >
                      <div className="break-all font-mono text-xs text-zinc-300">
                        {item.address}
                      </div>

                      <div className="mt-2 text-[10px] text-zinc-600">
                        {
                          item.observationCount
                        }{" "}
                        canonical observation(s)
                      </div>
                    </div>
                  )
                )}
            </div>
          </div>
        )}

        {data.derived
          .observedFunding && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              OBSERVED FUNDING
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
                  formatAda(
                    data.derived
                      .observedFunding
                      .amountLovelace
                  )
                }
              </div>

              <p className="mt-3 text-xs leading-5 text-zinc-600">
                Directly observed inbound evidence inside the bounded canonical window. This is not proof of the original or ultimate funding source.
              </p>
            </div>
          </div>
        )}

        {data.canonicalTransactions.length >
          0 && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              CANONICAL TRANSACTION EVIDENCE
            </div>

            <div className="mt-4 space-y-3">
              {data.canonicalTransactions
                .slice(
                  0,
                  8
                )
                .map(
                  transaction => (
                    <div
                      key={
                        transaction
                          .transactionHash
                      }
                      className="rounded-2xl border border-zinc-900 bg-black/20 p-4"
                    >
                      <div className="break-all font-mono text-xs text-zinc-300">
                        {
                          transaction
                            .transactionHash
                        }
                      </div>

                      <div className="mt-2 text-xs text-zinc-600">
                        Inputs{" "}
                        {
                          transaction.inputs
                            .length
                        }
                        {" · "}
                        Outputs{" "}
                        {
                          transaction.outputs
                            .length
                        }
                        {" · "}
                        Fee{" "}
                        {formatAda(
                          transaction
                            .feeLovelace
                        )}
                      </div>
                    </div>
                  )
                )}
            </div>
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
            network="cardano"
            subjectType="wallet"
            subjectValue={data.address}
            title="Cardano Address Analysis"
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
