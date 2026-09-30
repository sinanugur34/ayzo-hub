"use client";

import {
  trackEvent,
} from "@/lib/analytics/client";

import AnalysisWorkspaceResearchTools from "@/components/AnalysisWorkspaceResearchTools";

import AnalysisWorkspaceDetails from "@/components/AnalysisWorkspaceDetails";

import AnalysisWorkspaceOverview from "@/components/AnalysisWorkspaceOverview";

import AnalysisLimitCard from "@/components/AnalysisLimitCard";

import WalletTrackRecordPanel from "@/components/WalletTrackRecord";
import {
  buildBitcoinWalletTrackRecord,
} from "@/lib/intelligence/walletTrackRecord";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AnalysisActions from "@/components/AnalysisActions";
import { buildHistoricalSnapshot } from "@/lib/account/historicalSnapshot";
import ActivityTimelinePanel from "@/components/ActivityTimeline";
import {
  buildBitcoinVisualEvidenceGraph,
} from "@/lib/intelligence/visualEvidenceGraph";
import {
  buildBitcoinActivityTimeline,
} from "@/lib/intelligence/activityTimeline";

type Finding = {
  id: string;
  category: string;
  title: string;
  severity:
    | "attention"
    | "informational";
  confidence:
    | "low"
    | "medium"
    | "high";
  summary: string;
  caveat: string;
};

type BitcoinCanonicalTransaction = {
  transactionHash: string;

  witnessHash:
    string | null;

  blockHash:
    string | null;

  confirmed:
    boolean;

  confirmations:
    number | null;

  inputs: readonly {
    previousTransactionHash:
      string | null;

    previousOutputIndex:
      number | null;

    prevout: {
      valueSats:
        string;

      scriptPubKey:
        string | null;

      addresses?:
        readonly string[];
    } | null;

    prevoutStatus:
      | "resolved"
      | "coinbase"
      | "omitted"
      | "unavailable";
  }[];

  outputs: readonly {
    index:
      number;

    valueSats:
      string;

    scriptPubKey:
      string | null;

    addresses?:
      readonly string[];
  }[];

  prevoutCoverage: {
    eligible:
      number;

    attempted:
      number;

    resolved:
      number;

    unavailable:
      number;

    omitted:
      number;

    complete:
      boolean;
  };
};

type BitcoinSuccess = {
  ok: true;
  network: "bitcoin";
  address: string;
  coverage:
    | "partial"
    | "limited";

  history: {
    transactions: readonly {
      transactionHash: string;
      blockHeight:
        number | null;
      timestamp:
        string | null;
    }[];

    nextCursor:
      string | null;
  };

  analysisPlan:
    "free" |
    "pro" |
    "advanced";

  evidenceCoverage: {
    historyLimit:
      number;

    canonicalSampleLimit:
      number;

    historyHasMore:
      boolean;
  };

  canonicalTransaction:
    BitcoinCanonicalTransaction |
    null;

  canonicalTransactions:
    readonly BitcoinCanonicalTransaction[];

  derived: {
    flow: {
      incomingTransactionCount:
        number;

      outgoingTransactionCount:
        number;

      selfTransactionCount:
        number;

      unresolvedTransactionCount:
        number;

      observedTransactionCount:
        number;

      incomingSats:
        string;

      outgoingNonTargetSats:
        string;
    };

    counterparties: {
      count:
        number;

      items:
        readonly {
          address:
            string;

          incomingCount:
            number;

          outgoingCount:
            number;

          observationCount:
            number;
        }[];
    };

    observedFunding: {
      sourceAddress:
        string;

      transactionHash:
        string;

      amountSats:
        string | null;
    } | null;

    canonicalCoverage: {
      requested:
        number;

      verified:
        number;

      unavailable:
        number;

      prevoutEligible:
        number;

      prevoutResolved:
        number;

      prevoutUnavailable:
        number;

      prevoutOmitted:
        number;
    };
  };

  modules: {
    addressHistory: {
      status:
        | "complete"
        | "limited"
        | "unavailable";
      error:
        string | null;
    };

    canonicalTransactionEvidence: {
      status:
        | "complete"
        | "limited"
        | "unavailable";
      error:
        string | null;
    };

    flow: {
      status:
        | "complete"
        | "limited"
        | "unavailable";
      error:
        string | null;
    };

    counterparties: {
      status:
        | "complete"
        | "limited"
        | "unavailable";
      error:
        string | null;
    };

    funding: {
      status:
        | "complete"
        | "limited"
        | "unavailable";
      error:
        string | null;
    };
  };

  findings:
    readonly Finding[];

  caveats:
    readonly string[];
};

