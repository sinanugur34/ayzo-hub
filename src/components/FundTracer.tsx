"use client";

import {
  useMemo,
  useState,
} from "react";

import type {
  FundTracerModel,
  FundTracerPath,
} from "@/lib/intelligence/fundTracer";

import type {
  PlanId,
} from "@/lib/plans/types";

function short(
  value:
    string
) {
  if (
    value.length <=
    24
  ) {
    return value;
  }

  return `${value.slice(
    0,
    9
  )}…${value.slice(
    -7
  )}`;
}

function formatTime(
  value:
    string | null
) {
  if (!value) {
    return "Time unavailable";
  }

  const parsed =
    new Date(
      value
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    parsed
  );
}

function pathLabel(
  path:
    FundTracerPath
) {
  return path.addresses
    .map(
      short
    )
    .join(
      " → "
    );
}

export default function FundTracerPanel({
  model,
  plan,
  onEvidenceRefsChange,
}: {
  model:
    FundTracerModel;

  plan:
    Extract<
      PlanId,
      "pro" | "advanced"
    >;

  onEvidenceRefsChange?:
    (
      refs:
        readonly string[]
    ) => void;
}) {
  const [
    selectedId,
    setSelectedId,
  ] =
    useState<
      string | null
    >(
      model.paths[0]
        ?.id ??
      null
    );


  const selected =
    useMemo(
      () =>
        model.paths.find(
          path =>
            path.id ===
            selectedId
        ) ??
        model.paths[0] ??
        null,
      [
        model,
        selectedId,
      ]
    );

  function selectPath(
    path:
      FundTracerPath
  ) {
    setSelectedId(
      path.id
    );

    onEvidenceRefsChange?.(
      path.evidenceRefs
    );
  }

  return (
    <section
      id="fund-tracer"
      data-fund-tracer="v1"
      className="mt-5 overflow-hidden rounded-3xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.08] via-zinc-950/90 to-black"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-900 p-5 sm:p-6">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.18em] text-violet-300">
            INTERACTIVE FUND TRACER
          </div>

          <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-zinc-100">
            Follow observed funding paths
          </h3>

          <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">
            Inspect direct funding evidence and the transaction references behind each observed route.
            {plan ===
              "advanced"
              ? " Advanced also exposes bounded multi-hop EVM paths when Deep Funding evidence is available."
              : ""}
          </p>
        </div>

        <span className="rounded-full border border-violet-500/20 bg-violet-500/[0.08] px-3 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-violet-300">
          {plan ===
          "advanced"
            ? "ADVANCED"
            : "PRO"}
        </span>
      </div>

      {model.status ===
      "unavailable" ? (
        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-5">
            <div className="text-sm font-medium text-zinc-300">
              No supported funding path in this evidence window
            </div>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-600">
              AYZO does not create a route when reliable source-to-target funding evidence is unavailable.
            </p>
          </div>

          <p className="mt-4 text-[10px] leading-5 text-zinc-700">
            {model.limitation}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 border-b border-zinc-900 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
            <div className="rounded-2xl border border-zinc-900 bg-black/25 p-4">
              <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-700">
                Direct paths
              </div>

              <div className="mt-2 text-xl font-semibold text-zinc-200">
                {model.directPathCount}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-black/25 p-4">
              <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-700">
                Multi-hop paths
              </div>

              <div className="mt-2 text-xl font-semibold text-zinc-200">
                {model.multiHopPathCount}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-black/25 p-4">
              <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-700">
                Maximum observed depth
              </div>

              <div className="mt-2 text-xl font-semibold text-zinc-200">
                {model.maxObservedHops}
                {" "}
                {model.maxObservedHops ===
                1
                  ? "hop"
                  : "hops"}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-black/25 p-4">
              <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-700">
                Transaction refs
              </div>

              <div className="mt-2 text-xl font-semibold text-zinc-200">
                {model.evidenceTransactionCount}
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
            <div className="space-y-2">
              <div className="mb-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-zinc-600">
                Observed routes
              </div>

              {model.paths.map(
                path => {
                  const active =
                    selected
                      ?.id ===
                    path.id;

                  return (
                    <button
                      key={
                        path.id
                      }
                      type="button"
                      onClick={() =>
                        selectPath(
                          path
                        )
                      }
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-violet-400/35 bg-violet-500/[0.09]"
                          : "border-zinc-900 bg-black/25 hover:border-zinc-800"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={
                            path.kind ===
                            "multi_hop"
                              ? "text-[8px] font-semibold uppercase tracking-[0.12em] text-purple-300"
                              : "text-[8px] font-semibold uppercase tracking-[0.12em] text-violet-300"
                          }
                        >
                          {path.kind ===
                          "multi_hop"
                            ? "MULTI-HOP"
                            : "DIRECT"}
                        </span>

                        <span className="text-[9px] text-zinc-600">
                          {path.hopCount}
                          {" "}
                          {path.hopCount ===
                          1
                            ? "hop"
                            : "hops"}
                        </span>
                      </div>

                      <div className="mt-3 break-all font-mono text-[10px] leading-5 text-zinc-300">
                        {pathLabel(
                          path
                        )}
                      </div>

                      <div className="mt-2 text-[9px] text-zinc-600">
                        {path.evidenceCount}
                        {" "}
                        observed evidence item(s)
                      </div>
                    </button>
                  );
                }
              )}
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-black/30 p-4 sm:p-5">
              {selected ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-violet-300">
                        Selected funding route
                      </div>

                      <div className="mt-2 text-sm font-medium text-zinc-200">
                        {selected.kind ===
                        "multi_hop"
                          ? "Bounded upstream path"
                          : "Direct observed funding"}
                      </div>
                    </div>

                    <span className="rounded-full border border-zinc-800 px-2.5 py-1 text-[8px] font-medium text-zinc-500">
                      SUPPORTED EVIDENCE
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {selected.addresses.map(
                      (
                        address,
                        index
                      ) => (
                        <div
                          key={`${address}:${index}`}
                          className="contents"
                        >
                          {index >
                            0 && (
                            <span className="text-xs text-violet-500">
                              →
                            </span>
                          )}

                          <span className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-[9px] text-zinc-300">
                            {short(
                              address
                            )}
                          </span>
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-6">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-zinc-600">
                      Transaction evidence
                    </div>

                    {selected.evidence.length >
                    0 ? (
                      <div className="mt-3 space-y-2">
                        {selected.evidence.map(
                          evidence => (
                            <div
                              key={
                                evidence.transactionHash
                              }
                              className="rounded-xl border border-zinc-900 bg-zinc-950/70 p-3"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="font-mono text-[9px] text-zinc-400">
                                  {short(
                                    evidence.transactionHash
                                  )}
                                </div>

                                <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-emerald-400">
                                  {evidence.direction}
                                </span>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-zinc-600">
                                <span>
                                  {formatTime(
                                    evidence.timestamp
                                  )}
                                </span>

                                {evidence.formattedValue &&
                                  evidence.asset && (
                                  <span className="text-zinc-400">
                                    {evidence.formattedValue}
                                    {" "}
                                    {evidence.asset}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : selected.evidenceRefs.length >
                      0 ? (
                      <div className="mt-3 space-y-2">
                        {selected.evidenceRefs.map(
                          reference => (
                            <div
                              key={
                                reference
                              }
                              className="rounded-xl border border-zinc-900 bg-zinc-950/70 p-3"
                            >
                              <div className="font-mono text-[9px] text-zinc-400">
                                {short(
                                  reference
                                )}
                              </div>

                              <div className="mt-1 text-[9px] text-zinc-700">
                                Transaction evidence reference
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-[10px] leading-5 text-zinc-600">
                        This supported funding edge does not expose a transaction reference in the current presentation adapter.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-xs text-zinc-600">
                  Select an observed funding route.
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-900 px-5 py-5 sm:px-6">
            <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-700">
              Evidence boundary
            </div>

            <p className="mt-2 text-[10px] leading-5 text-zinc-600">
              {model.limitation}
            </p>

            <p className="mt-2 text-[10px] font-medium text-zinc-500">
              Ultimate source is not inferred.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
