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
  AlgorandIntelligence,
} from "@/lib/intelligence/algorand/engine";

import {
  buildAlgorandActivityTimeline,
  buildAlgorandVisualEvidenceGraph,
} from "@/lib/intelligence/algorand/presentation";

type Failure = {
  ok:
    false;

  error:
    string;
};

function formatAlgo(
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
      ? `${whole}.${fraction} ALGO`
      : `${whole} ALGO`;
  } catch {
    return `${value} microALGO`;
  }
}

export default function AlgorandIntelligenceReport({
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
      AlgorandIntelligence |
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
                      "algorand",

                    address,
                  }),
              }
            );

          const body =
            await response
              .json() as
              | AlgorandIntelligence
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

          if (!body.ok) {
            setError(
              body.error ||
              "Algorand intelligence request failed."
            );

            return;
          }

          if (!response.ok) {
            setError(
              "Algorand intelligence request failed."
            );

            return;
          }

          setData(
            body
          );
        } catch {
          if (!cancelled) {
            setError(
              "Algorand intelligence is temporarily unavailable."
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
          ? buildAlgorandActivityTimeline(
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
          ? buildAlgorandVisualEvidenceGraph(
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
              "algorand",
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
                "algorand",

              network:
                "algorand",

              coverage:
                data.coverage,

              account:
                data.account,

              assets:
                data.assets,

              createdAssets:
                data.createdAssets,

              appLocalStates:
                data.appLocalStates,

              createdApplications:
                data.createdApplications,

              transactions:
                data.transactions,

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
          AYZO ALGORAND INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-zinc-100">
          Reading Algorand mainnet evidence
        </h3>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Reading ALGO state, ASA holdings and control fields, applications, rekey evidence, inner transactions and bounded explicit transfer relationships.
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
          ALGORAND INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-white">
          Analysis unavailable
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          {error ||
            "Algorand intelligence is temporarily unavailable."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 text-left">
      <AnalysisWorkspaceOverview
        networkLabel="Algorand"
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
        <div className="border-b border-zinc-900 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium tracking-[0.18em] text-cyan-300">
                AYZO ALGORAND INTELLIGENCE
              </div>

              <h3 className="mt-2 text-2xl font-semibold text-white">
                Native evidence report
              </h3>

              <p className="mt-2 break-all font-mono text-xs text-zinc-500">
                {data.address}
              </p>
            </div>

            <div className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1.5 text-[10px] font-medium tracking-[0.12em] text-zinc-400">
              {
                data.coverage
                  .toUpperCase()
              }{" "}
              COVERAGE
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              ALGO BALANCE
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {formatAlgo(
                data.account
                  .amountMicroAlgos
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              MIN BALANCE
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {formatAlgo(
                data.account
                  .minBalanceMicroAlgos
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              TRANSACTIONS
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {
                data.transactions
                  .length
              }
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              ASA HOLDINGS
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {
                data.assets
                  .length
              }
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
                data.derived
                  .flow
                  .incomingCount
              }{" "}
              transfer(s)
            </div>

            <div className="mt-1 text-xs text-zinc-600">
              {formatAlgo(
                data.derived
                  .flow
                  .incomingMicroAlgos
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              OUTGOING
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {
                data.derived
                  .flow
                  .outgoingCount
              }{" "}
              transfer(s)
            </div>

            <div className="mt-1 text-xs text-zinc-600">
              {formatAlgo(
                data.derived
                  .flow
                  .outgoingMicroAlgos
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
              INNER TRANSACTIONS
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {
                data.derived
                  .activity
                  .observedInnerTransactionCount
              }
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-900 p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
            AUTHORIZATION / REKEY EVIDENCE
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                CURRENT AUTH ADDRESS
              </div>

              <div className="mt-2 break-all font-mono text-xs text-zinc-300">
                {
                  data.derived
                    .authority
                    .currentAuthAddress ||
                  "Not observed"
                }
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                OBSERVED REKEYS
              </div>

              <div className="mt-2 text-sm text-zinc-200">
                {
                  data.derived
                    .authority
                    .observedRekeys
                    .length
                }
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                CONTROLLED ASSETS
              </div>

              <div className="mt-2 text-sm text-zinc-200">
                {
                  data.derived
                    .assets
                    .controlledAssetCount
                }
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-zinc-600">
            Rekey and auth-address fields describe protocol signing authority. They do not establish beneficial ownership or real-world identity.
          </p>
        </div>

        <div className="border-t border-zinc-900 p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
            APPLICATION EVIDENCE
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                LOCAL STATES
              </div>

              <div className="mt-2 text-sm text-zinc-200">
                {
                  data.derived
                    .applications
                    .localStateCount
                }
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                CREATED APPS
              </div>

              <div className="mt-2 text-sm text-zinc-200">
                {
                  data.derived
                    .applications
                    .createdApplicationCount
                }
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                OBSERVED CALLS
              </div>

              <div className="mt-2 text-sm text-zinc-200">
                {
                  data.derived
                    .applications
                    .observedCallCount
                }
              </div>
            </div>
          </div>
        </div>

        {data.createdAssets
          .length >
          0 && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              ASA CONTROL FIELDS
            </div>

            <div className="mt-4 space-y-3">
              {data.createdAssets
                .slice(
                  0,
                  10
                )
                .map(
                  asset => (
                    <div
                      key={
                        asset.assetId
                      }
                      className="rounded-2xl border border-zinc-900 bg-black/20 p-4"
                    >
                      <div className="text-xs font-medium text-zinc-300">
                        {
                          asset.name ||
                          asset.unitName ||
                          `ASA ${asset.assetId}`
                        }
                      </div>

                      <div className="mt-2 text-[10px] text-zinc-600">
                        Asset ID{" "}
                        {
                          asset.assetId
                        }
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {[
                          [
                            "Manager",
                            asset.manager,
                          ],
                          [
                            "Reserve",
                            asset.reserve,
                          ],
                          [
                            "Freeze",
                            asset.freeze,
                          ],
                          [
                            "Clawback",
                            asset.clawback,
                          ],
                        ].map(
                          (
                            [
                              label,
                              value,
                            ]
                          ) => (
                            <div
                              key={
                                label
                              }
                              className="rounded-xl border border-zinc-900 bg-black/20 p-3"
                            >
                              <div className="text-[9px] text-zinc-700">
                                {
                                  label
                                }
                              </div>

                              <div className="mt-1 break-all font-mono text-[10px] text-zinc-500">
                                {
                                  value ||
                                  "Not set"
                                }
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )
                )}
            </div>

            <p className="mt-4 text-xs leading-5 text-zinc-600">
              Manager, reserve, freeze and clawback addresses are explicit Algorand protocol control fields. AYZO does not convert them into identity or beneficial-ownership claims.
            </p>
          </div>
        )}

        {data.derived
          .observedFunding && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              OBSERVED ALGO FUNDING
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
                {formatAlgo(
                  data.derived
                    .observedFunding
                    .amountMicroAlgos
                )}
              </div>

              <p className="mt-3 text-xs leading-5 text-zinc-600">
                Explicit inbound ALGO evidence inside the bounded history window. This is not proof of the original or ultimate funding source.
              </p>
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
                  12
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
                        {
                          item.address
                        }
                      </div>

                      <div className="mt-2 text-[10px] text-zinc-600">
                        {
                          item.observationCount
                        }{" "}
                        explicit transfer observation(s)
                        {" · "}
                        {
                          item.incomingCount
                        }{" "}
                        incoming
                        {" · "}
                        {
                          item.outgoingCount
                        }{" "}
                        outgoing
                      </div>
                    </div>
                  )
                )}
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
            network="algorand"
            subjectType="wallet"
            subjectValue={
              data.address
            }
            title="Algorand Account Analysis"
            analysisPayload={
              historicalSnapshot
            }
            askEvidencePayload={
              askEvidencePayload
            }
          />
        </AnalysisWorkspaceResearchTools>
      </div>
    </div>
  );
}