type BitcoinFailure = {
  ok: false;
  code?: string;
  error: string;
  network?:
    "bitcoin";
};

type BitcoinResponse =
  | BitcoinSuccess
  | BitcoinFailure;

function short(
  value:
    string | null | undefined
) {
  if (!value) {
    return "Unavailable";
  }

  return (
    `${value.slice(0, 8)}` +
    "..." +
    `${value.slice(-8)}`
  );
}

function statusLabel(
  status:
    | "complete"
    | "limited"
    | "unavailable"
) {
  switch (status) {
    case "complete":
      return "VERIFIED";

    case "limited":
      return "LIMITED";

    case "unavailable":
      return "UNAVAILABLE";
  }
}

function formatTimestamp(
  value:
    string | null
) {
  if (!value) {
    return "Unavailable";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "en-US"
  );
}

function formatSats(
  value:
    string | null |
    undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  try {
    const sats =
      BigInt(value);

    const divisor =
      100_000_000n;

    const whole =
      sats /
      divisor;

    const remainder =
      sats %
      divisor;

    if (
      remainder ===
        0n
    ) {
      return `${whole.toLocaleString("en-US")} BTC`;
    }

    const fraction =
      remainder
        .toString()
        .padStart(
          8,
          "0"
        )
        .replace(
          /0+$/,
          ""
        );

    return `${whole.toLocaleString("en-US")}.${fraction} BTC`;
  } catch {
    return `${value} sats`;
  }
}

