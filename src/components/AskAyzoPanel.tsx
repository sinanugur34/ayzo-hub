"use client";

import {
  useEffect,
  useMemo,
} from "react";

import {
  useAskAyzoAssistant,
  type AskAyzoSubjectType,
} from "@/components/AskAyzoAssistantProvider";

type Props = {
  network: string;

  subjectType:
    AskAyzoSubjectType;

  subjectValue:
    string;

  evidencePayload?:
    unknown;
};

export default function AskAyzoPanel({
  network,
  subjectType,
  subjectValue,
  evidencePayload,
}: Props) {
  const {
    registerAnalysisContext,
    clearAnalysisContext,
    openAssistant,
  } =
    useAskAyzoAssistant();

  const contextKey =
    `${network}:${subjectType}:${subjectValue}`;

  const analysisContext =
    useMemo(
      () => ({
        key:
          contextKey,

        network,
        subjectType,
        subjectValue,

        evidencePayload:
          evidencePayload ??
          null,
      }),
      [
        contextKey,
        network,
        subjectType,
        subjectValue,
        evidencePayload,
      ]
    );

  useEffect(
    () => {
      registerAnalysisContext(
        analysisContext
      );

      return () => {
        clearAnalysisContext(
          contextKey
        );
      };
    },
    [
      analysisContext,
      clearAnalysisContext,
      contextKey,
      registerAnalysisContext,
    ]
  );

  return (
    <section className="mt-5 flex flex-col gap-3 rounded-2xl border border-violet-500/15 bg-violet-500/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[10px] font-medium tracking-[0.16em] text-violet-400">
            ASK AYZO AVAILABLE
          </div>

          <span className="rounded-full border border-emerald-500/15 bg-emerald-500/5 px-2 py-0.5 text-[8px] font-medium tracking-[0.1em] text-emerald-400">
            CURRENT ANALYSIS CONNECTED
          </span>
        </div>

        <p className="mt-1 truncate text-[10px] text-zinc-600">
          {network.toUpperCase()}
          {" · "}
          {subjectType.toUpperCase()}
          {" · evidence context ready"}
        </p>
      </div>

      <button
        type="button"
        onClick={
          openAssistant
        }
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 text-xs font-medium text-violet-200 transition hover:border-violet-400/40 hover:bg-violet-500/15"
      >
        Open Ask AYZO
      </button>
    </section>
  );
}
