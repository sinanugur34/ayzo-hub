"use client";

import {
  useEffect,
  useState,
} from "react";

type AlertRule = {
  id: string;

  watchlist_id:
    string | null;

  network:
    string | null;

  subject_type:
    string | null;

  subject_value:
    string | null;

  rule_type:
    string;

  delivery_channel:
    string;

  enabled:
    boolean;

  created_at:
    string;

  updated_at:
    string;
};

type Watchlist = {
  id: string;
  name: string;
};

const ruleLabels:
  Record<
    string,
    string
  > = {
  new_activity:
    "New Activity",

  funding_movement:
    "Funding Movement",

  relationship_change:
    "Relationship Change",

  contract_activity:
    "Contract Activity",
};

const ruleOptions = [
  "new_activity",
  "funding_movement",
  "relationship_change",
  "contract_activity",
] as const;

export default function AlertRulesPanel() {
  const [
    rules,
    setRules,
  ] =
    useState<
      AlertRule[]
    >([]);

  const [
    watchlists,
    setWatchlists,
  ] =
    useState<
      Watchlist[]
    >([]);

  const [
    canManage,
    setCanManage,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    notice,
    setNotice,
  ] =
    useState<
      string | null
    >(null);

  const [
    watchlistId,
    setWatchlistId,
  ] =
    useState("");

  const [
    ruleType,
    setRuleType,
  ] =
    useState<
      (
        typeof ruleOptions
      )[number]
    >(
      "new_activity"
    );

  useEffect(
    () => {
      let cancelled =
        false;

      async function load() {
        try {
          const [
            alertResponse,
            watchlistResponse,
          ] =
            await Promise.all([
              fetch(
                "/api/account/alert-rules",
                {
                  cache:
                    "no-store",
                }
              ),

              fetch(
                "/api/account/watchlists",
                {
                  cache:
                    "no-store",
                }
              ),
            ]);

          const alertBody =
            await alertResponse
              .json();

          const watchlistBody =
            await watchlistResponse
              .json();

          if (
            !alertResponse.ok
          ) {
            throw new Error(
              alertBody
                ?.error ??
                "Unable to load alert rules."
            );
          }

          if (cancelled) {
            return;
          }

          setRules(
            Array.isArray(
              alertBody
                ?.rules
            )
              ? alertBody.rules
              : []
          );

          setCanManage(
            alertBody
              ?.canManage ===
              true
          );

          setWatchlists(
            Array.isArray(
              watchlistBody
                ?.watchlists
            )
              ? watchlistBody.watchlists
              : []
          );
        } catch (
          caught
        ) {
          if (!cancelled) {
            setError(
              caught instanceof
                Error
                ? caught.message
                : "Unable to load alert rules."
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

  async function createRule() {
    if (
      !watchlistId ||
      busy
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response =
        await fetch(
          "/api/account/alert-rules",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                watchlistId,
                ruleType,
              }),
          }
        );

      const body =
        await response
          .json();

      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Unable to create alert rule."
        );
      }

      setRules(
        current => [
          body.rule,
          ...current,
        ]
      );

      setNotice(
        "Alert rule definition saved. Automated delivery is not active yet."
      );
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to create alert rule."
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleRule(
    rule:
      AlertRule
  ) {
    if (
      busy ||
      !canManage
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response =
        await fetch(
          `/api/account/alert-rules/${rule.id}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                enabled:
                  !rule.enabled,
              }),
          }
        );

      const body =
        await response
          .json();

      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Unable to update alert rule."
        );
      }

      setRules(
        current =>
          current.map(
            item =>
              item.id ===
                rule.id
                ? body.rule
                : item
          )
      );
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to update alert rule."
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteRule(
    ruleId:
      string
  ) {
    if (
      busy ||
      !canManage
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response =
        await fetch(
          `/api/account/alert-rules/${ruleId}`,
          {
            method:
              "DELETE",
          }
        );

      const body =
        await response
          .json();

      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Unable to delete alert rule."
        );
      }

      setRules(
        current =>
          current.filter(
            item =>
              item.id !==
              ruleId
          )
      );
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to delete alert rule."
      );
    } finally {
      setBusy(false);
    }
  }

  function watchlistName(
    id:
      string | null
  ) {
    if (!id) {
      return "Direct subject";
    }

    return (
      watchlists.find(
        item =>
          item.id === id
      )?.name ??
      "Watchlist"
    );
  }

  return (
    <section className="mt-5 rounded-3xl border border-violet-500/20 bg-zinc-950/60 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium tracking-[0.16em] text-violet-300">
            MONITORING
          </div>

          <h2 className="mt-2 text-xl font-semibold">
            Alert Rules
          </h2>

          <p className="mt-2 max-w-xl text-xs leading-5 text-zinc-600">
            Save evidence-monitoring rule definitions for AYZO watchlists.
          </p>
        </div>

        <span className="rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-[9px] font-medium tracking-[0.12em] text-amber-300">
          FOUNDATION
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
        <div className="text-xs font-medium text-amber-300">
          Detection & delivery not active yet
        </div>

        <p className="mt-2 text-[10px] leading-5 text-zinc-600">
          This foundation stores and manages monitoring rules. AYZO is not yet polling chains or sending email, browser or Telegram notifications from these rules.
        </p>
      </div>

      {loading ? (
        <p className="mt-5 text-xs text-zinc-600">
          Loading alert rules…
        </p>
      ) : (
        <>
          {canManage ? (
            <div className="mt-5 grid gap-3 rounded-2xl border border-zinc-900 bg-black/20 p-4 md:grid-cols-[1fr_1fr_auto]">
              <select
                value={
                  watchlistId
                }
                onChange={
                  event =>
                    setWatchlistId(
                      event
                        .target
                        .value
                    )
                }
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-300 outline-none"
              >
                <option value="">
                  Select watchlist
                </option>

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
                      {
                        watchlist.name
                      }
                    </option>
                  )
                )}
              </select>

              <select
                value={
                  ruleType
                }
                onChange={
                  event =>
                    setRuleType(
                      event
                        .target
                        .value as
                        (
                          typeof ruleOptions
                        )[number]
                    )
                }
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-300 outline-none"
              >
                {ruleOptions.map(
                  option => (
                    <option
                      key={
                        option
                      }
                      value={
                        option
                      }
                    >
                      {
                        ruleLabels[
                          option
                        ]
                      }
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                disabled={
                  busy ||
                  !watchlistId
                }
                onClick={
                  createRule
                }
                className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-xs font-medium text-violet-300 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Create Rule
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-zinc-900 bg-black/20 p-5">
              <div className="text-sm font-medium text-zinc-300">
                Pro alert-rule management
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-600">
                Creating, enabling, disabling and deleting monitoring rules requires an active AYZO Pro entitlement.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-4 text-xs text-rose-300">
              {error}
            </p>
          )}

          {notice && (
            <p className="mt-4 text-xs text-emerald-300">
              {notice}
            </p>
          )}

          {rules.length ===
          0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-zinc-800 p-5">
              <div className="text-sm text-zinc-300">
                No alert rules yet.
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-600">
                Monitoring definitions will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {rules.map(
                rule => (
                  <div
                    key={
                      rule.id
                    }
                    className="rounded-2xl border border-zinc-900 bg-black/30 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-zinc-200">
                          {ruleLabels[
                            rule
                              .rule_type
                          ] ??
                            rule.rule_type}
                        </div>

                        <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                          {watchlistName(
                            rule.watchlist_id
                          )}
                          {" · "}
                          {
                            rule.enabled
                              ? "enabled"
                              : "disabled"
                          }
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={
                            busy ||
                            !canManage
                          }
                          onClick={
                            () =>
                              toggleRule(
                                rule
                              )
                          }
                          className="rounded-lg border border-zinc-800 px-3 py-1.5 text-[10px] text-zinc-400 transition hover:text-zinc-200 disabled:opacity-40"
                        >
                          {rule.enabled
                            ? "Disable"
                            : "Enable"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            busy ||
                            !canManage
                          }
                          onClick={
                            () =>
                              deleteRule(
                                rule.id
                              )
                          }
                          className="rounded-lg border border-rose-500/20 px-3 py-1.5 text-[10px] text-rose-300 transition hover:bg-rose-500/5 disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <p className="mt-3 text-[10px] leading-5 text-zinc-700">
                      Rule definition only · notification delivery pending.
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
