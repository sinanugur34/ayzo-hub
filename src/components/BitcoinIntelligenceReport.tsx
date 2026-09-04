"use client";

import {
  useEffect,
  useState,
} from "react";

import AnalysisActions from "@/components/AnalysisActions";
import WaitlistForm from "@/components/WaitlistForm";

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

  canonicalTransaction: {
    transactionHash: string;
    witnessHash:
      string | null;
    blockHash:
      string | null;
    confirmed: boolean;
    confirmations:
      number | null;

    inputs: readonly {
      previousTransactionHash:
        string | null;
      previousOutputIndex:
        number | null;
      prevout: {
        valueSats: string;
        scriptPubKey:
          string | null;
      } | null;
      prevoutStatus:
        | "resolved"
        | "coinbase"
        | "omitted"
        | "unavailable";
    }[];

    outputs: readonly {
      index: number;
      valueSats: string;
      scriptPubKey:
        string | null;
    }[];

    prevoutCoverage: {
      eligible: number;
      attempted: number;
      resolved: number;
      unavailable: number;
      omitted: number;
      complete: boolean;
    };
  } | null;

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
            result.code ===
            "DAILY_FREE_LIMIT"
          ) {
            setDailyLimitReached(
              true
            );
            return;
          }

          setError(
            result.error ||
              "Bitcoin intelligence is temporarily unavailable."
          );
          return;
        }

        setData(result);
      } catch (caught) {
        if (!cancelled) {
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
                Reading bounded address history and verifying canonical
                transaction evidence from Bitcoin mainnet.
              </p>
            </div>

            <div className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1.5 font-mono text-[10px] text-zinc-500">
              {elapsedSeconds}s elapsed
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {[
              "Address history",
              "Canonical transaction",
              "Input evidence",
              "Output evidence",
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
    return (
      <div className="mt-6 overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/10 to-zinc-950/80 text-left">
        <div className="p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.18em] text-violet-300">
            FREE PLAN
          </div>

          <h3 className="mt-2 text-2xl font-semibold text-zinc-100">
            Daily Free Limit Reached
          </h3>

          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
            You&apos;ve used your 3 free analyses for the current
            24-hour window.
          </p>

          <div className="mt-6">
            <WaitlistForm
              source="free-limit"
              compact
            />
          </div>
        </div>
      </div>
    );
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

  return (
    <div className="mt-6 space-y-6 text-left">
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
              label="Confirmed"
              value={
                canonical
                  ? canonical.confirmed
                    ? "Yes"
                    : "No"
                  : "Unavailable"
              }
            />

            <Stat
              label="Confirmations"
              value={
                canonical?.confirmations !==
                null &&
                canonical?.confirmations !==
                undefined
                  ? String(
                      canonical.confirmations
                    )
                  : "—"
              }
            />

            <Stat
              label="Prevout coverage"
              value={
                canonical
                  ? `${canonical.prevoutCoverage.resolved}/${canonical.prevoutCoverage.eligible}`
                  : "—"
              }
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

      <AnalysisActions
        network="bitcoin"
        subjectType="wallet"
        subjectValue={address}
        title="Bitcoin Address Analysis"
      />

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
