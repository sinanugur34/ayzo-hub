"use client";

import {
  useEffect,
  useState,
} from "react";

export default function PriorityAnalysisPanel() {
  const [
    state,
    setState,
  ] =
    useState<
      "loading" |
      "hidden" |
      "ready"
    >(
      "loading"
    );

  useEffect(
    () => {
      let cancelled =
        false;

      async function load() {
        try {
          const response =
            await fetch(
              "/api/account/priority-analysis",
              {
                cache:
                  "no-store",

                credentials:
                  "same-origin",
              }
            );

          if (
            cancelled
          ) {
            return;
          }

          if (
            response.status ===
              403 ||
            response.status ===
              401
          ) {
            setState(
              "hidden"
            );

            return;
          }

          if (
            !response.ok
          ) {
            setState(
              "hidden"
            );

            return;
          }

          const body =
            await response
              .json()
              .catch(
                () => null
              );

          setState(
            body?.enabled ===
              true
              ? "ready"
              : "hidden"
          );
        } catch {
          if (
            !cancelled
          ) {
            setState(
              "hidden"
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

  if (
    state !==
      "ready"
  ) {
    return null;
  }

  return (
    <section className="mt-5 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium tracking-[0.16em] text-cyan-300">
            ADVANCED · PRIORITY ANALYSIS
          </div>

          <h2 className="mt-2 text-xl font-semibold">
            Priority Analysis
          </h2>
        </div>

        <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          Active
        </div>
      </div>

      <p className="mt-4 max-w-3xl text-xs leading-6 text-zinc-500">
        During elevated AYZO load, eligible Advanced analyses can use reserved admission capacity before standard traffic reaches the hard system limit.
      </p>

      <p className="mt-3 max-w-3xl text-xs leading-6 text-zinc-600">
        Your daily analysis quota, rate limits, per-client concurrency limits and AYZO safety controls remain in force.
      </p>
    </section>
  );
}
