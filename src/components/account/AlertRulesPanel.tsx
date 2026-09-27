"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  SMART_ALERT_NETWORK_OPTIONS,
  getLiveSmartAlertRuleTypes,
  type SmartAlertRuntimeStatus,
} from "@/lib/alerts/liveSupport";

type AlertRule = {
  id:
    string;

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

  rule_config:
    Record<
      string,
      unknown
    > | null;

  delivery_channel:
    string;

  enabled:
    boolean;

  created_at:
    string;

  updated_at:
    string;

  runtimeStatus:
    SmartAlertRuntimeStatus;

  evaluationLive:
    boolean;

  deliveryLive:
    boolean;

  lastCheckedAt:
    string | null;

  lastEvidenceChangeAt:
    string | null;
};

const ruleLabels:
  Record<
    string,
    string
  > = {
  new_activity:
    "New Activity",

  funding_movement:
    "Funding Changed",

  relationship_change:
    "Relationships Changed",

  contract_activity:
    "Contract / Authority Changed",
};

function shortSubject(
  value:
    string | null
) {
  if (!value) {
    return "Watchlist definition";
  }

  if (
    value.length <=
    30
  ) {
    return value;
  }

  return `${value.slice(
    0,
    14
  )}…${value.slice(
    -10
  )}`;
}

function formatDate(
  value:
    string | null
) {
  if (!value) {
    return "Not checked yet";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    date
  );
}

function runtimeLabel(
  status:
    SmartAlertRuntimeStatus
) {
  switch (status) {
    case "live":
      return "LIVE";

    case "definition_only":
      return "DEFINITION ONLY";

    case "unsupported":
      return "NOT LIVE";
  }
}

