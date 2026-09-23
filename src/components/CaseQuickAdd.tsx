"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

type CaseSummary = {
  id: string;
  name: string;
  status: "open" | "closed";
};

type Props = {
  ensureSavedAnalysis:
    () => Promise<
      string | null
    >;
};

export default function CaseQuickAdd({
  ensureSavedAnalysis,
}: Props) {
  const [
    cases,
    setCases,
  ] =
    useState<CaseSummary[]>([]);

  const [
    available,
    setAvailable,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    selectedCaseId,
    setSelectedCaseId,
  ] =
    useState("");

  const [
    adding,
    setAdding,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  useEffect(() => {
    let cancelled =
      false;

    async function loadCases() {
      try {
        const response =
          await fetch(
            "/api/account/cases",
            {
              cache:
                "no-store",
              credentials:
                "same-origin",
            }
          );

        if (
          cancelled ||
          response.status ===
            401 ||
          response.status ===
            403
        ) {
          return;
        }

        const body =
          await response
            .json()
            .catch(
              () => null
            );

        if (
          !response.ok ||
          !Array.isArray(
            body?.cases
          )
        ) {
          return;
        }

        const openCases =
          body.cases.filter(
            (
              item: CaseSummary
            ) =>
              item &&
              typeof item.id ===
                "string" &&
              typeof item.name ===
                "string" &&
              item.status ===
                "open"
          );

        setCases(
          openCases
        );

        setAvailable(true);

        if (
          openCases.length >
          0
        ) {
          setSelectedCaseId(
            openCases[0].id
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCases();

    return () => {
      cancelled =
        true;
    };
  }, []);

  async function addToCase() {
    if (
      !selectedCaseId ||
      adding
    ) {
      return;
    }

    setAdding(true);
    setMessage("");

    try {
      const savedAnalysisId =
        await ensureSavedAnalysis();

      if (!savedAnalysisId) {
        setMessage(
          "Save the analysis before adding it to a case."
        );
        return;
      }

      const response =
        await fetch(
          `/api/account/cases/${selectedCaseId}/analyses`,
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
                savedAnalysisId,
              }),
          }
        );

      const body =
        await response
          .json()
          .catch(
            () => null
          );

      if (!response.ok) {
        setMessage(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to add analysis to case."
        );
        return;
      }

      setMessage(
        "Added to your investigation case."
      );
    } catch {
      setMessage(
        "Unable to add analysis to case."
      );
    } finally {
      setAdding(false);
    }
  }

  if (
    loading ||
    !available
  ) {
    return null;
  }

  return (
    <div className="mt-5 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
      <div className="text-[10px] font-medium tracking-[0.14em] text-purple-300">
        ADVANCED · CASES
      </div>

      {cases.length ===
      0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-5 text-zinc-500">
            Create an investigation case before attaching this analysis.
          </p>

          <Link
            href="/account"
            className="text-xs font-medium text-purple-300 transition hover:text-purple-200"
          >
            Create Case →
          </Link>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select
            value={
              selectedCaseId
            }
            onChange={
              event =>
                setSelectedCaseId(
                  event.target.value
                )
            }
            className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-300 outline-none focus:border-purple-500"
          >
            {cases.map(
              item => (
                <option
                  key={
                    item.id
                  }
                  value={
                    item.id
                  }
                >
                  {item.name}
                </option>
              )
            )}
          </select>

          <button
            type="button"
            onClick={
              addToCase
            }
            disabled={
              adding ||
              !selectedCaseId
            }
            className="h-11 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 text-sm font-medium text-purple-200 transition hover:bg-purple-500/20 disabled:opacity-50"
          >
            {adding
              ? "Adding..."
              : "Add to Case"}
          </button>
        </div>
      )}

      {message && (
        <div className="mt-3 text-xs text-zinc-500">
          {message}
        </div>
      )}
    </div>
  );
}
