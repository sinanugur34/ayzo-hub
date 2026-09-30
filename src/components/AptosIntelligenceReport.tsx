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
  buildAptosActivityTimeline,
  buildAptosVisualEvidenceGraph,
} from "@/lib/intelligence/aptos/presentation";

import type {
  AptosIntelligence,
} from "@/lib/intelligence/aptos/engine";

type Failure = {
  ok:
    false;

  error:
    string;
};

function formatApt(
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
      100_000_000n;

    const fraction =
      (
        raw %
        100_000_000n
      )
        .toString()
        .padStart(
          8,
          "0"
        )
        .replace(
          /0+$/,
          ""
        );

    return fraction
      ? `${whole}.${fraction} APT`
      : `${whole} APT`;
  } catch {
    return `${value} octas`;
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

export default function AptosIntelligenceReport({
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
      AptosIntelligence |
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
                      "aptos",

                    address,
                  }),
              }
            );

          const body =
            await response.json() as
              | AptosIntelligence
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
              "Aptos intelligence request failed."
            );

            return;
          }

          if (!response.ok) {
            setError(
              "Aptos intelligence request failed."
            );

            return;
          }

          setData(
            body
          );
        } catch {
          if (!cancelled) {
            setError(
              "Aptos intelligence is temporarily unavailable."
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
          ? buildAptosActivityTimeline(
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
          ? buildAptosVisualEvidenceGraph(
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
              "aptos",
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
                "aptos",

              network:
                "aptos",

              coverage:
                data.coverage,

              account:
                data.account,

              aptBalanceOctas:
                data.aptBalanceOctas,

              fungibleAssets:
                data.fungibleAssets,

              resources:
                data.resources,

              objects:
                data.objects,

              history:
                data.history,

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
          AYZO APTOS INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-zinc-100">
          Reading Aptos mainnet evidence
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          Reading account transactions, Move resources, Fungible Assets, objects and explicit transfer evidence.
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
          APTOS INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-white">
          Analysis unavailable
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          {error ||
            "Aptos intelligence is temporarily unavailable."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 text-left">
      <AnalysisWorkspaceOverview
        networkLabel="Aptos"
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
                AYZO APTOS INTELLIGENCE
              </div>

              <h3 className="mt-2 text-2xl font-semibold text-white">
                Native Move evidence report
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
              APT BALANCE
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {formatApt(
                data.aptBalanceOctas
              )}
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

          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              FUNGIBLE ASSETS
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {data.fungibleAssets.length}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              OWNED OBJECTS
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {data.objects.length}
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
                  .incomingTransferCount
              }
              {" transfer(s)"}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              OUTGOING
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {
                data.derived.flow
                  .outgoingTransferCount
              }
              {" transfer(s)"}
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
              MOVE RESOURCES
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {data.resources.length}
            </div>
          </div>
        </div>

        {data.fungibleAssets.length >
          0 && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              FUNGIBLE ASSETS
            </div>

            <div className="mt-4 space-y-2">
              {data.fungibleAssets
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
                      key={`${asset.assetType}-${index}`}
                      className="rounded-xl border border-zinc-900 bg-black/20 px-4 py-3"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <strong className="text-xs text-zinc-300">
                          {asset.symbol ||
                            asset.name ||
                            "Aptos fungible asset"}
                        </strong>

                        <span className="text-xs text-zinc-500">
                          {asset.amount}
                        </span>
                      </div>

                      <div className="mt-2 break-all font-mono text-[10px] text-zinc-700">
                        {asset.assetType}
                      </div>
                    </div>
                  )
                )}
            </div>
          </div>
        )}

        {data.resources.length >
          0 && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              MOVE RESOURCE EVIDENCE
            </div>

            <div className="mt-4 space-y-2">
              {data.resources
                .slice(
                  0,
                  12
                )
                .map(
                  (
                    resource,
                    index
                  ) => (
                    <div
                      key={`${resource.type}-${index}`}
                      className="rounded-xl border border-zinc-900 bg-black/20 px-4 py-3"
                    >
                      <div className="break-all font-mono text-xs text-zinc-300">
                        {resource.type}
                      </div>

                      <div className="mt-2 text-[10px] text-zinc-600">
                        Module{" "}
                        {resource.moduleName ||
                          "Unavailable"}
                        {" · "}
                        Struct{" "}
                        {resource.structName ||
                          "Unavailable"}
                      </div>
                    </div>
                  )
                )}
            </div>
          </div>
        )}

        {data.objects.length >
          0 && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              OWNED OBJECT EVIDENCE
            </div>

            <div className="mt-4 space-y-2">
              {data.objects
                .slice(
                  0,
                  10
                )
                .map(
                  object => (
                    <div
                      key={
                        object.objectAddress
                      }
                      className="rounded-xl border border-zinc-900 bg-black/20 px-4 py-3"
                    >
                      <div className="break-all font-mono text-xs text-zinc-300">
                        {
                          object.objectAddress
                        }
                      </div>

                      <div className="mt-2 text-[10px] text-zinc-600">
                        Owner{" "}
                        {short(
                          object.ownerAddress
                        )}
                      </div>
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
              EXPLICIT TRANSFER COUNTERPARTIES
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
                        explicit transfer observation(s)
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
                {formatApt(
                  data.derived
                    .observedFunding
                    .amountOctas
                )}
              </div>

              <p className="mt-3 text-xs leading-5 text-zinc-600">
                Directly observed inbound evidence inside the bounded transaction window. This does not establish the original or ultimate funding source.
              </p>
            </div>
          </div>
        )}

        {data.history
          .transactions
          .length >
          0 && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              RECENT APTOS TRANSACTIONS
            </div>

            <div className="mt-4 space-y-3">
              {data.history
                .transactions
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
                        {transaction.moduleName ||
                          "Unknown module"}
                        {"::"}
                        {transaction.functionName ||
                          "unknown"}
                        {" · "}
                        {transaction.success ===
                        true
                          ? "SUCCESS"
                          : transaction.success ===
                              false
                            ? "FAILED"
                            : "UNKNOWN"}
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
            network="aptos"
            subjectType="wallet"
            subjectValue={data.address}
            title="Aptos Account Analysis"
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
