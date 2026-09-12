"use client";

import {
  useEffect,
  useState,
} from "react";

type SubjectType =
  | "wallet"
  | "token"
  | "transaction"
  | "entity"
  | "protocol";

type Primitive =
  | string
  | number
  | null;

type HistoricalChange = {
  category:
    | "metric"
    | "module"
    | "finding";

  key: string;
  label: string;

  direction:
    | "increased"
    | "decreased"
    | "changed"
    | "added"
    | "removed";

  before:
    Primitive;

  after:
    Primitive;
};

type Comparison = {
  version: 1;

  previousCapturedAt:
    string;

  currentCapturedAt:
    string;

  changeCount:
    number;

  hasChanges:
    boolean;

  changes:
    HistoricalChange[];
};

type HistoricalResponse = {
  available?:
    boolean;

  baseline?: {
    id: string;
    createdAt: string;
  } | null;

  comparison?:
    Comparison | null;

  code?:
    string;

  error?:
    string;
};

type State =
  | "loading"
  | "locked"
  | "no-baseline"
  | "ready"
  | "error";

type Props = {
  network: string;

  subjectType:
    SubjectType;

  subjectValue:
    string;

  currentSnapshot:
    unknown;
};

function tokenDecimalsFromSnapshot(
  snapshot: unknown
) {
  if (
    typeof snapshot !==
      "object" ||
    snapshot === null
  ) {
    return null;
  }

  const root =
    snapshot as Record<
      string,
      unknown
    >;

  if (
    typeof root.metrics !==
      "object" ||
    root.metrics === null
  ) {
    return null;
  }

  const metrics =
    root.metrics as Record<
      string,
      unknown
    >;

  const decimals =
    metrics.tokenDecimals;

  if (
    typeof decimals !==
      "number" ||
    !Number.isInteger(
      decimals
    ) ||
    decimals < 0 ||
    decimals > 255
  ) {
    return null;
  }

  return decimals;
}

function formatRawTokenAmount(
  value: Primitive,
  decimals: number | null
) {
  if (
    decimals === null ||
    typeof value !==
      "string" ||
    !/^-?\d+$/.test(
      value
    )
  ) {
    return null;
  }

  const negative =
    value.startsWith(
      "-"
    );

  const unsigned =
    negative
      ? value.slice(1)
      : value;

  if (
    decimals === 0
  ) {
    const integer =
      BigInt(
        unsigned || "0"
      ).toLocaleString(
        "en-US"
      );

    return negative
      ? `-${integer}`
      : integer;
  }

  const padded =
    unsigned.padStart(
      decimals + 1,
      "0"
    );

  const integerRaw =
    padded.slice(
      0,
      -decimals
    );

  const fractionRaw =
    padded.slice(
      -decimals
    );

  const integer =
    BigInt(
      integerRaw || "0"
    ).toLocaleString(
      "en-US"
    );

  const fraction =
    fractionRaw.replace(
      /0+$/,
      ""
    );

  const formatted =
    fraction
      ? `${integer}.${fraction}`
      : integer;

  return negative
    ? `-${formatted}`
    : formatted;
}

function formatValue(
  value: Primitive
) {
  if (
    value ===
    null
  ) {
    return "—";
  }

  if (
    typeof value ===
    "number"
  ) {
    return Number.isInteger(
      value
    )
      ? value.toLocaleString(
          "en-US"
        )
      : value.toLocaleString(
          "en-US",
          {
            maximumFractionDigits:
              4,
          }
        );
  }

  if (
    value.length >
    32
  ) {
    return (
      `${value.slice(
        0,
        14
      )}…${value.slice(
        -10
      )}`
    );
  }

  return value;
}

function formatChangeValue(
  change: HistoricalChange,
  value: Primitive,
  tokenDecimals:
    number | null
) {
  if (
    change.key ===
    "tokenSupplyRaw"
  ) {
    const formatted =
      formatRawTokenAmount(
        value,
        tokenDecimals
      );

    if (formatted) {
      return formatted;
    }
  }

  return formatValue(
    value
  );
}

function directionLabel(
  value:
    HistoricalChange[
      "direction"
    ]
) {
  switch (value) {
    case "increased":
      return "INCREASED";

    case "decreased":
      return "DECREASED";

    case "added":
      return "ADDED";

    case "removed":
      return "REMOVED";

    case "changed":
      return "CHANGED";
  }
}

