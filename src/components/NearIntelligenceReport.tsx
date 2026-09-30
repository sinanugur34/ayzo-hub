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
  NearIntelligence,
} from "@/lib/intelligence/near/engine";

import {
  buildNearActivityTimeline,
  buildNearVisualEvidenceGraph,
} from "@/lib/intelligence/near/presentation";

type Failure = {
  ok:
    false;

  error:
    string;
};

function formatNear(
  value:
    string | null
) {
  if (!value) {
    return "Unavailable";
  }

  try {
    const raw =
      BigInt(
        value
      );

    const divisor =
      10n ** 24n;

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
          24,
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
      ? `${whole}.${fraction} NEAR`
      : `${whole} NEAR`;
  } catch {
    return `${value} yoctoNEAR`;
  }
}

export default function NearIntelligenceReport({
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
      NearIntelligence |
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
                      "near",

                    address,
                  }),
              }
            );

          const body =
            await response.json() as
              | NearIntelligence
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
              "NEAR intelligence request failed."
            );

            return;
          }

          if (!response.ok) {
            setError(
              "NEAR intelligence request failed."
            );

            return;
          }

          setData(
            body
          );
        } catch {
          if (!cancelled) {
            setError(
              "NEAR intelligence is temporarily unavailable."
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
          ? buildNearActivityTimeline(
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
          ? buildNearVisualEvidenceGraph(
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
              "near",
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
                "near",

              network:
                "near",

              coverage:
                data.coverage,

              account:
                data.account,

              accessKeys:
                data.accessKeys,

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
          AYZO NEAR INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-zinc-100">
          Reading NEAR mainnet evidence
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          Reading native account state, access keys, bounded actions, receipts and explicit counterparties.
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
          NEAR INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-white">
          Analysis unavailable
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          {error ||
            "NEAR intelligence is temporarily unavailable."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 text-left">
      <AnalysisWorkspaceOverview
        networkLabel="NEAR"
        subject={data.address}
        coverage={data.coverage}
        findings={data.findings}
        caveats={data.caveats}
        graph={graph}
        timeline={timeline}
      />

      <AnalysisWorkspaceDetails>
        <div className="border-b border-zinc-900 p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.18em] text-cyan-300">
            AYZO NEAR INTELLIGENCE
          </div>

          <h3 className="mt-2 text-2xl font-semibold text-white">
            Native action and receipt evidence
          </h3>

          <p className="mt-2 break-all font-mono text-xs text-zinc-500">
            {data.address}
          </p>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              NEAR BALANCE
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {formatNear(
                data.account
                  .amountYoctoNear
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              TRANSACTIONS
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {data.history.transactions.length}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              RECEIPTS
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {data.history.receipts.length}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              ACCESS KEYS
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {data.accessKeys.length}
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
                  .incomingTransferCount
              }{" "}
              observed
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
                  .outgoingTransferCount
              }{" "}
              observed
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
              CONTRACT METHODS
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {
                data.derived
                  .specialist
                  .functionCallMethods
                  .length
              }
            </div>
          </div>
        </div>

        {data.derived
          .specialist
          .functionCallMethods
          .length >
          0 && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              OBSERVED FUNCTION CALL METHODS
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {data.derived
                .specialist
                .functionCallMethods
                .slice(
                  0,
                  16
                )
                .map(
                  method => (
                    <span
                      key={method}
                      className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400"
                    >
                      {method}
                    </span>
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
                    .sourceAccountId
                }
              </div>

              <div className="mt-2 text-xs text-zinc-500">
                {formatNear(
                  data.derived
                    .observedFunding
                    .amountYoctoNear
                )}
              </div>

              <p className="mt-3 text-xs leading-5 text-zinc-600">
                Direct bounded inbound evidence only. This is not proof of ultimate provenance or ownership.
              </p>
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
            network="near"
            subjectType="wallet"
            subjectValue={data.address}
            title="NEAR Account Analysis"
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
