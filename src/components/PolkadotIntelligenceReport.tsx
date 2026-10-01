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
  PolkadotIntelligence,
} from "@/lib/intelligence/polkadot/engine";

import {
  buildPolkadotActivityTimeline,
  buildPolkadotVisualEvidenceGraph,
} from "@/lib/intelligence/polkadot/presentation";

type Failure = {
  ok:
    false;

  error:
    string;
};

function formatDot(
  value:
    string | null
) {
  if (!value) {
    return "Unavailable";
  }

  try {
    const raw =
      BigInt(value);

    const divisor =
      10_000_000_000n;

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
          10,
          "0"
        )
        .replace(
          /0+$/,
          ""
        );

    return fraction
      ? `${whole}.${fraction} DOT`
      : `${whole} DOT`;
  } catch {
    return `${value} planck`;
  }
}

export default function PolkadotIntelligenceReport({
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
      PolkadotIntelligence |
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
                      "polkadot",

                    address,
                  }),
              }
            );

          const body =
            await response
              .json() as
              | PolkadotIntelligence
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
              "Polkadot intelligence request failed."
            );

            return;
          }

          setData(
            body
          );
        } catch {
          if (!cancelled) {
            setError(
              "Polkadot intelligence is temporarily unavailable."
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
          ? buildPolkadotActivityTimeline(
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
          ? buildPolkadotVisualEvidenceGraph(
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
              "polkadot",
              data
            )
          : null,
      [
        data,
      ]
    );

  if (loading) {
    return (
      <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 text-left sm:p-8">
        <div className="text-xs font-medium tracking-[0.18em] text-cyan-300">
          AYZO POLKADOT INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-zinc-100">
          Reading Polkadot native evidence
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
          Polkadot analysis unavailable
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
        networkLabel="Polkadot"
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
              "TRANSFERABLE DOT",
              formatDot(
                data.account
                  .transferablePlanck
              ),
            ],
            [
              "TRANSFERS",
              String(
                data.transfers
                  .length
              ),
            ],
            [
              "EXTRINSICS",
              String(
                data.extrinsics
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
                label,
                value,
              ]
            ) => (
              <div
                key={
                  label
                }
                className="rounded-2xl border border-zinc-800 bg-black/20 p-4"
              >
                <div className="text-[10px] tracking-[0.14em] text-zinc-600">
                  {label}
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
            NATIVE POLKADOT SEMANTICS
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                STAKING
              </div>

              <div className="mt-2 text-sm text-zinc-200">
                {
                  data.staking
                    ? (
                        data.staking
                          .status ??
                        "Observed"
                      )
                    : "Not observed"
                }
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                PROXY EVIDENCE
              </div>

              <div className="mt-2 text-sm text-zinc-200">
                {
                  data.proxies
                    .length
                }
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                MULTISIG EVIDENCE
              </div>

              <div className="mt-2 text-sm text-zinc-200">
                {
                  data.multisig
                    .length
                }
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-zinc-600">
            Staking, proxy and multisig records describe explicit protocol state. They do not establish beneficial ownership, identity or common control.
          </p>
        </div>

        {data.derived
          .observedFunding && (
          <div className="border-t border-zinc-900 p-6 sm:p-8">
            <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
              OBSERVED DOT FUNDING
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
                {formatDot(
                  data.derived
                    .observedFunding
                    .amountPlanck
                )}
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
            network="polkadot"
            subjectType="wallet"
            subjectValue={
              data.address
            }
            title="Polkadot Account Analysis"
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
