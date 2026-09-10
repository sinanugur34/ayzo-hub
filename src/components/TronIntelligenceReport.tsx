"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  TronTransactionEvidence,
} from "@/lib/intelligence/tron/types";

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

type ModuleState = {
  status:
    | "complete"
    | "limited"
    | "unavailable";
  error: string | null;
};

type TronSuccess = {
  ok: true;
  network: "tron";
  address: string;

  coverage:
    | "partial"
    | "limited";

  history: {
    transactions:
      readonly {
        transactionHash:
          string;
        blockHeight:
          number | null;
        timestamp:
          string | null;
        confirmed:
          boolean;
      }[];

    nextCursor:
      string | null;
  };

  canonicalTransaction:
    TronTransactionEvidence | null;

  modules: {
    addressHistory:
      ModuleState;
    canonicalTransactionEvidence:
      ModuleState;
  };

  findings:
    readonly Finding[];

  caveats:
    readonly string[];
};

type TronFailure = {
  ok: false;
  code?: string;
  error: string;
  network?: "tron";
};

type TronResponse =
  | TronSuccess
  | TronFailure;

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
    ModuleState["status"]
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

function formatTrx(
  sun:
    string | null
) {
  if (sun === null) {
    return "Unavailable";
  }

  try {
    const value =
      BigInt(sun);

    const whole =
      value /
      1_000_000n;

    const remainder =
      value %
      1_000_000n;

    if (
      remainder ===
      0n
    ) {
      return (
        `${whole.toLocaleString(
          "en-US"
        )} TRX`
      );
    }

    const fraction =
      remainder
        .toString()
        .padStart(
          6,
          "0"
        )
        .replace(
          /0+$/,
          ""
        );

    return (
      `${whole.toLocaleString(
        "en-US"
      )}.${fraction} TRX`
    );
  } catch {
    return `${sun} SUN`;
  }
}

function EvidenceCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
      <div className="text-[10px] font-medium tracking-[0.14em] text-zinc-600">
        {label}
      </div>

      <div className="mt-2 break-all text-sm font-medium text-zinc-200">
        {value}
      </div>
    </div>
  );
}

