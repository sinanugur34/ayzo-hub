"use client";

import Link from "next/link";

import EntityAnnotationPanel from "@/components/EntityAnnotationPanel";
import AyzoEntityLabelsPanel from "@/components/AyzoEntityLabelsPanel";
import HistoricalChangesPanel from "@/components/HistoricalChangesPanel";
import InvestigationTimelinePanel from "@/components/InvestigationTimelinePanel";
import AskAyzoPanel from "@/components/AskAyzoPanel";

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

type Watchlist = {
  id: string;
  name: string;
};

type AuthState =
  | "checking"
  | "authenticated"
  | "unauthenticated"
  | "error";

type DataExportFormat =
  | "json"
  | "csv";

type DataExportResponse = {
  version: 1;
  format:
    DataExportFormat;
  filename:
    string;
  contentType:
    string;
  content:
    string;
};

type AdvancedReport = {
  version: 1;
  reportType: "advanced-analysis";
  generatedAt: string;
  title: string;

  subject: {
    network: string;
    type: string;
    value: string;
    snapshotKind: string | null;
  };

  evidence: {
    capturedAt: string;
    coverage: string | null;
    metricCount: number;
    moduleCount: number;
    findingCount: number;
  };

  executiveSummary:
    readonly string[];

  metrics:
    readonly {
      key: string;
      label: string;
      value:
        | string
        | number;
    }[];

  modules:
    readonly {
      id: string;
      status: string;
    }[];

  findings:
    readonly {
      id:
        string | null;
      category:
        string | null;
      severity:
        string | null;
      confidence:
        string | null;
      title:
        string | null;
    }[];

  methodology:
    readonly string[];

  limitations:
    readonly string[];
};

type Props = {
  network: string;
  subjectType:
    SubjectType;
  subjectValue: string;
  title: string;
  analysisPayload?: unknown;
  entityEvidencePayload?: unknown;
  askEvidencePayload?: unknown;
};

