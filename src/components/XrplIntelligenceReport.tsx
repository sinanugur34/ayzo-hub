"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AnalysisActions from "@/components/AnalysisActions";
import AnalysisLimitCard from "@/components/AnalysisLimitCard";

import {
  buildHistoricalSnapshot,
} from "@/lib/account/historicalSnapshot";

type ModuleState = {
  status:
    | "complete"
    | "limited"
    | "unavailable";

  error:
    string | null;
};

type XrplSuccess = {
  ok: true;

  network:
    "xrp";

  address:
    string;

  coverage:
    | "partial"
    | "limited";

  account: {
    exists:
      boolean;

    balanceDrops:
      string | null;

    sequence:
      number | null;

    ownerCount:
      number | null;

    flags:
      number | null;

    ledgerIndex:
      number | null;
  };

  history: {
    transactions:
      readonly {
        transactionHash:
          string;

        ledgerIndex:
          number | null;

        timestamp:
          string | null;

        validated:
          boolean;

        transactionType:
          string | null;

        source:
          string | null;

        destination:
          string | null;

        amountDrops:
          string | null;

        feeDrops:
          string | null;

        result:
          string | null;
      }[];

    nextCursor:
      string | null;
  };

  modules: {
    accountState:
      ModuleState;

    transactionHistory:
      ModuleState;
  };

  findings:
    readonly {
      id:
        string;

      category:
        string;

      title:
        string;

      severity:
        string;

      confidence:
        string;

      summary:
        string;

      caveat:
        string;
    }[];

  caveats:
    readonly string[];
};

type XrplFailure = {
  ok:
    false;

  error:
    string;
};

function short(
  value:
    string | null
) {
  if (!value) {
    return "Unavailable";
  }

  if (
    value.length <=
    22
  ) {
    return value;
  }

  return (
    `${value.slice(0, 8)}` +
    "..." +
    `${value.slice(-8)}`
  );
}

function formatXrp(
  drops:
    string | null
) {
  if (
    drops ===
    null
  ) {
    return "Unavailable";
  }

  try {
    const value =
      BigInt(
        drops
      );

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
      return `${whole.toLocaleString("en-US")} XRP`;
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
      `${whole.toLocaleString("en-US")}` +
      `.${fraction} XRP`
    );
  } catch {
    return `${drops} drops`;
  }
}

function statusLabel(
  status:
    ModuleState["status"]
) {
  switch (
    status
  ) {
    case "complete":
      return "VERIFIED";

    case "limited":
      return "LIMITED";

    case "unavailable":
      return "UNAVAILABLE";
  }
}

export default function XrplIntelligenceReport({
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
      XrplSuccess |
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
    dailyLimitReached,
    setDailyLimitReached,
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
                      "xrp",

                    address,
                  }),
              }
            );

          const body =
            await response
              .json() as
              XrplSuccess |
              XrplFailure;

          if (
            cancelled
          ) {
            return;
          }

          if (
            response.status ===
              429
          ) {
            setDailyLimitReached(
              true
            );

            return;
          }

          if (
            !response.ok ||
            !body.ok
          ) {
            setError(
              body.error
            );

            return;
          }

          setData(
            body
          );
        } catch {
          if (
            !cancelled
          ) {
            setError(
              "XRP Ledger intelligence is temporarily unavailable."
            );
          }
        } finally {
          if (
            !cancelled
          ) {
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

  const historicalSnapshot =
    useMemo(
      () =>
        data
          ? buildHistoricalSnapshot(
              "xrp",
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
                "xrpl",

              network:
                "xrp",

              coverage:
                data.coverage,

              account:
                data.account,

              history: {
                transactions:
                  data.history.transactions.slice(
                    0,
                    20
                  ),

                nextCursor:
                  data.history.nextCursor,
              },

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

  if (
    loading
  ) {
    return (
      <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 text-left sm:p-8">
        <div className="text-xs font-medium tracking-[0.18em] text-cyan-300">
          AYZO XRP LEDGER INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-zinc-100">
          Reading validated ledger evidence
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          Reading account state and bounded validated transaction history.
        </p>
      </div>
    );
  }

  if (
    dailyLimitReached
  ) {
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
          XRP LEDGER INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold text-white">
          Analysis unavailable
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          {error ||
            "XRP Ledger intelligence is temporarily unavailable."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 text-left">
      <div className="border-b border-zinc-900 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium tracking-[0.18em] text-cyan-300">
              AYZO XRP LEDGER INTELLIGENCE
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

      <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
          <div className="text-[10px] tracking-[0.14em] text-zinc-600">
            ACCOUNT STATE
          </div>

          <div className="mt-2 text-sm font-medium text-zinc-200">
            {data.account.exists
              ? "FUNDED"
              : "NOT FUNDED"}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
          <div className="text-[10px] tracking-[0.14em] text-zinc-600">
            XRP BALANCE
          </div>

          <div className="mt-2 text-sm font-medium text-zinc-200">
            {formatXrp(
              data.account.balanceDrops
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
          <div className="text-[10px] tracking-[0.14em] text-zinc-600">
            TRANSACTIONS
          </div>

          <div className="mt-2 text-sm font-medium text-zinc-200">
            {
              data.history
                .transactions
                .length
            }
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
          <div className="text-[10px] tracking-[0.14em] text-zinc-600">
            HISTORY MODULE
          </div>

          <div className="mt-2 text-sm font-medium text-zinc-200">
            {statusLabel(
              data.modules.transactionHistory.status
            )}
          </div>
        </div>
      </div>

      {data.history.transactions.length >
        0 && (
        <div className="border-t border-zinc-900 p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.18em] text-zinc-500">
            RECENT VALIDATED TRANSACTIONS
          </div>

          <div className="mt-4 space-y-3">
            {data.history.transactions
              .slice(
                0,
                5
              )
              .map(
                transaction => (
                  <div
                    key={
                      transaction.transactionHash
                    }
                    className="rounded-2xl border border-zinc-800 bg-black/20 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm text-zinc-200">
                        {transaction.transactionType ??
                          "XRPL transaction"}
                      </strong>

                      <span className="text-[10px] tracking-[0.12em] text-zinc-600">
                        {transaction.validated
                          ? "VALIDATED"
                          : "UNVALIDATED"}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 font-mono text-xs text-zinc-600">
                      <div>
                        Hash:{" "}
                        {short(
                          transaction.transactionHash
                        )}
                      </div>

                      <div>
                        Source:{" "}
                        {short(
                          transaction.source
                        )}
                      </div>

                      <div>
                        Destination:{" "}
                        {short(
                          transaction.destination
                        )}
                      </div>

                      <div>
                        Result:{" "}
                        {transaction.result ??
                          "Unavailable"}
                      </div>
                    </div>
                  </div>
                )
              )}
          </div>
        </div>
      )}

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
                  <div className="text-sm font-medium text-zinc-200">
                    {
                      finding.title
                    }
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

      <div className="border-t border-zinc-900 p-6 sm:p-8">
        <AnalysisActions
          network="xrp"
          subjectType="wallet"
          subjectValue={address}
          title="XRP Ledger Address Analysis"
          analysisPayload={historicalSnapshot}
          askEvidencePayload={askEvidencePayload}
        />
      </div>

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