export default function AlertRulesPanel() {
  const [
    rules,
    setRules,
  ] =
    useState<
      AlertRule[]
    >([]);

  const [
    canManage,
    setCanManage,
  ] =
    useState(false);

  const [
    deliveryLive,
    setDeliveryLive,
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
    network,
    setNetwork,
  ] =
    useState(
      SMART_ALERT_NETWORK_OPTIONS
        .find(
          item =>
            item.id ===
            "ethereum"
        )
        ?.id ??
      SMART_ALERT_NETWORK_OPTIONS[
        0
      ]?.id ??
      "bitcoin"
    );

  const [
    subjectType,
    setSubjectType,
  ] =
    useState<
      "wallet" |
      "token"
    >(
      "wallet"
    );

  const [
    subjectValue,
    setSubjectValue,
  ] =
    useState("");

  const [
    ruleType,
    setRuleType,
  ] =
    useState(
      "new_activity"
    );

  const selectedNetwork =
    SMART_ALERT_NETWORK_OPTIONS
      .find(
        item =>
          item.id ===
          network
      );

  const effectiveSubjectType =
    selectedNetwork
      ?.family ===
      "bitcoin"
      ? "wallet"
      : subjectType;

  const availableRuleTypes =
    getLiveSmartAlertRuleTypes(
      network,
      effectiveSubjectType
    );

  /*
   * Do not synchronize this derived value
   * through an effect. If a network or
   * subject change makes the selected rule
   * invalid, render and submit the first
   * live supported rule directly.
   */
  const effectiveRuleType =
    availableRuleTypes.some(
      option =>
        option ===
        ruleType
    )
      ? ruleType
      : availableRuleTypes[
          0
        ] ??
        "new_activity";

  useEffect(
    () => {
      let cancelled =
        false;

      async function load() {
        try {
          const response =
            await fetch(
              "/api/account/alert-rules",
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

          if (!response.ok) {
            throw new Error(
              body?.error ??
              "Unable to load Smart Alerts."
            );
          }

          if (cancelled) {
            return;
          }

          setRules(
            Array.isArray(
              body?.rules
            )
              ? body.rules
              : []
          );

          setCanManage(
            body?.canManage ===
            true
          );

          setDeliveryLive(
            body?.deliveryLive ===
            true
          );
        } catch (
          caught
        ) {
          if (!cancelled) {
            setError(
              caught instanceof
                Error
                ? caught.message
                : "Unable to load Smart Alerts."
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
    const target =
      subjectValue
        .trim();

    if (
      !target ||
      busy ||
      availableRuleTypes
        .length ===
        0
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

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                watchlistId:
                  null,

                network,

                subjectType:
                  effectiveSubjectType,

                subjectValue:
                  target,

                ruleType:
                  effectiveRuleType,

                enabled:
                  true,
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
          409 &&
        body?.rule
      ) {
        setNotice(
          "This subject is already monitored with that Smart Alert."
        );

        return;
      }

      if (!response.ok) {
        throw new Error(
          body?.error ??
          "Unable to create Smart Alert."
        );
      }

      setRules(
        current => [
          body.rule,
          ...current,
        ]
      );

      setSubjectValue("");

      setNotice(
        "Smart Alert enabled. AYZO will evaluate supported evidence on the scheduled monitoring cycle and send email when new supported evidence is detected."
      );
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to create Smart Alert."
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

            credentials:
              "same-origin",

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
          .json()
          .catch(
            () => null
          );

      if (
        !response.ok ||
        !body?.rule
      ) {
        throw new Error(
          body?.error ??
          "Unable to update Smart Alert."
        );
      }

      setRules(
        current =>
          current.map(
            item =>
              item.id ===
                rule.id
                ? {
                    ...item,
                    ...body.rule,
                  }
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
          : "Unable to update Smart Alert."
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
          body?.error ??
          "Unable to delete Smart Alert."
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
          : "Unable to delete Smart Alert."
      );
    } finally {
      setBusy(false);
    }
  }

  const liveRules =
    rules.filter(
      rule =>
        rule.runtimeStatus ===
          "live" &&
        rule.enabled
    );

  const definitionRules =
    rules.filter(
      rule =>
        rule.runtimeStatus ===
        "definition_only"
    );

  const latestCheckedAt =
    useMemo(
      () => {
        const timestamps =
          rules
            .map(
              rule =>
                rule.lastCheckedAt
            )
            .filter(
              (
                value
              ): value is string =>
                typeof value ===
                "string"
            )
            .sort(
              (
                left,
                right
              ) =>
                Date.parse(
                  right
                ) -
                Date.parse(
                  left
                )
            );

        return (
          timestamps[0] ??
          null
        );
      },
      [
        rules,
      ]
    );

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] via-zinc-950/80 to-black">
      <div className="p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
              SMART ALERTS
            </div>

            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-zinc-100">
              Evidence monitoring
            </h2>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
              Monitor direct Bitcoin and EVM subjects for new activity, funding evidence, relationship evidence and supported contract or authority changes.
            </p>
          </div>

          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-emerald-300">
            LIVE
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800/80 bg-black/30 p-4">
            <div className="text-[9px] uppercase tracking-[0.13em] text-zinc-600">
              Monitoring
            </div>

            <div className="mt-2 text-lg font-semibold text-zinc-200">
              {liveRules.length}
            </div>

            <div className="mt-1 text-[9px] text-zinc-600">
              active direct rules
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-black/30 p-4">
            <div className="text-[9px] uppercase tracking-[0.13em] text-zinc-600">
              Last checked
            </div>

            <div className="mt-2 text-xs font-medium text-zinc-300">
              {formatDate(
                latestCheckedAt
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-black/30 p-4">
            <div className="text-[9px] uppercase tracking-[0.13em] text-zinc-600">
              Email delivery
            </div>

            <div
              className={
                deliveryLive
                  ? "mt-2 text-xs font-medium text-emerald-300"
                  : "mt-2 text-xs font-medium text-amber-300"
              }
            >
              {deliveryLive
                ? "Active"
                : "Unavailable"}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
          <div className="text-xs font-medium text-emerald-300">
            Scheduled evidence monitoring
          </div>

          <p className="mt-2 text-[10px] leading-5 text-zinc-600">
            AYZO evaluates enabled supported rules on the scheduled monitoring cycle. The first successful observation establishes a baseline; only newly supported evidence can create an alert event. Browser and Telegram notifications are not currently supported.
          </p>
        </div>

        {loading ? (
          <p className="mt-5 text-xs text-zinc-600">
            Loading Smart Alerts…
          </p>
        ) : (
          <>
            {canManage ? (
              <div className="mt-5 rounded-2xl border border-zinc-900 bg-black/25 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  New direct Smart Alert
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[0.9fr_0.8fr_1.5fr_1.15fr_auto]">
                  <select
                    value={
                      network
                    }
                    onChange={
                      event => {
                        setNetwork(
                          event
                            .target
                            .value
                        );

                        const selected =
                          SMART_ALERT_NETWORK_OPTIONS
                            .find(
                              item =>
                                item.id ===
                                event
                                  .target
                                  .value
                            );

                        if (
                          selected
                            ?.family ===
                          "bitcoin"
                        ) {
                          setSubjectType(
                            "wallet"
                          );
                        }
                      }
                    }
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-300 outline-none focus:border-violet-500"
                  >
                    {SMART_ALERT_NETWORK_OPTIONS.map(
                      option => (
                        <option
                          key={
                            option.id
                          }
                          value={
                            option.id
                          }
                        >
                          {option.name}
                        </option>
                      )
                    )}
                  </select>

                  <select
                    value={
                      effectiveSubjectType
                    }
                    disabled={
                      selectedNetwork
                        ?.family ===
                      "bitcoin"
                    }
                    onChange={
                      event =>
                        setSubjectType(
                          event
                            .target
                            .value as
                            "wallet" |
                            "token"
                        )
                    }
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-300 outline-none disabled:opacity-60"
                  >
                    <option value="wallet">
                      Wallet
                    </option>

                    {selectedNetwork
                      ?.family ===
                      "evm" && (
                      <option value="token">
                        Token
                      </option>
                    )}
                  </select>

                  <input
                    value={
                      subjectValue
                    }
                    onChange={
                      event =>
                        setSubjectValue(
                          event
                            .target
                            .value
                        )
                    }
                    maxLength={
                      512
                    }
                    placeholder={
                      selectedNetwork
                        ?.family ===
                      "bitcoin"
                        ? "Bitcoin wallet address"
                        : "0x wallet or token address"
                    }
                    className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-xs text-zinc-300 outline-none placeholder:text-zinc-700 focus:border-violet-500"
                  />

                  <select
                    value={
                      effectiveRuleType
                    }
                    onChange={
                      event =>
                        setRuleType(
                          event
                            .target
                            .value
                        )
                    }
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-300 outline-none focus:border-violet-500"
                  >
                    {availableRuleTypes.map(
                      option => (
                        <option
                          key={
                            option
                          }
                          value={
                            option
                          }
                        >
                          {ruleLabels[
                            option
                          ]}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="button"
                    disabled={
                      busy ||
                      !subjectValue
                        .trim() ||
                      availableRuleTypes
                        .length ===
                        0
                    }
                    onClick={
                      createRule
                    }
                    className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy
                      ? "Saving…"
                      : "Monitor"}
                  </button>
                </div>

                <p className="mt-3 text-[9px] leading-4 text-zinc-700">
                  Live scheduled monitoring currently covers Bitcoin wallets and EVM wallet/token subjects. Unsupported networks are not presented as live.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-violet-500/15 bg-violet-500/[0.04] p-4">
                <div className="text-sm font-medium text-zinc-300">
                  Smart Alerts requires AYZO Pro or Advanced
                </div>

                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  Free accounts keep normal analysis access without filling the workspace with locked monitoring controls.
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

            {definitionRules.length >
              0 && (
              <div className="mt-5 rounded-2xl border border-amber-500/10 bg-amber-500/[0.03] p-4">
                <div className="text-xs font-medium text-amber-200">
                  {definitionRules.length}
                  {" "}
                  legacy watchlist
                  {" "}
                  {definitionRules.length ===
                  1
                    ? "definition"
                    : "definitions"}
                </div>

                <p className="mt-2 text-[10px] leading-5 text-zinc-600">
                  These definitions are preserved, but watchlist-wide scheduled evaluation is not live yet. They are never presented as active Smart Alert monitoring.
                </p>
              </div>
            )}

            {rules.length ===
            0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-zinc-800 p-5">
                <div className="text-sm text-zinc-300">
                  No Smart Alerts yet.
                </div>

                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  Add a direct supported subject above. The first observation establishes its monitoring baseline.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {rules.map(
                  rule => (
                    <article
                      key={
                        rule.id
                      }
                      className="rounded-2xl border border-zinc-900 bg-black/30 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-zinc-200">
                            {ruleLabels[
                              rule
                                .rule_type
                            ] ??
                              rule.rule_type}
                          </div>

                          <div className="mt-1 truncate font-mono text-[10px] text-zinc-600">
                            {shortSubject(
                              rule.subject_value
                            )}
                          </div>

                          <div className="mt-2 text-[9px] uppercase tracking-[0.12em] text-zinc-700">
                            {rule.network ??
                              "watchlist"}
                            {" · "}
                            {rule.subject_type ??
                              "definition"}
                          </div>
                        </div>

                        <span
                          className={
                            rule.runtimeStatus ===
                            "live"
                              ? "rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1 text-[8px] font-semibold tracking-[0.1em] text-emerald-300"
                              : rule.runtimeStatus ===
                                "definition_only"
                                ? "rounded-full border border-amber-500/15 bg-amber-500/[0.04] px-2.5 py-1 text-[8px] font-semibold tracking-[0.1em] text-amber-300"
                                : "rounded-full border border-zinc-800 px-2.5 py-1 text-[8px] font-semibold tracking-[0.1em] text-zinc-500"
                          }
                        >
                          {runtimeLabel(
                            rule.runtimeStatus
                          )}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-zinc-900 bg-black/20 p-3">
                          <div className="text-[8px] uppercase tracking-[0.12em] text-zinc-700">
                            Last checked
                          </div>

                          <div className="mt-1 text-[10px] text-zinc-400">
                            {formatDate(
                              rule.lastCheckedAt
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-zinc-900 bg-black/20 p-3">
                          <div className="text-[8px] uppercase tracking-[0.12em] text-zinc-700">
                            Last evidence change
                          </div>

                          <div className="mt-1 text-[10px] text-zinc-400">
                            {rule.lastEvidenceChangeAt
                              ? formatDate(
                                  rule.lastEvidenceChangeAt
                                )
                              : "None detected"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-[9px] text-zinc-600">
                          {rule.enabled
                            ? "Enabled"
                            : "Disabled"}
                          {" · "}
                          {rule.deliveryLive
                            ? "Email active"
                            : rule.runtimeStatus ===
                              "live"
                              ? "Email unavailable"
                              : "No live delivery"}
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
                    </article>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