export default function AnalysisActions({
  network,
  subjectType,
  subjectValue,
  title,
  analysisPayload,
  entityEvidencePayload,
  askEvidencePayload,
}: Props) {
  const [
    authState,
    setAuthState,
  ] =
    useState<AuthState>(
      "checking"
    );

  const [
    watchlists,
    setWatchlists,
  ] =
    useState<Watchlist[]>(
      []
    );

  const [
    selectedWatchlistId,
    setSelectedWatchlistId,
  ] =
    useState("");

  const [
    newWatchlistName,
    setNewWatchlistName,
  ] =
    useState("");

  const [
    panelOpen,
    setPanelOpen,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    saved,
    setSaved,
  ] =
    useState(false);

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

  const [
    messageType,
    setMessageType,
  ] =
    useState<
      "success" |
      "error" |
      ""
    >("");

  const [
    reportLoading,
    setReportLoading,
  ] =
    useState(false);

  const [
    report,
    setReport,
  ] =
    useState<
      AdvancedReport | null
    >(null);

  const [
    reportError,
    setReportError,
  ] =
    useState("");

  const [
    reportOpen,
    setReportOpen,
  ] =
    useState(false);

  const [
    exportLoading,
    setExportLoading,
  ] =
    useState<
      DataExportFormat | null
    >(null);

  const [
    exportError,
    setExportError,
  ] =
    useState("");

  useEffect(() => {
    let cancelled =
      false;

    async function loadWatchlists() {
      try {
        const response =
          await fetch(
            "/api/account/watchlists",
            {
              cache:
                "no-store",

              credentials:
                "same-origin",
            }
          );

        if (cancelled) {
          return;
        }

        if (
          response.status ===
          401
        ) {
          setAuthState(
            "unauthenticated"
          );

          return;
        }

        if (!response.ok) {
          setAuthState(
            "error"
          );

          return;
        }

        const body =
          await response.json();

        const lists =
          Array.isArray(
            body.watchlists
          )
            ? body.watchlists
                .filter(
                  (
                    item: unknown
                  ): item is Watchlist =>
                    typeof item ===
                      "object" &&
                    item !==
                      null &&
                    "id" in
                      item &&
                    "name" in
                      item &&
                    typeof (
                      item as Watchlist
                    ).id ===
                      "string" &&
                    typeof (
                      item as Watchlist
                    ).name ===
                      "string"
                )
                .map(
                  (item: Watchlist) => ({
                    id:
                      item.id,
                    name:
                      item.name,
                  })
                )
            : [];

        setWatchlists(
          lists
        );

        if (
          lists.length >
          0
        ) {
          setSelectedWatchlistId(
            lists[0].id
          );
        }

        setAuthState(
          "authenticated"
        );
      } catch {
        if (
          !cancelled
        ) {
          setAuthState(
            "error"
          );
        }
      }
    }

    loadWatchlists();

    return () => {
      cancelled =
        true;
    };
  }, []);

  function showMessage(
    text: string,
    type:
      "success" |
      "error"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  async function saveAnalysis() {
    if (
      saved ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setMessage("");
    setMessageType("");

    try {
      const response =
        await fetch(
          "/api/account/saved-analyses",
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
                subjectType,
                subjectValue,
                title,
                analysisPayload,
              }),
          }
        );

      if (
        response.status ===
        401
      ) {
        setAuthState(
          "unauthenticated"
        );

        showMessage(
          "Sign in to save this analysis.",
          "error"
        );

        return;
      }

      const body =
        await response
          .json()
          .catch(
            () => null
          );

      if (!response.ok) {
        showMessage(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to save this analysis.",
          "error"
        );

        return;
      }

      setSaved(true);

      showMessage(
        "Analysis saved to your AYZO account.",
        "success"
      );
    } catch {
      showMessage(
        "Unable to save this analysis.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  async function generateAdvancedReport() {
    if (
      reportLoading ||
      !analysisPayload
    ) {
      return;
    }

    setReportLoading(true);
    setReportError("");

    try {
      const response =
        await fetch(
          "/api/account/advanced-report",
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
                subjectType,
                subjectValue,
                title,
                currentSnapshot:
                  analysisPayload,
              }),
          }
        );

      const body =
        await response
          .json()
          .catch(
            () =>
              null
          );

      if (
        response.status ===
        401
      ) {
        setReportError(
          "Sign in to generate an Advanced Report."
        );

        return;
      }

      if (
        response.status ===
        403
      ) {
        setReportError(
          "Advanced Reports requires AYZO Pro or Advanced."
        );

        return;
      }

      if (
        !response.ok ||
        !body?.report
      ) {
        setReportError(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to generate report."
        );

        return;
      }

      setReport(
        body.report as AdvancedReport
      );

      setReportOpen(true);
    } catch {
      setReportError(
        "Unable to generate report."
      );
    } finally {
      setReportLoading(false);
    }
  }

  async function exportData(
    format:
      DataExportFormat
  ) {
    if (
      exportLoading ||
      !analysisPayload
    ) {
      return;
    }

    setExportLoading(
      format
    );

    setExportError("");

    try {
      const response =
        await fetch(
          "/api/account/data-export",
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
                subjectType,
                subjectValue,
                title,
                format,
                currentSnapshot:
                  analysisPayload,
              }),
          }
        );

      const body =
        await response
          .json()
          .catch(
            () =>
              null
          );

      if (
        response.status ===
        401
      ) {
        setExportError(
          "Sign in to export analysis data."
        );

        return;
      }

      if (
        response.status ===
        403
      ) {
        setExportError(
          "Data Export requires AYZO Pro or Advanced."
        );

        return;
      }

      if (
        !response.ok ||
        !body?.export
      ) {
        setExportError(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to export analysis data."
        );

        return;
      }

      const data =
        body.export as
          DataExportResponse;

      if (
        data.format !==
          format ||
        typeof data.filename !==
          "string" ||
        typeof data.contentType !==
          "string" ||
        typeof data.content !==
          "string"
      ) {
        setExportError(
          "Invalid export response."
        );

        return;
      }

      const blob =
        new Blob(
          [
            data.content,
          ],
          {
            type:
              data.contentType,
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href =
        url;

      link.download =
        data.filename;

      link.rel =
        "noopener";

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();

      URL.revokeObjectURL(
        url
      );
    } catch {
      setExportError(
        "Unable to export analysis data."
      );
    } finally {
      setExportLoading(
        null
      );
    }
  }

  async function addItem(
    watchlistId:
      string
  ) {
    const response =
      await fetch(
        `/api/account/watchlists/${watchlistId}/items`,
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
              subjectType,
              subjectValue,
              label:
                title,
          }),
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
      409
    ) {
      showMessage(
        "This analysis is already in that watchlist.",
        "success"
      );

      return true;
    }

    if (!response.ok) {
      showMessage(
        typeof body?.error ===
          "string"
          ? body.error
          : "Unable to add this analysis to the watchlist.",
        "error"
      );

      return false;
    }

    showMessage(
      "Added to your AYZO watchlist.",
      "success"
    );

    return true;
  }

  async function addToExistingWatchlist() {
    if (
      !selectedWatchlistId ||
      adding
    ) {
      return;
    }

    setAdding(true);
    setMessage("");
    setMessageType("");

    try {
      const success =
        await addItem(
          selectedWatchlistId
        );

      if (success) {
        setPanelOpen(
          false
        );
      }
    } catch {
      showMessage(
        "Unable to add this analysis to the watchlist.",
        "error"
      );
    } finally {
      setAdding(false);
    }
  }

  async function createAndAdd() {
    const name =
      newWatchlistName
        .trim();

    if (
      !name ||
      adding
    ) {
      return;
    }

    setAdding(true);
    setMessage("");
    setMessageType("");

    try {
      const response =
        await fetch(
          "/api/account/watchlists",
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
                name,
              }),
          }
        );

      if (
        response.status ===
        401
      ) {
        setAuthState(
          "unauthenticated"
        );

        showMessage(
          "Sign in to use watchlists.",
          "error"
        );

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
        !body?.watchlist?.id
      ) {
        showMessage(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to create the watchlist.",
          "error"
        );

        return;
      }

      const created:
        Watchlist = {
          id:
            body.watchlist.id,
          name:
            body.watchlist.name,
        };

      setWatchlists(
        current => [
          created,
          ...current,
        ]
      );

      setSelectedWatchlistId(
        created.id
      );

      setNewWatchlistName(
        ""
      );

      const success =
        await addItem(
          created.id
        );

      if (success) {
        setPanelOpen(
          false
        );
      }
    } catch {
      showMessage(
        "Unable to create the watchlist.",
        "error"
      );
    } finally {
      setAdding(false);
    }
  }

  if (
    authState ===
    "checking"
  ) {
    return (
      <section className="rounded-3xl border border-zinc-900 bg-black/20 p-5">
        <div className="text-xs text-zinc-600">
          Checking AYZO account storage...
        </div>
      </section>
    );
  }

  if (
    authState ===
    "unauthenticated"
  ) {
    return (
      <section className="rounded-3xl border border-violet-500/20 bg-violet-500/5 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-[10px] font-medium tracking-[0.16em] text-violet-400">
              SAVE YOUR RESEARCH
            </div>

            <h3 className="mt-2 text-base font-semibold text-zinc-100">
              Keep this investigation in AYZO
            </h3>

            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Sign in to save analyses and build monitoring watchlists.
            </p>
          </div>

          <Link
            href="/login"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Sign in to save
          </Link>
        </div>
      </section>
    );
  }

  if (
    authState ===
    "error"
  ) {
    return (
      <section className="rounded-3xl border border-zinc-900 bg-black/20 p-5">
        <div className="text-xs text-zinc-600">
          AYZO account storage is temporarily unavailable.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-zinc-950/70 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <div className="text-[10px] font-medium tracking-[0.16em] text-violet-400">
            AYZO RESEARCH
          </div>

          <h3 className="mt-2 text-base font-semibold text-zinc-100">
            Save or monitor this analysis
          </h3>

          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Keep important investigations attached to your authenticated AYZO account.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={
              saving ||
              saved
            }
            onClick={
              saveAnalysis
            }
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-default disabled:opacity-60"
          >
            {saved
              ? "Saved ✓"
              : saving
                ? "Saving..."
                : "Save Analysis"}
          </button>

          <button
            type="button"
            onClick={
              generateAdvancedReport
            }
            disabled={
              reportLoading ||
              !analysisPayload
            }
            className="inline-flex h-11 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20 disabled:cursor-default disabled:opacity-50"
          >
            {reportLoading
              ? "Generating..."
              : report
                ? "Refresh Report"
                : "Generate Report"}
          </button>

          <button
            type="button"
            onClick={() =>
              setPanelOpen(
                value =>
                  !value
              )
            }
            className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Add to Watchlist
          </button>
        </div>
      </div>

      <EntityAnnotationPanel
        network={network}
        subjectType={subjectType}
        subjectValue={subjectValue}
      />

      {(subjectType === "token" || subjectType === "entity") && (
        <AyzoEntityLabelsPanel
          network={network}
          subjectType={subjectType}
          subjectValue={subjectValue}
          evidencePayload={
            entityEvidencePayload ??
            analysisPayload ??
            null
          }
        />
      )}

      <AskAyzoPanel
        network={network}
        subjectType={subjectType}
        subjectValue={subjectValue}
        evidencePayload={
          askEvidencePayload ??
          entityEvidencePayload ??
          analysisPayload ??
          null
        }
      />

      <HistoricalChangesPanel
        network={network}
        subjectType={subjectType}
        subjectValue={subjectValue}
        currentSnapshot={analysisPayload}
      />

      <InvestigationTimelinePanel
        network={network}
        subjectType={subjectType}
        subjectValue={subjectValue}
        currentSnapshot={analysisPayload}
      />

      {(reportError || report) && (
        <section className="mt-5 rounded-2xl border border-violet-500/20 bg-black/30 p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="text-[10px] font-medium tracking-[0.14em] text-violet-400">
                ADVANCED REPORT
              </div>

              <h4 className="mt-2 text-sm font-semibold text-zinc-100">
                Evidence-first investigation report
              </h4>
            </div>

            {report && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    exportData(
                      "json"
                    )
                  }
                  disabled={
                    exportLoading !==
                    null
                  }
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900 disabled:cursor-default disabled:opacity-50"
                >
                  {exportLoading ===
                  "json"
                    ? "Exporting..."
                    : "Export JSON"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    exportData(
                      "csv"
                    )
                  }
                  disabled={
                    exportLoading !==
                    null
                  }
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900 disabled:cursor-default disabled:opacity-50"
                >
                  {exportLoading ===
                  "csv"
                    ? "Exporting..."
                    : "Export CSV"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setReportOpen(
                      value =>
                        !value
                    )
                  }
                  className="text-xs font-medium text-violet-300 transition hover:text-violet-200"
                >
                  {reportOpen
                    ? "Hide report"
                    : "View report"}
                </button>
              </div>
            )}
          </div>

          {reportError && (
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">
              {reportError}
            </div>
          )}

          {exportError && (
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">
              {exportError}
            </div>
          )}

          {report &&
            reportOpen && (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                    Metrics
                  </div>
                  <div className="mt-1 text-lg font-semibold text-zinc-100">
                    {report.evidence.metricCount}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                    Modules
                  </div>
                  <div className="mt-1 text-lg font-semibold text-zinc-100">
                    {report.evidence.moduleCount}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                    Findings
                  </div>
                  <div className="mt-1 text-lg font-semibold text-zinc-100">
                    {report.evidence.findingCount}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-zinc-300">
                  Executive summary
                </div>

                <div className="mt-2 space-y-2">
                  {report.executiveSummary.map(
                    (line, index) => (
                      <p
                        key={`${line}-${index}`}
                        className="text-xs leading-5 text-zinc-500"
                      >
                        {line}
                      </p>
                    )
                  )}
                </div>
              </div>

              {report.metrics.length >
                0 && (
                <details className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                  <summary className="cursor-pointer text-xs font-medium text-zinc-300">
                    Key metrics
                  </summary>

                  <div className="mt-3 space-y-2">
                    {report.metrics.map(
                      metric => (
                        <div
                          key={
                            metric.key
                          }
                          className="flex items-start justify-between gap-4 text-xs"
                        >
                          <span className="text-zinc-500">
                            {metric.label}
                          </span>

                          <span className="max-w-[55%] break-all text-right text-zinc-300">
                            {String(
                              metric.value
                            )}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </details>
              )}

              {report.findings.length >
                0 && (
                <details className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                  <summary className="cursor-pointer text-xs font-medium text-zinc-300">
                    Findings
                  </summary>

                  <div className="mt-3 space-y-3">
                    {report.findings.map(
                      (
                        finding,
                        index
                      ) => (
                        <div
                          key={
                            finding.id ??
                            `${finding.title}-${index}`
                          }
                          className="rounded-lg border border-zinc-900 bg-black/30 p-3"
                        >
                          <div className="text-xs font-medium text-zinc-200">
                            {finding.title ??
                              "Evidence finding"}
                          </div>

                          <div className="mt-1 text-[11px] text-zinc-600">
                            {[
                              finding.category,
                              finding.severity,
                              finding.confidence,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </details>
              )}

              <details className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                <summary className="cursor-pointer text-xs font-medium text-zinc-300">
                  Methodology & limitations
                </summary>

                <div className="mt-3 space-y-3">
                  {report.methodology.map(
                    (line, index) => (
                      <p
                        key={`method-${index}`}
                        className="text-xs leading-5 text-zinc-500"
                      >
                        {line}
                      </p>
                    )
                  )}

                  {report.limitations.map(
                    (line, index) => (
                      <p
                        key={`limit-${index}`}
                        className="text-xs leading-5 text-zinc-600"
                      >
                        {line}
                      </p>
                    )
                  )}
                </div>
              </details>
            </div>
          )}
        </section>
      )}

      {panelOpen && (
        <div className="mt-5 rounded-2xl border border-zinc-800 bg-black/30 p-4">
          {watchlists.length >
            0 && (
            <div>
              <label
                htmlFor={`watchlist-${network}-${subjectValue}`}
                className="text-[10px] uppercase tracking-[0.12em] text-zinc-600"
              >
                Existing watchlist
              </label>

              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <select
                  id={`watchlist-${network}-${subjectValue}`}
                  value={
                    selectedWatchlistId
                  }
                  onChange={
                    event =>
                      setSelectedWatchlistId(
                        event.target.value
                      )
                  }
                  className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-300 outline-none focus:border-violet-500"
                >
                  {watchlists.map(
                    watchlist => (
                      <option
                        key={
                          watchlist.id
                        }
                        value={
                          watchlist.id
                        }
                      >
                        {watchlist.name}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  disabled={
                    adding ||
                    !selectedWatchlistId
                  }
                  onClick={
                    addToExistingWatchlist
                  }
                  className="h-11 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 text-sm font-medium text-violet-200 transition hover:bg-violet-500/20 disabled:opacity-50"
                >
                  {adding
                    ? "Adding..."
                    : "Add"}
                </button>
              </div>
            </div>
          )}

          <div
            className={
              watchlists.length >
              0
                ? "mt-5 border-t border-zinc-900 pt-5"
                : ""
            }
          >
            <label
              htmlFor={`new-watchlist-${network}-${subjectValue}`}
              className="text-[10px] uppercase tracking-[0.12em] text-zinc-600"
            >
              New watchlist
            </label>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id={`new-watchlist-${network}-${subjectValue}`}
                type="text"
                value={
                  newWatchlistName
                }
                onChange={
                  event =>
                    setNewWatchlistName(
                      event.target.value
                    )
                }
                maxLength={
                  120
                }
                placeholder="e.g. Whale Monitoring"
                className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-300 outline-none placeholder:text-zinc-700 focus:border-violet-500"
              />

              <button
                type="button"
                disabled={
                  adding ||
                  !newWatchlistName.trim()
                }
                onClick={
                  createAndAdd
                }
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {adding
                  ? "Creating..."
                  : "Create & Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`mt-4 text-xs ${
            messageType ===
            "success"
              ? "text-emerald-400"
              : "text-rose-300"
          }`}
        >
          {message}
        </div>
      )}
    </section>
  );
}
