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
  HederaIntelligence,
} from "@/lib/intelligence/hedera/engine";

import {
  buildHederaActivityTimeline,
  buildHederaVisualEvidenceGraph,
} from "@/lib/intelligence/hedera/presentation";

type Failure = {
  ok:
    false;

  error:
    string;
};

function formatHbar(
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
      100_000_000n;

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
          8,
          "0"
        )
        .replace(
          /0+$/,
          ""
        );

    return fraction
      ? `${whole}.${fraction} HBAR`
      : `${whole} HBAR`;
  } catch {
    return `${value} tinybar`;
  }
}

export default function HederaIntelligenceReport({
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
      HederaIntelligence |
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
                      "hedera",

                    address,
                  }),
              }
            );

          const body =
            await response.json() as
              | HederaIntelligence
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
              "Hedera intelligence request failed."
            );

            return;
          }

          if (!response.ok) {
            setError(
              "Hedera intelligence request failed."
            );

            return;
          }

          setData(
            body
          );
        } catch {
          if (!cancelled) {
            setError(
              "Hedera intelligence is temporarily unavailable."
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
          ? buildHederaActivityTimeline(
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
          ? buildHederaVisualEvidenceGraph(
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
              "hedera",
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
                "hedera",

              network:
                "hedera",

              coverage:
                data.coverage,

              account:
                data.account,

              transactions:
                data.transactions,

              tokenRelationships:
                data.tokenRelationships,

              nfts:
                data.nfts,

              specialist:
                data.specialist,

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

  const controlledTokens =
    data?.specialist
      ?.tokenMetadata
      .filter(
        token =>
          Object.values(
            token.controls
          ).some(
            key =>
              key !== null
          )
      ).length ??
    0;

  if (loading) {
    return (
      <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 text-left sm:p-8">
        <div className="text-xs font-medium tracking-[0.18em] text-cyan-300">
          AYZO HEDERA INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-zinc-100">
          Reading Hedera mainnet evidence
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          Reading HBAR transfer history, token relationships, NFTs, native control keys and staking evidence.
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
          HEDERA INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-white">
          Analysis unavailable
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          {error ||
            "Hedera intelligence is temporarily unavailable."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 text-left">
      <AnalysisWorkspaceOverview
        networkLabel="Hedera"
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
            AYZO HEDERA INTELLIGENCE
          </div>

          <h3 className="mt-2 text-2xl font-semibold text-white">
            Native HBAR and token evidence
          </h3>

          <p className="mt-2 break-all font-mono text-xs text-zinc-500">
            {data.address}
          </p>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              HBAR BALANCE
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {formatHbar(
                data.account
                  .balanceTinybar
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              TRANSACTIONS
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {data.transactions.length}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              TOKEN RELATIONSHIPS
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {data.tokenRelationships.length}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              NFTS
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {data.nfts.length}
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-zinc-900 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
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
              CONTROLLED TOKENS
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {controlledTokens}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              STAKED NODE
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {
                data.derived
                  .staking
                  .stakedNodeId ||
                "Unavailable"
              }
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
            <div className="text-[10px] tracking-[0.14em] text-zinc-600">
              REWARD EVIDENCE
            </div>

            <div className="mt-2 text-sm text-zinc-200">
              {
                data.derived
                  .staking
                  .observedRewardCount
              }
            </div>
          </div>
        </div>

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
                {formatHbar(
                  data.derived
                    .observedFunding
                    .amountTinybar
                )}
              </div>

              <p className="mt-3 text-xs leading-5 text-zinc-600">
                Direct HBAR counter-transfer evidence only. This does not establish ultimate provenance or ownership.
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
            network="hedera"
            subjectType="wallet"
            subjectValue={data.address}
            title="Hedera Account Analysis"
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
