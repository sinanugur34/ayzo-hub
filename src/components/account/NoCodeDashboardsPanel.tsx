"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type SavedAnalysis = {
  id: string;
  network: string;
  subject_type: string;
  subject_value: string;
  title: string | null;
  created_at: string;
};

type DashboardWidget = {
  id: string;
  dashboardId: string;
  savedAnalysisId: string;
  widgetKind:
    | "overview"
    | "evidence"
    | "findings";
  position: number;

  subject: {
    network: string;
    type: string;
    value: string;
    title: string | null;
    createdAt: string;
  };

  snapshot: {
    coverage: string | null;
    topLevelKeyCount: number;
    moduleCount: number;
    findingsCount: number;
  };
};

type Dashboard = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  widgets: DashboardWidget[];
};

type DashboardResponse = {
  dashboards: Dashboard[];
  availableAnalyses: SavedAnalysis[];

  limits: {
    dashboards: number;
    widgetsPerDashboard: number;
  };
};

function errorMessage(
  body: unknown,
  fallback: string
) {
  if (
    body &&
    typeof body === "object" &&
    "error" in body
  ) {
    const error =
      (
        body as {
          error?: unknown;
        }
      ).error;

    if (
      typeof error ===
        "string"
    ) {
      return error;
    }
  }

  return fallback;
}

