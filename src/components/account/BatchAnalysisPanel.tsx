"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  MAX_BATCH_ANALYSIS_TARGETS,
  parseBatchAnalysisTargets,
  shouldStopBatchAfterStatus,
} from "@/lib/account/batchAnalysis";

type ResultStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "stopped";

type BatchResult = {
  address: string;
  status:
    ResultStatus;
  httpStatus:
    number | null;
  message: string;
};

const networks = [
  "solana",
  "ethereum",
  "base",
  "bnb",
  "arbitrum",
  "polygon",
  "optimism",
  "avalanche",
  "linea",
  "scroll",
  "mantle",
  "sonic",
  "monad",
  "bitcoin",
  "dogecoin",
  "tron",
  "xrp",
] as const;

export default function BatchAnalysisPanel() {
  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    lockedOut,
    setLockedOut,
  ] =
    useState(false);

  const [
    network,
    setNetwork,
  ] =
    useState("bitcoin");

  const [
    input,
    setInput,
  ] =
    useState("");

  const [
    results,
    setResults,
  ] =
    useState<
      BatchResult[]
    >([]);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(
    () => {
      let cancelled =
        false;

      async function load() {
        try {
          const response =
            await fetch(
              "/api/account/batch-analysis",
              {
                cache:
                  "no-store",

                credentials:
                  "same-origin",
              }
            );

          const body =
            await response
              .json()
              .catch(
                () => null
              );

          if (
            response.status ===
              403
          ) {
            if (!cancelled) {
              setLockedOut(
                true
              );
            }

            return;
          }

          if (!response.ok) {
            throw new Error(
              typeof body?.error ===
                "string"
                ? body.error
                : "Unable to load Batch Analysis."
            );
          }
        } catch (
          caught
        ) {
          if (!cancelled) {
            setError(
              caught instanceof
                Error
                ? caught.message
                : "Unable to load Batch Analysis."
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

      void load();

      return () => {
        cancelled =
          true;
      };
    },
    []
  );

  async function runBatch() {
    if (busy) {
      return;
    }

    const parsed =
      parseBatchAnalysisTargets(
        input
      );

    if (!parsed.ok) {
      setError(
        parsed.error
      );

      return;
    }

    setBusy(true);
    setError("");

    setResults(
      parsed.targets.map(
        address => ({
          address,
          status:
            "queued",

          httpStatus:
            null,

          message:
            "Waiting",
        })
      )
    );

    let stopped =
      false;

    for (
      let index = 0;
      index <
      parsed.targets.length;
      index += 1
    ) {
      const address =
        parsed.targets[
          index
        ];

      if (stopped) {
        setResults(
          current =>
            current.map(
              (
                item,
                itemIndex
              ) =>
                itemIndex ===
                  index
                  ? {
                      ...item,

                      status:
                        "stopped",

                      message:
                        "Not started because the batch was stopped safely.",
                    }
                  : item
            )
        );

        continue;
      }

      setResults(
        current =>
          current.map(
            (
              item,
              itemIndex
            ) =>
              itemIndex ===
                index
                ? {
                    ...item,

                    status:
                      "running",

                    message:
                      "Analyzing",
                  }
                : item
          )
      );

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
                  network,
                  address,
                }),
            }
          );

        const body =
          await response
            .json()
            .catch(
              () => null
            );

        const message =
          response.ok
            ? "Completed"
            : (
                typeof body?.error ===
                  "string"
                  ? body.error
                  : `Analysis failed with HTTP ${response.status}.`
              );

        setResults(
          current =>
            current.map(
              (
                item,
                itemIndex
              ) =>
                itemIndex ===
                  index
                  ? {
                      ...item,

                      status:
                        response.ok
                          ? "completed"
                          : "failed",

                      httpStatus:
                        response.status,

                      message,
                    }
                  : item
            )
        );

        if (
          !response.ok &&
          shouldStopBatchAfterStatus(
            response.status
          )
        ) {
          stopped =
            true;
        }
      } catch {
        setResults(
          current =>
            current.map(
              (
                item,
                itemIndex
              ) =>
                itemIndex ===
                  index
                  ? {
                      ...item,

                      status:
                        "failed",

                      httpStatus:
                        null,

                      message:
                        "Network request failed.",
                    }
                  : item
            )
        );

        stopped =
          true;
      }
    }

    setBusy(false);
  }

  return (
    <section className="mt-5 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6">
      <div className="text-xs font-medium tracking-[0.16em] text-cyan-300">
        ADVANCED · BATCH ANALYSIS
      </div>

      <h2 className="mt-2 text-xl font-semibold">
        Batch Analysis
      </h2>

      <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
        Analyze up to five targets sequentially through AYZO&apos;s canonical intelligence pipeline.
      </p>

      {loading ? (
        <div className="mt-5 text-sm text-zinc-600">
          Loading Batch Analysis...
        </div>
      ) : lockedOut ? (
        <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-black/20 p-5">
          <div className="text-sm font-medium text-zinc-200">
            AYZO Advanced required
          </div>

          <p className="mt-2 text-xs text-zinc-600">
            Batch Analysis is available only with AYZO Advanced.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-[220px_1fr]">
            <select
              value={
                network
              }
              disabled={
                busy
              }
              onChange={
                event =>
                  setNetwork(
                    event.target.value
                  )
              }
              className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200 disabled:opacity-50"
            >
              {networks.map(
                value => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    {value}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              disabled={
                busy ||
                !input.trim()
              }
              onClick={
                runBatch
              }
              className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 disabled:opacity-40"
            >
              {busy
                ? "Batch running..."
                : "Run Batch"}
            </button>
          </div>

          <textarea
            value={
              input
            }
            disabled={
              busy
            }
            onChange={
              event =>
                setInput(
                  event.target.value
                )
            }
            rows={6}
            placeholder={`One address per line — maximum ${MAX_BATCH_ANALYSIS_TARGETS}`}
            className="mt-3 w-full resize-y rounded-xl border border-zinc-800 bg-black px-3 py-3 font-mono text-xs text-zinc-200 outline-none disabled:opacity-50"
          />

          <p className="mt-2 text-[10px] leading-5 text-zinc-600">
            Each target uses the normal AYZO analysis quota. Requests run one at a time. Authentication, quota, rate-limit, load-guard and failed-analysis refund behavior are not bypassed.
          </p>

          {results.length >
            0 && (
            <div className="mt-5 space-y-2">
              {results.map(
                (
                  result,
                  index
                ) => (
                  <div
                    key={`${result.address}:${index}`}
                    className="rounded-2xl border border-zinc-900 bg-black/30 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="break-all font-mono text-xs text-zinc-300">
                          {result.address}
                        </div>

                        <div className="mt-2 text-[10px] text-zinc-600">
                          {result.message}
                        </div>
                      </div>

                      <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                        {result.status}

                        {result.httpStatus !==
                          null &&
                          ` · HTTP ${result.httpStatus}`}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </>
      )}

      {error && (
        <div className="mt-4 text-xs text-rose-300">
          {error}
        </div>
      )}
    </section>
  );
}
