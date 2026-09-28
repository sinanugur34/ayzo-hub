"use client";

import {
  useState,
} from "react";

import {
  getLiveSmartAlertRuleTypes,
} from "@/lib/alerts/liveSupport";

import {
  trackEvent,
} from "@/lib/analytics/client";

import type {
  BasicAlertRuleType,
} from "@/lib/account/alertRules";

type SubjectType =
  | "wallet"
  | "token"
  | "transaction"
  | "entity"
  | "protocol";

const labels:
  Record<
    string,
    string
  > = {
  new_activity:
    "New activity",

  funding_movement:
    "Funding changed",

  relationship_change:
    "Relationships changed",

  contract_activity:
    "Contract / deployment changed",
};

export default function SmartAlertQuickAdd({
  network,
  subjectType,
  subjectValue,
}: {
  network:
    string;

  subjectType:
    SubjectType;

  subjectValue:
    string;
}) {
  const available =
    getLiveSmartAlertRuleTypes(
      network,
      subjectType
    );

  const [
    ruleType,
    setRuleType,
  ] =
    useState<
      BasicAlertRuleType
    >(
      available[0] ??
      "new_activity"
    );

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    notice,
    setNotice,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  if (
    available.length ===
    0
  ) {
    return null;
  }

  async function monitor() {
    if (busy) {
      return;
    }

    setBusy(true);
    setNotice("");
    setError("");

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

                subjectType,

                subjectValue,

                ruleType,

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
        body?.code ===
          "ALREADY_MONITORING"
      ) {
        setNotice(
          "This evidence signal is already being monitored."
        );

        return;
      }

      if (
        response.status ===
        403
      ) {
        setError(
          "Smart Alerts requires AYZO Pro or Advanced."
        );

        return;
      }

      if (!response.ok) {
        throw new Error(
          body?.error ??
          "Unable to enable Smart Alert."
        );
      }

      setNotice(
        body?.monitoringLive ===
          true
          ? "Monitoring enabled. The first scheduled observation establishes the alert baseline."
          : "Smart Alert saved. Scheduled monitoring is currently paused."
      );

      trackEvent(
        "smart_alert_enabled",
        {
          network,
          surface:
            "analysis",
        }
      );
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to enable Smart Alert."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-violet-500/15 bg-violet-500/[0.04] p-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-violet-300">
            SMART ALERTS
          </div>

          <div className="mt-1 text-sm font-medium text-zinc-200">
            Monitor changes to this subject
          </div>

          <p className="mt-1 max-w-xl text-[10px] leading-5 text-zinc-600">
            AYZO can monitor supported evidence without consuming your normal analysis quota. Alerts are evidence-backed and email delivery is used for supported detections.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
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
                    BasicAlertRuleType
                )
            }
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-300 outline-none focus:border-violet-500"
          >
            {available.map(
              option => (
                <option
                  key={
                    option
                  }
                  value={
                    option
                  }
                >
                  {labels[
                    option
                  ]}
                </option>
              )
            )}
          </select>

          <button
            type="button"
            disabled={
              busy
            }
            onClick={
              monitor
            }
            className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/15 disabled:opacity-40"
          >
            {busy
              ? "Enabling…"
              : "Monitor changes"}
          </button>
        </div>
      </div>

      {notice && (
        <p className="mt-3 text-[10px] text-emerald-300">
          {notice}
        </p>
      )}

      {error && (
        <p className="mt-3 text-[10px] text-rose-300">
          {error}
        </p>
      )}
    </section>
  );
}