export default function TronIntelligenceReport({
  address,
}: {
  address: string;
}) {
  const [
    data,
    setData,
  ] =
    useState<
      TronSuccess | null
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
                    "tron",
                  address,
                }),
            }
          );

        const result =
          (
            await response.json()
          ) as TronResponse;

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
              "DAILY_FREE_LIMIT" ||
            result.code ===
              "DAILY_PRO_LIMIT"
          ) {
            setDailyLimitReached(
              true
            );

            return;
          }

          setError(
            result.error ||
              "TRON intelligence is temporarily unavailable."
          );

          return;
        }

        setData(
          result
        );
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof
              Error
              ? caught.message
              : "TRON intelligence is temporarily unavailable."
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
      <div className="mt-6 overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-b from-red-500/5 to-zinc-950/70 text-left">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium tracking-[0.18em] text-red-300">
                AYZO TRON INTELLIGENCE
              </div>

              <h3 className="mt-2 text-xl font-semibold text-zinc-100">
                Verifying TRON evidence
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                Reading bounded confirmed history and verifying solidified
                canonical transaction evidence.
              </p>
            </div>

            <div className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1.5 font-mono text-[10px] text-zinc-500">
              {elapsedSeconds}s elapsed
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (
    dailyLimitReached
  ) {
    return (
      <div className="mt-6 rounded-3xl border border-violet-500/20 bg-violet-500/5 p-6 text-left sm:p-8">
        <div className="text-xs font-medium tracking-[0.18em] text-violet-300">
          USAGE LIMIT
        </div>

        <h3 className="mt-2 text-xl font-semibold text-white">
          Daily analysis limit reached
        </h3>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Your current AYZO analysis allowance has been used.
        </p>
      </div>
    );
  }

  if (
    error ||
    !data
  ) {
    return (
      <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/5 p-6 text-left sm:p-8">
        <div className="text-xs font-medium tracking-[0.18em] text-red-300">
          TRON INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-white">
          Analysis unavailable
        </h3>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          {error ||
            "TRON intelligence is temporarily unavailable."}
        </p>
      </div>
    );
  }

  const canonical =
    data.canonicalTransaction;

  const newestHistory =
    data.history
      .transactions[0];

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 text-left">
      <div className="border-b border-zinc-900 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium tracking-[0.18em] text-red-300">
              AYZO TRON INTELLIGENCE
            </div>

            <h3 className="mt-2 text-2xl font-semibold text-white">
              Evidence report
            </h3>

            <p className="mt-2 break-all font-mono text-xs text-zinc-500">
              {address}
            </p>
          </div>

          <div className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1.5 text-[10px] font-medium tracking-[0.12em] text-zinc-400">
            {data.coverage.toUpperCase()} COVERAGE
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
        <EvidenceCard
          label="ADDRESS HISTORY"
          value={
            statusLabel(
              data.modules
                .addressHistory
                .status
            )
          }
        />

        <EvidenceCard
          label="CANONICAL EVIDENCE"
          value={
            statusLabel(
              data.modules
                .canonicalTransactionEvidence
                .status
            )
          }
        />

        <EvidenceCard
          label="OBSERVED TRANSACTIONS"
          value={
            String(
              data.history
                .transactions
                .length
            )
          }
        />

        <EvidenceCard
          label="LATEST OBSERVED TX"
          value={
            short(
              newestHistory
                ?.transactionHash
            )
          }
        />

        <EvidenceCard
          label="BLOCK"
          value={
            canonical
              ?.blockHeight !==
              null &&
            canonical
              ?.blockHeight !==
              undefined
              ? canonical
                  .blockHeight
                  .toLocaleString(
                    "en-US"
                  )
              : "Unavailable"
          }
        />

        <EvidenceCard
          label="TIMESTAMP"
          value={
            formatTimestamp(
              canonical
                ?.timestamp ??
                newestHistory
                  ?.timestamp ??
                null
            )
          }
        />

        <EvidenceCard
          label="EXECUTION"
          value={
            canonical
              ?.executionResult ??
            "Unavailable"
          }
        />

        <EvidenceCard
          label="TRANSACTION FEE"
          value={
            formatTrx(
              canonical
                ?.feeSun ??
                null
            )
          }
        />

        <EvidenceCard
          label="ENERGY USAGE"
          value={
            canonical
              ?.energyUsageTotal !==
              null &&
            canonical
              ?.energyUsageTotal !==
              undefined
              ? canonical
                  .energyUsageTotal
                  .toLocaleString(
                    "en-US"
                  )
              : "Unavailable"
          }
        />

        <EvidenceCard
          label="NET USAGE"
          value={
            canonical
              ?.netUsage !==
              null &&
            canonical
              ?.netUsage !==
              undefined
              ? canonical
                  .netUsage
                  .toLocaleString(
                    "en-US"
                  )
              : "Unavailable"
          }
        />

        <EvidenceCard
          label="CONTRACT TYPE"
          value={
            canonical
              ?.contract
              ?.type ??
            "Unavailable"
          }
        />

        <EvidenceCard
          label="SIGNATURES"
          value={
            canonical
              ? String(
                  canonical
                    .signatureCount
                )
              : "Unavailable"
          }
        />
      </div>

      {data.findings.length >
        0 && (
        <div className="border-t border-zinc-900 p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
            FINDINGS
          </div>

          <div className="mt-4 space-y-3">
            {data.findings.map(
              finding => (
                <div
                  key={
                    finding.id
                  }
                  className="rounded-2xl border border-zinc-800 bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium text-zinc-200">
                      {
                        finding.title
                      }
                    </div>

                    <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                      {
                        finding.confidence
                      }{" "}
                      confidence
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {
                      finding.summary
                    }
                  </p>

                  <p className="mt-2 text-xs leading-5 text-zinc-600">
                    {
                      finding.caveat
                    }
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {data.caveats.length >
        0 && (
        <div className="border-t border-zinc-900 p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
            EVIDENCE CAVEATS
          </div>

          <div className="mt-3 space-y-2">
            {data.caveats.map(
              caveat => (
                <p
                  key={
                    caveat
                  }
                  className="text-xs leading-5 text-zinc-600"
                >
                  {caveat}
                </p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
