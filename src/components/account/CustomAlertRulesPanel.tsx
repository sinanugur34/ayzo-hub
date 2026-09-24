"use client";

import {
  useEffect,
  useState,
} from "react";

type Rule = {
  id: string;
  network: string;
  subject_type:
    "wallet" |
    "token";
  subject_value: string;
  enabled: boolean;
  rule_config: {
    minimumNewEvidence?: number;
  };
};

const networks = [
  "bitcoin",
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
];

export default function CustomAlertRulesPanel() {
  const [
    rules,
    setRules,
  ] =
    useState<Rule[]>([]);

  const [
    network,
    setNetwork,
  ] =
    useState("bitcoin");

  const [
    subjectType,
    setSubjectType,
  ] =
    useState<
      "wallet" |
      "token"
    >("wallet");

  const [
    subjectValue,
    setSubjectValue,
  ] =
    useState("");

  const [
    minimum,
    setMinimum,
  ] =
    useState(1);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    locked,
    setLocked,
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

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      try {
        const response =
          await fetch(
            "/api/account/custom-alert-rules",
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
            setLocked(
              true
            );
          }

          return;
        }

        if (!response.ok) {
          throw new Error(
            body?.error ??
            "Unable to load Custom Alert Rules."
          );
        }

        if (!cancelled) {
          setRules(
            Array.isArray(
              body?.rules
            )
              ? body.rules
              : []
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
              : "Unable to load Custom Alert Rules."
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
  }, []);

  async function createRule() {
    if (
      busy ||
      !subjectValue.trim()
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/account/custom-alert-rules",
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

                subjectType:
                  network ===
                    "bitcoin"
                    ? "wallet"
                    : subjectType,

                subjectValue:
                  subjectValue.trim(),

                minimumNewEvidence:
                  minimum,

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
        !response.ok ||
        !body?.rule
      ) {
        throw new Error(
          body?.error ??
          "Unable to create rule."
        );
      }

      setRules(
        current => [
          body.rule,
          ...current,
        ]
      );

      setSubjectValue(
        ""
      );
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to create rule."
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateRule(
    rule:
      Rule
  ) {
    if (busy) {
      return;
    }

    setBusy(true);
    setError("");

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
          "Unable to update rule."
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
                    enabled:
                      body.rule.enabled,
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
          : "Unable to update rule."
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteRule(
    id: string
  ) {
    if (busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/account/alert-rules/${id}`,
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
          "Unable to delete rule."
        );
      }

      setRules(
        current =>
          current.filter(
            item =>
              item.id !==
              id
          )
      );
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to delete rule."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6">
      <div className="text-xs font-medium tracking-[0.16em] text-amber-300">
        ADVANCED · CUSTOM ALERT RULES
      </div>

      <h2 className="mt-2 text-xl font-semibold">
        Custom Alert Rules
      </h2>

      <p className="mt-2 text-xs leading-5 text-zinc-500">
        Require multiple newly observed activity evidence references before AYZO creates an alert event.
      </p>

      {loading ? (
        <div className="mt-5 text-sm text-zinc-600">
          Loading...
        </div>
      ) : locked ? (
        <div className="mt-5 rounded-2xl border border-amber-500/20 p-5 text-sm text-zinc-400">
          AYZO Advanced required.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <select
              value={
                network
              }
              onChange={
                event => {
                  setNetwork(
                    event.target.value
                  );

                  if (
                    event.target.value ===
                    "bitcoin"
                  ) {
                    setSubjectType(
                      "wallet"
                    );
                  }
                }
              }
              className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm"
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

            <select
              value={
                network ===
                  "bitcoin"
                  ? "wallet"
                  : subjectType
              }
              disabled={
                network ===
                  "bitcoin"
              }
              onChange={
                event =>
                  setSubjectType(
                    event.target
                      .value as
                      "wallet" |
                      "token"
                  )
              }
              className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm"
            >
              <option value="wallet">
                wallet
              </option>

              <option value="token">
                token
              </option>
            </select>

            <input
              type="number"
              min={1}
              max={20}
              value={
                minimum
              }
              onChange={
                event =>
                  setMinimum(
                    Math.max(
                      1,
                      Math.min(
                        20,
                        Number(
                          event.target.value
                        ) || 1
                      )
                    )
                  )
              }
              aria-label="Minimum new activity evidence"
              className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm"
            />

            <button
              type="button"
              disabled={
                busy ||
                !subjectValue.trim()
              }
              onClick={
                createRule
              }
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 disabled:opacity-50"
            >
              Create Rule
            </button>
          </div>

          <input
            value={
              subjectValue
            }
            onChange={
              event =>
                setSubjectValue(
                  event.target.value
                )
            }
            placeholder={
              network ===
                "bitcoin"
                ? "Bitcoin wallet address"
                : "0x wallet or token address"
            }
            className="mt-3 w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 font-mono text-xs"
          />

          <p className="mt-2 text-[10px] leading-5 text-zinc-600">
            V1 supports Bitcoin wallet activity and supported EVM wallet/token activity. Threshold range: 1–20 new evidence references per monitoring check.
          </p>

          <div className="mt-5 space-y-2">
            {rules.map(
              rule => (
                <div
                  key={
                    rule.id
                  }
                  className="rounded-2xl border border-zinc-900 bg-black/30 p-4"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <div className="text-sm text-zinc-200">
                        {rule.network}
                        {" · "}
                        {
                          rule.subject_type
                        }
                      </div>

                      <div className="mt-2 break-all font-mono text-[10px] text-zinc-600">
                        {
                          rule.subject_value
                        }
                      </div>

                      <div className="mt-2 text-[10px] text-zinc-600">
                        Minimum:{" "}
                        {
                          rule.rule_config
                            ?.minimumNewEvidence ??
                          1
                        }
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
                          busy
                        }
                        onClick={
                          () =>
                            updateRule(
                              rule
                            )
                        }
                        className="rounded-lg border border-zinc-800 px-3 py-2 text-xs"
                      >
                        {rule.enabled
                          ? "Disable"
                          : "Enable"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          busy
                        }
                        onClick={
                          () =>
                            deleteRule(
                              rule.id
                            )
                        }
                        className="rounded-lg border border-rose-500/20 px-3 py-2 text-xs text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
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
