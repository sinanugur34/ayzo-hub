"use client";

import {
  useEffect,
  useState,
} from "react";

type CaseRow = {
  id: string;
  name: string;
  description: string | null;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
};

type SavedAnalysis = {
  id: string;
  network: string;
  subject_type: string;
  subject_value: string;
  title: string | null;
  notes: string | null;
  source_analysis_id: string | null;
  created_at: string;
  updated_at: string;
  linked_at?: string;
};

export default function CaseWorkspace({
  caseId,
}: {
  caseId: string;
}) {
  const [
    caseRow,
    setCaseRow,
  ] =
    useState<CaseRow | null>(
      null
    );

  const [
    analyses,
    setAnalyses,
  ] =
    useState<SavedAnalysis[]>(
      []
    );

  const [
    savedAnalyses,
    setSavedAnalyses,
  ] =
    useState<SavedAnalysis[]>(
      []
    );

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
    name,
    setName,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    selectedAnalysisId,
    setSelectedAnalysisId,
  ] =
    useState("");

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  async function load() {
    setError("");

    try {
      const [
        caseResponse,
        savedResponse,
      ] =
        await Promise.all([
          fetch(
            `/api/account/cases/${caseId}`,
            {
              cache:
                "no-store",
              credentials:
                "same-origin",
            }
          ),
          fetch(
            "/api/account/saved-analyses",
            {
              cache:
                "no-store",
              credentials:
                "same-origin",
            }
          ),
        ]);

      const [
        caseBody,
        savedBody,
      ] =
        await Promise.all([
          caseResponse
            .json()
            .catch(
              () => null
            ),
          savedResponse
            .json()
            .catch(
              () => null
            ),
        ]);

      if (!caseResponse.ok) {
        setError(
          typeof caseBody?.error ===
            "string"
            ? caseBody.error
            : "Unable to load case."
        );
        return;
      }

      if (!savedResponse.ok) {
        setError(
          typeof savedBody?.error ===
            "string"
            ? savedBody.error
            : "Unable to load saved analyses."
        );
        return;
      }

      const nextCase =
        caseBody.case as CaseRow;

      const linked =
        Array.isArray(
          caseBody.analyses
        )
          ? caseBody.analyses
          : [];

      const saved =
        Array.isArray(
          savedBody.analyses
        )
          ? savedBody.analyses
          : [];

      setCaseRow(
        nextCase
      );

      setName(
        nextCase.name
      );

      setDescription(
        nextCase.description ??
        ""
      );

      setAnalyses(
        linked
      );

      setSavedAnalyses(
        saved
      );
    } catch {
      setError(
        "Unable to load case."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [caseId]);

  const linkedIds =
    new Set(
      analyses.map(
        analysis =>
          analysis.id
      )
    );

  const available =
    savedAnalyses.filter(
      analysis =>
        !linkedIds.has(
          analysis.id
        )
    );

  const effectiveSelection =
    available.some(
      analysis =>
        analysis.id ===
        selectedAnalysisId
    )
      ? selectedAnalysisId
      : available[0]?.id ??
        "";

  async function saveMetadata() {
    if (
      !name.trim() ||
      busy
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/account/cases/${caseId}`,
          {
            method:
              "PATCH",
            credentials:
              "same-origin",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                name:
                  name.trim(),
                description:
                  description.trim() ||
                  null,
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
        setError(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to update case."
        );
        return;
      }

      setCaseRow(
        body.case
      );

      setName(
        body.case.name
      );

      setDescription(
        body.case.description ??
        ""
      );
    } catch {
      setError(
        "Unable to update case."
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus() {
    if (
      !caseRow ||
      busy
    ) {
      return;
    }

    setBusy(true);
    setError("");

    const nextStatus =
      caseRow.status ===
        "open"
        ? "closed"
        : "open";

    try {
      const response =
        await fetch(
          `/api/account/cases/${caseId}`,
          {
            method:
              "PATCH",
            credentials:
              "same-origin",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                status:
                  nextStatus,
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
        setError(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to update case status."
        );
        return;
      }

      setCaseRow(
        body.case
      );
    } catch {
      setError(
        "Unable to update case status."
      );
    } finally {
      setBusy(false);
    }
  }

  async function addAnalysis() {
    if (
      !effectiveSelection ||
      busy
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/account/cases/${caseId}/analyses`,
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
                savedAnalysisId:
                  effectiveSelection,
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
        setError(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to add analysis to case."
        );
        return;
      }

      setSelectedAnalysisId(
        ""
      );

      await load();
    } catch {
      setError(
        "Unable to add analysis to case."
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeAnalysis(
    analysisId: string
  ) {
    if (busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/account/cases/${caseId}/analyses?savedAnalysisId=${encodeURIComponent(
            analysisId
          )}`,
          {
            method:
              "DELETE",
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

      if (!response.ok) {
        setError(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to remove analysis from case."
        );
        return;
      }

      await load();
    } catch {
      setError(
        "Unable to remove analysis from case."
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteCase() {
    if (
      busy ||
      !window.confirm(
        "Delete this case? Saved analyses themselves will not be deleted."
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/account/cases/${caseId}`,
          {
            method:
              "DELETE",
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

      if (!response.ok) {
        setError(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to delete case."
        );
        return;
      }

      window.location.href =
        "/account";
    } catch {
      setError(
        "Unable to delete case."
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-8 text-sm text-zinc-600">
        Loading case...
      </div>
    );
  }

  if (
    error &&
    !caseRow
  ) {
    return (
      <div className="mt-8 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 text-sm text-rose-300">
        {error}
      </div>
    );
  }

  if (!caseRow) {
    return null;
  }

  return (
    <div className="mt-8 space-y-5">
      <section className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium tracking-[0.16em] text-purple-300">
              ADVANCED · CASE
            </div>

            <h1 className="mt-2 text-2xl font-semibold">
              {caseRow.name}
            </h1>
          </div>

          <span className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-wide text-zinc-500">
            {caseRow.status}
          </span>
        </div>

        <div className="mt-6 grid gap-3">
          <input
            value={name}
            onChange={
              event =>
                setName(
                  event.target.value
                )
            }
            maxLength={160}
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none focus:border-purple-500"
          />

          <textarea
            value={description}
            onChange={
              event =>
                setDescription(
                  event.target.value
                )
            }
            maxLength={5000}
            rows={4}
            placeholder="Case description"
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-300 outline-none placeholder:text-zinc-700 focus:border-purple-500"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={
                saveMetadata
              }
              disabled={
                busy ||
                !name.trim()
              }
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
            >
              Save Changes
            </button>

            <button
              type="button"
              onClick={
                changeStatus
              }
              disabled={busy}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 disabled:opacity-50"
            >
              {caseRow.status ===
              "open"
                ? "Close Case"
                : "Reopen Case"}
            </button>

            <button
              type="button"
              onClick={
                deleteCase
              }
              disabled={busy}
              className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-2.5 text-sm text-rose-300 disabled:opacity-50"
            >
              Delete Case
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
        <div className="text-xs font-medium tracking-[0.16em] text-violet-300">
          CASE EVIDENCE
        </div>

        <h2 className="mt-2 text-xl font-semibold">
          Saved Analyses
        </h2>

        {available.length >
        0 && (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <select
              value={
                effectiveSelection
              }
              onChange={
                event =>
                  setSelectedAnalysisId(
                    event.target.value
                  )
              }
              className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-300 outline-none focus:border-violet-500"
            >
              {available.map(
                analysis => (
                  <option
                    key={
                      analysis.id
                    }
                    value={
                      analysis.id
                    }
                  >
                    {analysis.title ||
                      analysis.subject_value}
                    {" · "}
                    {analysis.network}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={
                addAnalysis
              }
              disabled={
                busy ||
                !effectiveSelection
              }
              className="h-11 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 text-sm font-medium text-violet-200 disabled:opacity-50"
            >
              Add to Case
            </button>
          </div>
        )}

        {analyses.length ===
        0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-zinc-800 p-5 text-sm text-zinc-500">
            This case has no saved analyses yet.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {analyses.map(
              analysis => (
                <div
                  key={
                    analysis.id
                  }
                  className="rounded-2xl border border-zinc-900 bg-black/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-all text-sm font-medium text-zinc-200">
                        {analysis.title ||
                          analysis.subject_value}
                      </div>

                      <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                        {analysis.network}
                        {" · "}
                        {analysis.subject_type}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeAnalysis(
                          analysis.id
                        )
                      }
                      disabled={busy}
                      className="text-xs text-zinc-600 transition hover:text-rose-300 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>

                  {analysis.notes && (
                    <p className="mt-3 text-xs leading-5 text-zinc-600">
                      {analysis.notes}
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {available.length ===
          0 &&
          savedAnalyses.length >
            0 && (
          <p className="mt-4 text-xs text-zinc-600">
            All available saved analyses are already attached to this case.
          </p>
        )}

        {savedAnalyses.length ===
          0 && (
          <p className="mt-4 text-xs text-zinc-600">
            Save an AYZO analysis first, then attach it to this case.
          </p>
        )}

        {error && (
          <div className="mt-4 text-xs text-rose-300">
            {error}
          </div>
        )}
      </section>
    </div>
  );
}