export default function BitcoinIntelligenceReport({
  address,
}: {
  address: string;
}) {
  const [
    data,
    setData,
  ] =
    useState<
      BitcoinSuccess | null
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
    dailyLimitReached,
    setDailyLimitReached,
  ] =
    useState(false);

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] =
    useState(0);

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      setLoading(true);
      setData(null);
      setError("");
      setDailyLimitReached(
        false
      );
      setElapsedSeconds(0);

      try {
        trackEvent(
          "analysis_started",
          {
            feature:
              "bitcoin_intelligence",
            network:
              "bitcoin",
          }
        );

        const response =
          await fetch(
            "/api/intelligence",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                ...(process.env.NODE_ENV !==
                "production"
                  ? {
                      "x-ayzo-test-request":
                        "smoke",
                    }
                  : {}),
              },

              body:
                JSON.stringify({
                  network:
                    "bitcoin",
                  address,
                }),
            }
          );

        const result =
          (
            await response.json()
          ) as BitcoinResponse;

        window.dispatchEvent(
          new Event(
            "ayzo:quota-updated"
          )
        );

        if (cancelled) {
          return;
        }

        if (!result.ok) {
          if (
            (
            result.code ===
              "DAILY_FREE_LIMIT" ||
            result.code ===
              "DAILY_PRO_LIMIT" ||
            result.code ===
              "DAILY_ADVANCED_LIMIT"
          )
          ) {
            trackEvent(
              "analysis_quota_blocked",
              {
                feature:
                  "bitcoin_intelligence",
                network:
                  "bitcoin",
                result:
                  result.code,
              }
            );

            setDailyLimitReached(
              true
            );
            return;
          }

          trackEvent(
            "analysis_failed",
            {
              feature:
                "bitcoin_intelligence",
              network:
                "bitcoin",
            }
          );

          setError(
            result.error ||
              "Bitcoin intelligence is temporarily unavailable."
          );
          return;
        }

        trackEvent(
          "intelligence_completed",
          {
            feature:
              "bitcoin_intelligence",
            network:
              "bitcoin",
          }
        );

        setData(result);
      } catch (caught) {
        if (!cancelled) {
          trackEvent(
            "analysis_failed",
            {
              feature:
                "bitcoin_intelligence",
              network:
                "bitcoin",
            }
          );

          setError(
            caught instanceof
              Error
              ? caught.message
              : "Bitcoin intelligence is temporarily unavailable."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(
            false
          );
        }
      }
    }

    load();

    return () => {
      cancelled =
        true;
    };
  }, [
    address,
  ]);

  useEffect(() => {
    if (!loading) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setElapsedSeconds(
            value =>
              value + 1
          );
        },
        1000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    loading,
    address,
  ]);

  const historicalSnapshot =
    useMemo(
      () =>
        data
          ? buildHistoricalSnapshot(
              "bitcoin",
              data
            )
          : null,
      [data]
    );

  const askEvidencePayload =
    useMemo(
      () =>
        data
          ? {
              adapter:
                "utxo",

              network:
                "bitcoin",

              coverage:
                data.coverage,

              history: {
                transactions:
                  data.history.transactions.slice(
                    0,
                    20
                  ),

                nextCursor:
                  data.history.nextCursor,
              },

              canonicalTransaction:
                data.canonicalTransaction
                  ? {
                      ...data.canonicalTransaction,

                      inputs:
                        data.canonicalTransaction.inputs.slice(
                          0,
                          20
                        ),

                      outputs:
                        data.canonicalTransaction.outputs.slice(
                          0,
                          20
                        ),
                    }
                  : null,

              canonicalTransactions:
                data.canonicalTransactions
                  .slice(
                    0,
                    5
                  )
                  .map(
                    transaction => ({
                      ...transaction,

                      inputs:
                        transaction.inputs.slice(
                          0,
                          20
                        ),

                      outputs:
                        transaction.outputs.slice(
                          0,
                          20
                        ),
                    })
                  ),

              derived:
                data.derived,

              evidenceCoverage:
                data.evidenceCoverage,

              modules:
                data.modules,

              findings:
                data.findings.slice(
                  0,
                  20
                ),

              caveats:
                data.caveats.slice(
                  0,
                  20
                ),
            }
          : undefined,
      [data]
    );

  if (loading) {
    return (
      <div className="mt-6 overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-b from-orange-500/5 to-zinc-950/70 text-left">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium tracking-[0.18em] text-orange-300">
                AYZO BITCOIN INTELLIGENCE
              </div>

              <h3 className="mt-2 text-xl font-semibold text-zinc-100">
                Verifying Bitcoin evidence
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                Reading bounded address history, verifying plan-aware
                canonical UTXO evidence, flow, counterparties and observed funding.
              </p>
            </div>

            <div className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1.5 font-mono text-[10px] text-zinc-500">
              {elapsedSeconds}s elapsed
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {[
              "Address history",
              "Canonical transactions",
              "UTXO flow",
              "Counterparties & funding",
            ].map(
              item => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-zinc-900 bg-black/20 px-4 py-3"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-40" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-400" />
                  </span>

                  <span className="text-xs text-zinc-400">
                    {item}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  if (
    dailyLimitReached
  ) {
    return <AnalysisLimitCard />;
  }

  if (
    error ||
    !data
  ) {
    return (
      <div className="mt-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 text-left sm:p-8">
        <div className="text-sm font-medium text-amber-300">
          Bitcoin intelligence unavailable
        </div>

        <div className="mt-2 text-xs leading-5 text-zinc-500">
          {error}
        </div>
      </div>
    );
  }

  const canonical =
    data.canonicalTransaction;

  const visualEvidenceGraph =
    buildBitcoinVisualEvidenceGraph({
      address:
        data.address,

      history:
        data.history,

      canonicalTransaction:
        data.canonicalTransaction,
    });

  const activityTimeline =
    buildBitcoinActivityTimeline({
      transactions:
        data.history.transactions,

      nextCursor:
        data.history.nextCursor,
    });

  return (
    <div className="mt-6 space-y-6 text-left">
      <AnalysisWorkspaceOverview
        networkLabel="Bitcoin"
        subject={address}
        coverage={data.coverage}
        findings={data.findings}
        caveats={data.caveats}
        graph={visualEvidenceGraph}
        timeline={activityTimeline}
      />

      <AnalysisWorkspaceDetails>

      <section className="overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-zinc-950/80">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-5 border-b border-zinc-800/80 pb-6 sm:flex-row sm:items-start">
            <div>
              <div className="text-xs font-medium tracking-[0.18em] text-orange-300">
                AYZO BITCOIN INTELLIGENCE
              </div>

              <h2 className="mt-2 text-2xl font-semibold">
                Bitcoin Address
              </h2>

              <div className="mt-2 break-all font-mono text-xs text-zinc-500">
                {data.address}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[10px] font-medium tracking-wide text-orange-300">
                BITCOIN MAINNET
              </span>

              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[10px] font-medium tracking-wide text-violet-300">
                {data.coverage.toUpperCase()} COVERAGE
              </span>
            </div>
          </div>

          <div className="grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="History sampled"
              value={`${data.history.transactions.length} tx`}
            />

            <Stat
              label="Canonical verified"
              value={`${data.derived.canonicalCoverage.verified}/${data.derived.canonicalCoverage.requested}`}
            />

            <Stat
              label="Counterparties"
              value={String(
                data.derived
                  .counterparties
                  .count
              )}
            />

            <Stat
              label="Prevout coverage"
              value={`${data.derived.canonicalCoverage.prevoutResolved}/${data.derived.canonicalCoverage.prevoutEligible}`}
            />
          </div>

          <div className="grid gap-2 border-t border-zinc-900 pt-5 sm:grid-cols-2">
            <Module
              label="Address history"
              status={
                data.modules
                  .addressHistory
                  .status
              }
            />

            <Module
              label="Canonical evidence"
              status={
                data.modules
                  .canonicalTransactionEvidence
                  .status
              }
            />

            <Module
              label="UTXO flow"
              status={
                data.modules
                  .flow
                  .status
              }
            />

            <Module
              label="Counterparties"
              status={
                data.modules
                  .counterparties
                  .status
              }
            />

            <Module
              label="Observed funding"
              status={
                data.modules
                  .funding
                  .status
              }
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-orange-500/15 bg-zinc-950/60 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium tracking-[0.16em] text-orange-300">
              BITCOIN DEEP INVESTIGATION
            </div>

            <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">
              Evidence-backed UTXO flow, explicit counterparties and bounded
              observed funding. Change ownership and ultimate source are not inferred.
            </p>
          </div>

          <span className="rounded-full border border-zinc-800 px-3 py-1 text-[9px] uppercase tracking-wide text-zinc-500">
            {data.analysisPlan} depth
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Incoming tx"
            value={String(
              data.derived
                .flow
                .incomingTransactionCount
            )}
          />

          <Stat
            label="Outgoing tx"
            value={String(
              data.derived
                .flow
                .outgoingTransactionCount
            )}
          />

          <Stat
            label="Observed incoming"
            value={formatSats(
              data.derived
                .flow
                .incomingSats
            )}
          />

          <Stat
            label="Observed outgoing"
            value={formatSats(
              data.derived
                .flow
                .outgoingNonTargetSats
            )}
          />

          <Stat
            label="Self-directed"
            value={String(
              data.derived
                .flow
                .selfTransactionCount
            )}
          />

          <Stat
            label="Direction unresolved"
            value={String(
              data.derived
                .flow
                .unresolvedTransactionCount
            )}
          />

          <Stat
            label="Prevouts unavailable"
            value={String(
              data.derived
                .canonicalCoverage
                .prevoutUnavailable
            )}
          />

          <Stat
            label="Prevouts omitted"
            value={String(
              data.derived
                .canonicalCoverage
                .prevoutOmitted
            )}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-5">
            <div className="text-[10px] font-medium tracking-[0.14em] text-zinc-600">
              OBSERVED FUNDING
            </div>

            {data.derived.observedFunding ? (
              <div className="mt-4 space-y-2">
                <div className="break-all font-mono text-xs text-zinc-300">
                  {data.derived.observedFunding.sourceAddress}
                </div>

                <div className="text-xs text-zinc-500">
                  Amount:{" "}
                  {formatSats(
                    data.derived
                      .observedFunding
                      .amountSats
                  )}
                </div>

                <div className="font-mono text-[10px] text-zinc-600">
                  TX:{" "}
                  {short(
                    data.derived
                      .observedFunding
                      .transactionHash
                  )}
                </div>

                <p className="pt-2 text-[10px] leading-5 text-zinc-700">
                  Direct inbound evidence inside the bounded canonical sample.
                  This is not proof of ultimate origin.
                </p>
              </div>
            ) : (
              <p className="mt-4 text-xs leading-5 text-zinc-600">
                No direct inbound funding source was resolved in the current
                canonical evidence window.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-black/20 p-5">
            <div className="text-[10px] font-medium tracking-[0.14em] text-zinc-600">
              EXPLICIT COUNTERPARTIES
            </div>

            {data.derived.counterparties.items.length > 0 ? (
              <div className="mt-4 space-y-2">
                {data.derived.counterparties.items
                  .slice(
                    0,
                    8
                  )
                  .map(
                    counterparty => (
                      <div
                        key={counterparty.address}
                        className="rounded-xl border border-zinc-900 bg-black/20 px-3 py-3"
                      >
                        <div className="break-all font-mono text-[10px] text-zinc-300">
                          {counterparty.address}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-zinc-600">
                          <span>
                            observations:{" "}
                            {counterparty.observationCount}
                          </span>

                          <span>
                            inbound:{" "}
                            {counterparty.incomingCount}
                          </span>

                          <span>
                            outbound:{" "}
                            {counterparty.outgoingCount}
                          </span>
                        </div>
                      </div>
                    )
                  )}
              </div>
            ) : (
              <p className="mt-4 text-xs leading-5 text-zinc-600">
                No explicit provider-decoded counterparty addresses were
                available in this bounded canonical sample.
              </p>
            )}
          </div>
        </div>
      </section>

      {canonical && (
        <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
            CANONICAL TRANSACTION EVIDENCE
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Transaction"
              value={
                short(
                  canonical.transactionHash
                )
              }
            />

            <Stat
              label="Inputs"
              value={String(
                canonical.inputs.length
              )}
            />

            <Stat
              label="Outputs"
              value={String(
                canonical.outputs.length
              )}
            />

            <Stat
              label="Prevouts complete"
              value={
                canonical
                  .prevoutCoverage
                  .complete
                  ? "Yes"
                  : "Limited"
              }
            />
          </div>
        </section>
      )}

      {data.canonicalTransactions.length > 0 && (
        <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
              PLAN-AWARE CANONICAL SAMPLES
            </div>

            <div className="text-[10px] text-zinc-600">
              verified{" "}
              {data.derived.canonicalCoverage.verified}
              {" / "}
              requested{" "}
              {data.derived.canonicalCoverage.requested}
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {data.canonicalTransactions.map(
              (
                transaction,
                index
              ) => (
                <div
                  key={
                    transaction
                      .transactionHash
                  }
                  className="grid gap-2 rounded-xl border border-zinc-900 bg-black/20 px-4 py-3 text-xs sm:grid-cols-4"
                >
                  <div className="font-mono text-zinc-300">
                    #{index + 1}{" "}
                    {short(
                      transaction
                        .transactionHash
                    )}
                  </div>

                  <div className="text-zinc-500">
                    inputs:{" "}
                    {transaction.inputs.length}
                  </div>

                  <div className="text-zinc-500">
                    outputs:{" "}
                    {transaction.outputs.length}
                  </div>

                  <div className="text-zinc-500">
                    prevouts:{" "}
                    {transaction.prevoutCoverage.resolved}
                    /
                    {transaction.prevoutCoverage.eligible}
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {data.history.transactions.length >
        0 && (
        <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
            BOUNDED ADDRESS HISTORY
          </div>

          <div className="mt-5 space-y-2">
            {data.history.transactions.map(
              (
                transaction,
                index
              ) => (
                <div
                  key={
                    transaction
                      .transactionHash
                  }
                  className="grid gap-2 rounded-xl border border-zinc-900 bg-black/20 px-4 py-3 text-xs sm:grid-cols-3"
                >
                  <div className="font-mono text-zinc-300">
                    #{index + 1}{" "}
                    {short(
                      transaction
                        .transactionHash
                    )}
                  </div>

                  <div className="text-zinc-500">
                    Block:{" "}
                    {transaction.blockHeight ??
                      "Unavailable"}
                  </div>

                  <div className="text-zinc-500">
                    {formatTimestamp(
                      transaction.timestamp
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {data.findings.length >
        0 && (
        <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
            FINDINGS
          </div>

          <div className="mt-5 space-y-3">
            {data.findings.map(
              finding => (
                <div
                  key={
                    finding.id
                  }
                  className="rounded-xl border border-zinc-900 bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium text-zinc-200">
                      {
                        finding.title
                      }
                    </div>

                    <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[9px] uppercase tracking-wide text-zinc-500">
                      {
                        finding.confidence
                      }{" "}
                      confidence
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {
                      finding.summary
                    }
                  </p>

                  <p className="mt-2 text-[10px] leading-5 text-zinc-700">
                    {
                      finding.caveat
                    }
                  </p>
                </div>
              )
            )}
          </div>
        </section>
      )}

      <WalletTrackRecordPanel
        record={
          buildBitcoinWalletTrackRecord({
            timeline:
              buildBitcoinActivityTimeline({
                transactions:
                  data.history.transactions,

                nextCursor:
                  data.history.nextCursor,
              }),

            historyTransactionCount:
              data.history.transactions.length,

            hasNextCursor:
              Boolean(
                data.history.nextCursor
              ),

            canonicalTransaction:
              data.canonicalTransaction,
          })
        }
        subjectLabel="Analyzed Bitcoin address"
        profileEligible={true}
      />

      <ActivityTimelinePanel
        timeline={activityTimeline}
      />

      </AnalysisWorkspaceDetails>
      <AnalysisWorkspaceResearchTools>
        <AnalysisActions
                network="bitcoin"
                subjectType="wallet"
                subjectValue={address}
                title="Bitcoin Address Analysis"
                analysisPayload={historicalSnapshot}
                askEvidencePayload={askEvidencePayload}
              />
      </AnalysisWorkspaceResearchTools>

      <section className="rounded-3xl border border-zinc-900 bg-black/20 p-5">
        <div className="text-[10px] font-medium tracking-[0.14em] text-zinc-600">
          EVIDENCE LIMITATIONS
        </div>

        <div className="mt-3 space-y-2">
          {data.caveats.map(
            caveat => (
              <p
                key={caveat}
                className="text-[10px] leading-5 text-zinc-700"
              >
                {caveat}
              </p>
            )
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
      <div className="text-[10px] text-zinc-600">
        {label}
      </div>

      <div className="mt-2 break-all text-sm font-medium text-zinc-200">
        {value}
      </div>
    </div>
  );
}

function Module({
  label,
  status,
}: {
  label: string;
  status:
    | "complete"
    | "limited"
    | "unavailable";
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-black/20 px-4 py-3">
      <span className="text-xs text-zinc-500">
        {label}
      </span>

      <span className="text-[9px] font-medium tracking-wide text-zinc-400">
        {statusLabel(
          status
        )}
      </span>
    </div>
  );
}