export default function NoCodeDashboardsPanel() {
  const [
    dashboards,
    setDashboards,
  ] =
    useState<Dashboard[]>(
      []
    );

  const [
    analyses,
    setAnalyses,
  ] =
    useState<SavedAnalysis[]>(
      []
    );

  const [
    dashboardLimit,
    setDashboardLimit,
  ] =
    useState(10);

  const [
    widgetLimit,
    setWidgetLimit,
  ] =
    useState(12);

  const [
    selectedId,
    setSelectedId,
  ] =
    useState("");

  const [
    dashboardName,
    setDashboardName,
  ] =
    useState(
      "Investigation Dashboard"
    );

  const [
    analysisId,
    setAnalysisId,
  ] =
    useState("");

  const [
    widgetKind,
    setWidgetKind,
  ] =
    useState<
      "overview" |
      "evidence" |
      "findings"
    >(
      "overview"
    );

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
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const refresh =
    useCallback(
      async () => {
        const response =
          await fetch(
            "/api/account/no-code-dashboards",
            {
              cache:
                "no-store",

              credentials:
                "same-origin",
            }
          );

        const body =
          (
            await response
              .json()
              .catch(
                () => null
              )
          ) as DashboardResponse | null;

        if (
          response.status ===
            403
        ) {
          setLockedOut(
            true
          );

          return;
        }

        if (
          !response.ok ||
          !body
        ) {
          throw new Error(
            errorMessage(
              body,
              "Unable to load dashboards."
            )
          );
        }

        const nextDashboards =
          Array.isArray(
            body.dashboards
          )
            ? body.dashboards
            : [];

        const nextAnalyses =
          Array.isArray(
            body.availableAnalyses
          )
            ? body.availableAnalyses
            : [];

        setLockedOut(
          false
        );

        setDashboards(
          nextDashboards
        );

        setAnalyses(
          nextAnalyses
        );

        setDashboardLimit(
          body.limits?.dashboards ??
            10
        );

        setWidgetLimit(
          body.limits
            ?.widgetsPerDashboard ??
            12
        );

        setSelectedId(
          current =>
            nextDashboards.some(
              dashboard =>
                dashboard.id ===
                  current
            )
              ? current
              : nextDashboards[
                  0
                ]?.id ??
                ""
        );

        setAnalysisId(
          current =>
            nextAnalyses.some(
              analysis =>
                analysis.id ===
                  current
            )
              ? current
              : nextAnalyses[
                  0
                ]?.id ??
                ""
        );
      },
      []
    );

  useEffect(
    () => {
      let mounted =
        true;

      async function start() {
        try {
          await refresh();
        } catch (
          caught
        ) {
          if (mounted) {
            setError(
              caught instanceof
                Error
                ? caught.message
                : "Unable to load dashboards."
            );
          }
        } finally {
          if (mounted) {
            setLoading(
              false
            );
          }
        }
      }

      void start();

      return () => {
        mounted =
          false;
      };
    },
    [
      refresh,
    ]
  );

  const selected =
    useMemo(
      () =>
        dashboards.find(
          dashboard =>
            dashboard.id ===
              selectedId
        ) ??
        null,
      [
        dashboards,
        selectedId,
      ]
    );

  async function post(
    payload: Record<
      string,
      unknown
    >
  ) {
    const response =
      await fetch(
        "/api/account/no-code-dashboards",
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
            JSON.stringify(
              payload
            ),
        }
      );

    const body =
      await response
        .json()
        .catch(
          () => null
        );

    if (!response.ok) {
      throw new Error(
        errorMessage(
          body,
          "Dashboard request failed."
        )
      );
    }
  }

  async function createDashboard() {
    if (
      busy ||
      !dashboardName.trim()
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await post({
        action:
          "create_dashboard",

        name:
          dashboardName,
      });

      await refresh();
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to create dashboard."
      );
    } finally {
      setBusy(false);
    }
  }

  async function addWidget() {
    if (
      busy ||
      !selected ||
      !analysisId
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await post({
        action:
          "add_widget",

        dashboardId:
          selected.id,

        savedAnalysisId:
          analysisId,

        widgetKind,
      });

      await refresh();
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to add widget."
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(
    type:
      "dashboard" |
      "widget",

    id: string
  ) {
    const confirmed =
      window.confirm(
        type ===
          "dashboard"
          ? "Delete this dashboard and all of its widgets?"
          : "Remove this widget from the dashboard?"
      );

    if (
      busy ||
      !confirmed
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/account/no-code-dashboards?type=${type}&id=${encodeURIComponent(id)}`,
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
        throw new Error(
          errorMessage(
            body,
            "Unable to delete dashboard item."
          )
        );
      }

      await refresh();
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to delete dashboard item."
      );
    } finally {
      setBusy(false);
    }
  }

  if (
    loading ||
    lockedOut
  ) {
    return null;
  }

  return (
    <section className="mt-5 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-6">
      <div className="text-xs font-medium tracking-[0.16em] text-indigo-300">
        ADVANCED · NO-CODE DASHBOARDS
      </div>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            No-Code Dashboards
          </h2>

          <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">
            Build private investigation dashboards from your saved AYZO analyses without writing code.
          </p>
        </div>

        <div className="text-xs text-zinc-600">
          {dashboards.length}/{dashboardLimit} dashboards
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={
            dashboardName
          }
          maxLength={
            120
          }
          onChange={
            event =>
              setDashboardName(
                event.target.value
              )
          }
          className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-200 outline-none"
        />

        <button
          type="button"
          disabled={
            busy ||
            !dashboardName.trim() ||
            dashboards.length >=
              dashboardLimit
          }
          onClick={
            createDashboard
          }
          className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-200 disabled:opacity-50"
        >
          Create dashboard
        </button>
      </div>

      {dashboards.length ===
        0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-zinc-800 p-5">
          <div className="text-sm text-zinc-300">
            No dashboards yet.
          </div>

          <p className="mt-2 text-xs leading-5 text-zinc-600">
            Create a dashboard, then add saved analyses as evidence widgets.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <select
              value={
                selectedId
              }
              onChange={
                event =>
                  setSelectedId(
                    event.target.value
                  )
              }
              className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200"
            >
              {dashboards.map(
                dashboard => (
                  <option
                    key={
                      dashboard.id
                    }
                    value={
                      dashboard.id
                    }
                  >
                    {dashboard.name}
                  </option>
                )
              )}
            </select>

            {selected && (
              <button
                type="button"
                disabled={
                  busy
                }
                onClick={
                  () =>
                    remove(
                      "dashboard",
                      selected.id
                    )
                }
                className="rounded-xl border border-rose-500/20 px-4 py-3 text-xs text-rose-300 disabled:opacity-50"
              >
                Delete dashboard
              </button>
            )}
          </div>

          {selected && (
            <>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-zinc-500">
                  {selected.widgets.length}/{widgetLimit} widgets
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px_auto]">
                <select
                  value={
                    analysisId
                  }
                  onChange={
                    event =>
                      setAnalysisId(
                        event.target.value
                      )
                  }
                  className="min-w-0 rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200"
                >
                  {analyses.length ===
                    0 ? (
                    <option value="">
                      No saved analyses
                    </option>
                  ) : (
                    analyses.map(
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
                    )
                  )}
                </select>

                <select
                  value={
                    widgetKind
                  }
                  onChange={
                    event =>
                      setWidgetKind(
                        event.target.value as
                          "overview" |
                          "evidence" |
                          "findings"
                      )
                  }
                  className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200"
                >
                  <option value="overview">
                    Overview
                  </option>

                  <option value="evidence">
                    Evidence
                  </option>

                  <option value="findings">
                    Findings
                  </option>
                </select>

                <button
                  type="button"
                  disabled={
                    busy ||
                    !analysisId ||
                    selected.widgets.length >=
                      widgetLimit
                  }
                  onClick={
                    addWidget
                  }
                  className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-200 disabled:opacity-50"
                >
                  Add widget
                </button>
              </div>

              {selected.widgets.length ===
                0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-zinc-800 p-5 text-sm text-zinc-500">
                  Add a saved analysis to start this dashboard.
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {selected.widgets.map(
                    widget => (
                      <article
                        key={
                          widget.id
                        }
                        className="rounded-2xl border border-zinc-800 bg-black/30 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-indigo-300">
                              {widget.widgetKind}
                            </div>

                            <div className="mt-2 truncate text-sm font-medium text-zinc-200">
                              {widget.subject.title ||
                                widget.subject.value}
                            </div>

                            <div className="mt-1 text-[10px] uppercase tracking-[0.1em] text-zinc-600">
                              {widget.subject.network}
                              {" · "}
                              {widget.subject.type}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={
                              busy
                            }
                            onClick={
                              () =>
                                remove(
                                  "widget",
                                  widget.id
                                )
                            }
                            className="text-xs text-zinc-600 transition hover:text-rose-300 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>

                        {widget.widgetKind ===
                          "overview" && (
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-zinc-900 p-3">
                              <div className="text-[10px] text-zinc-600">
                                Network
                              </div>

                              <div className="mt-1 text-xs text-zinc-300">
                                {widget.subject.network}
                              </div>
                            </div>

                            <div className="rounded-xl border border-zinc-900 p-3">
                              <div className="text-[10px] text-zinc-600">
                                Recorded sections
                              </div>

                              <div className="mt-1 text-lg font-semibold">
                                {widget.snapshot.topLevelKeyCount}
                              </div>
                            </div>
                          </div>
                        )}

                        {widget.widgetKind ===
                          "evidence" && (
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-zinc-900 p-3">
                              <div className="text-[10px] text-zinc-600">
                                Coverage
                              </div>

                              <div className="mt-1 text-xs text-zinc-300">
                                {widget.snapshot.coverage ||
                                  "Not recorded"}
                              </div>
                            </div>

                            <div className="rounded-xl border border-zinc-900 p-3">
                              <div className="text-[10px] text-zinc-600">
                                Modules
                              </div>

                              <div className="mt-1 text-lg font-semibold">
                                {widget.snapshot.moduleCount}
                              </div>
                            </div>
                          </div>
                        )}

                        {widget.widgetKind ===
                          "findings" && (
                          <div className="mt-4 rounded-xl border border-zinc-900 p-3">
                            <div className="text-[10px] text-zinc-600">
                              Recorded findings
                            </div>

                            <div className="mt-1 text-lg font-semibold">
                              {widget.snapshot.findingsCount}
                            </div>

                            <p className="mt-2 text-[11px] leading-5 text-zinc-600">
                              Evidence count only. The dashboard does not generate additional conclusions.
                            </p>
                          </div>
                        )}
                      </article>
                    )
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
