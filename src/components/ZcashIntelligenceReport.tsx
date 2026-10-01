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
  ZcashIntelligence,
} from "@/lib/intelligence/zcash/engine";

import {
  buildZcashActivityTimeline,
  buildZcashVisualEvidenceGraph,
} from "@/lib/intelligence/zcash/presentation";

type Failure = {
  ok:
    false;

  error:
    string;
};

function formatZec(
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
      ? `${whole}.${fraction} ZEC`
      : `${whole} ZEC`;
  } catch {
    return `${value} zatoshi`;
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
    28
    ? value
    : `${value.slice(
        0,
        12
      )}...${value.slice(
        -10
      )}`;
}

export default function ZcashIntelligenceReport({
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
      ZcashIntelligence |
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
                      "zcash",

                    address,
                  }),
              }
            );

          const body =
            await response
              .json() as
              | ZcashIntelligence
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
              "Zcash intelligence request failed."
            );

            return;
          }

          if (!response.ok) {
            setError(
              "Zcash intelligence request failed."
            );

            return;
          }

          setData(
            body
          );
        } catch {
          if (!cancelled) {
            setError(
              "Zcash intelligence is temporarily unavailable."
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
          ? buildZcashActivityTimeline(
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
          ? buildZcashVisualEvidenceGraph(
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
              "zcash",
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
                "zcash",

              network:
                "zcash",

              coverage:
                data.coverage,

              addressKind:
                data.addressKind,

              balanceZatoshis:
                data.balanceZatoshis,

              totalReceivedZatoshis:
                data.totalReceivedZatoshis,

              totalSpentZatoshis:
                data.totalSpentZatoshis,

              transactions:
                data.transactions,

              utxos:
                data.utxos,

              canonicalTransactions:
                data.canonicalTransactions,

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
          AYZO ZCASH INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-zinc-100">
          Reading public transparent Zcash evidence
        </h3>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Reading bounded transparent history, UTXOs, canonical transactions, flows and explicit counterparties. Shielded sender, recipient and amount evidence is never inferred.
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
          ZCASH INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-white">
          Analysis unavailable
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          {error ||
            "Zcash intelligence is temporarily unavailable."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 text-left">
      <AnalysisWorkspaceOverview
        networkLabel="Zcash"
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
                AYZO ZCASH INTELLIGENCE
              </div>

              <h3 className="mt-2 text-2xl font-semibold text-white">
                Transparent evidence report
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

          <p className="mt-4 max-w-3xl text-xs leading-5 text-zinc-600">
            Zcash privacy boundaries are preserved. This report describes only explicit public transparent evidence and never reconstructs hidden shielded relationships.
          </p>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              TRANSPARENT BALANCE
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {formatZec(
                data.balanceZatoshis
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              HISTORY
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
              UTXOS
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {
                data.utxos
                  .length
              }
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              CANONICAL VERIFIED
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-200">
              {
                data
                  .evidenceCoverage
                  .canonicalVerified
              }
              {" / "}
              {
                data
                  .evidenceCoverage
                  .canonicalRequested
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
                  .incomingTransactionCount
              }{" "}
              tx
            </div>

            <div className="mt-1 text-xs text-zinc-600">
              {formatZec(
                data.derived
                  .flow
                  .incomingZatoshis
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              EXPLICIT OUTGOING
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {
                data.derived
                  .flow
                  .outgoingTransactionCount
              }{" "}
              tx
            </div>

            <div className="mt-1 text-xs text-zinc-600">
              {formatZec(
                data.derived
                  .flow
                  .explicitOutgoingZatoshis
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
              ADDRESS FAMILY
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {
                data.addressKind ===
                  "transparent-p2pkh"
                  ? "Transparent P2PKH"
                  : "Transparent P2SH"
              }
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-900 p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
            PRIVACY BOUNDARY
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                UNRESOLVED INPUTS
              </div>

              <div className="mt-2 text-sm text-zinc-200">
                {
                  data.derived
                    .privacyBoundary
                    .unresolvedInputCount
                }
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                UNRESOLVED OUTPUTS
              </div>

              <div className="mt-2 text-sm text-zinc-200">
                {
                  data.derived
                    .privacyBoundary
                    .unresolvedOutputCount
                }
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                TX WITH UNRESOLVED INPUTS
              </div>

              <div className="mt-2 text-sm text-zinc-200">
                {
                  data.derived
                    .privacyBoundary
                    .transactionsWithUnresolvedInputs
                }
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                TX WITH UNRESOLVED OUTPUTS
              </div>

              <div className="mt-2 text-sm text-zinc-200">
                {
                  data.derived
                    .privacyBoundary
                    .transactionsWithUnresolvedOutputs
                }
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-zinc-600">
            Unresolved public transaction components are not automatically classified as shielded activity. AYZO does not infer a hidden sender, recipient, amount, identity or owner.
          </p>
        </div>

        {data.derived
          .observedFunding && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              OBSERVED TRANSPARENT FUNDING
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
                {formatZec(
                  data.derived
                    .observedFunding
                    .amountZatoshis
                )}
              </div>

              <p className="mt-3 text-xs leading-5 text-zinc-600">
                Conservative direct transparent funding evidence only. It does not establish beneficial ownership or ultimate funding provenance.
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
              EXPLICIT TRANSPARENT COUNTERPARTIES
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
                        explicit observation(s)
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

        {data.canonicalTransactions
          .length >
          0 && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              CANONICAL TRANSPARENT EVIDENCE
            </div>

            <div className="mt-4 space-y-3">
              {data
                .canonicalTransactions
                .slice(
                  0,
                  8
                )
                .map(
                  transaction => (
                    <div
                      key={
                        transaction.txid
                      }
                      className="rounded-2xl border border-zinc-900 bg-black/20 p-4"
                    >
                      <div className="break-all font-mono text-xs text-zinc-300">
                        {
                          transaction.txid
                        }
                      </div>

                      <div className="mt-2 text-xs text-zinc-600">
                        Inputs{" "}
                        {
                          transaction
                            .inputs
                            .length
                        }
                        {" · "}
                        Outputs{" "}
                        {
                          transaction
                            .outputs
                            .length
                        }
                        {" · "}
                        Block{" "}
                        {
                          transaction
                            .height ??
                          "Unavailable"
                        }
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
            network="zcash"
            subjectType="wallet"
            subjectValue={
              data.address
            }
            title="Zcash Transparent Address Analysis"
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