function formatDate(
  value:
    string | undefined
) {
  if (!value) {
    return null;
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

export default function HistoricalChangesPanel({
  network,
  subjectType,
  subjectValue,
  currentSnapshot,
}: Props) {
  const [
    state,
    setState,
  ] =
    useState<State>(
      "loading"
    );

  const [
    baselineDate,
    setBaselineDate,
  ] =
    useState<
      string | null
    >(null);

  const [
    comparison,
    setComparison,
  ] =
    useState<
      Comparison | null
    >(null);

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      if (
        !currentSnapshot
      ) {
        setState(
          "no-baseline"
        );

        return;
      }

      setState(
        "loading"
      );

      setComparison(
        null
      );

      try {
        const response =
          await fetch(
            "/api/account/historical-changes",
            {
              method:
                "POST",

              credentials:
                "same-origin",

              cache:
                "no-store",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  network,
                  subjectType,
                  subjectValue,
                  currentSnapshot,
                }),
            }
          );

        const body =
          await response
            .json()
            .catch(
              () => null
            ) as HistoricalResponse | null;

        if (cancelled) {
          return;
        }

        if (
          response.status ===
            403 &&
          body?.code ===
            "PLAN_REQUIRED"
        ) {
          setState(
            "locked"
          );

          return;
        }

        if (!response.ok) {
          setState(
            "error"
          );

          return;
        }

        if (
          !body?.available ||
          !body.comparison
        ) {
          setState(
            "no-baseline"
          );

          return;
        }

        setBaselineDate(
          formatDate(
            body.baseline
              ?.createdAt
          )
        );

        setComparison(
          body.comparison
        );

        setState(
          "ready"
        );
      } catch {
        if (
          !cancelled
        ) {
          setState(
            "error"
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
    network,
    subjectType,
    subjectValue,
    currentSnapshot,
  ]);

  if (
    state ===
    "loading"
  ) {
    return (
      <div className="mt-5 rounded-2xl border border-zinc-900 bg-black/20 p-4">
        <div className="text-[10px] font-medium tracking-[0.14em] text-violet-400">
          HISTORICAL CHANGES
        </div>

        <p className="mt-2 text-xs text-zinc-600">
          Checking previous AYZO evidence…
        </p>
      </div>
    );
  }

  if (
    state ===
    "locked"
  ) {
    return (
      <div className="mt-5 rounded-2xl border border-zinc-900 bg-black/20 p-4">
        <div className="text-[10px] font-medium tracking-[0.14em] text-violet-400">
          PRO · HISTORICAL CHANGES
        </div>

        <div className="mt-2 text-sm font-medium text-zinc-300">
          Track what changed between analyses
        </div>

        <p className="mt-2 text-xs leading-5 text-zinc-600">
          Historical comparison is available with AYZO Pro and Advanced.
        </p>
      </div>
    );
  }

  if (
    state ===
    "error"
  ) {
    return null;
  }

  if (
    state ===
      "no-baseline" ||
    !comparison
  ) {
    return (
      <div className="mt-5 rounded-2xl border border-zinc-900 bg-black/20 p-4">
        <div className="text-[10px] font-medium tracking-[0.14em] text-violet-400">
          HISTORICAL CHANGES
        </div>

        <div className="mt-2 text-sm font-medium text-zinc-300">
          No previous snapshot yet
        </div>

        <p className="mt-2 text-xs leading-5 text-zinc-600">
          Save this analysis. When you analyze the same subject again later,
          AYZO can compare the new evidence with the saved baseline.
        </p>
      </div>
    );
  }

  const tokenDecimals =
    tokenDecimalsFromSnapshot(
      currentSnapshot
    );

  const visibleChanges =
    comparison.changes.slice(
      0,
      8
    );

  return (
    <div className="mt-5 rounded-2xl border border-violet-500/20 bg-black/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-medium tracking-[0.14em] text-violet-400">
            PRO · HISTORICAL CHANGES
          </div>

          <div className="mt-2 text-sm font-medium text-zinc-200">
            Changes since previous analysis
          </div>
        </div>

        <div className="rounded-full border border-zinc-800 px-3 py-1 text-[10px] text-zinc-500">
          {comparison.changeCount}
          {" "}
          {comparison.changeCount ===
          1
            ? "CHANGE"
            : "CHANGES"}
        </div>
      </div>

      {baselineDate && (
        <p className="mt-2 text-[10px] text-zinc-600">
          Baseline saved{" "}
          {baselineDate}
        </p>
      )}

      {!comparison.hasChanges ? (
        <div className="mt-4 rounded-xl border border-zinc-900 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400">
            No tracked evidence changes were detected.
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {visibleChanges.map(
            (
              change,
              index
            ) => (
              <div
                key={`${change.category}-${change.key}-${index}`}
                className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-medium text-zinc-300">
                    {change.label}
                  </div>

                  <div className="text-[9px] font-medium tracking-[0.12em] text-violet-400">
                    {directionLabel(
                      change.direction
                    )}
                  </div>
                </div>

                <div className="mt-2 flex min-w-0 items-center gap-2 font-mono text-[10px] text-zinc-600">
                  <span className="truncate">
                    {formatChangeValue(
                      change,
                      change.before,
                      tokenDecimals
                    )}
                  </span>

                  <span>
                    →
                  </span>

                  <span className="truncate text-zinc-400">
                    {formatChangeValue(
                      change,
                      change.after,
                      tokenDecimals
                    )}
                  </span>
                </div>
              </div>
            )
          )}

          {comparison.changeCount >
            visibleChanges.length && (
            <div className="px-1 pt-1 text-[10px] text-zinc-600">
              +
              {comparison.changeCount -
                visibleChanges.length}
              {" "}
              additional tracked changes
            </div>
          )}
        </div>
      )}
    </div>
  );
}
