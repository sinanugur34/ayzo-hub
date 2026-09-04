"use client";

import Link from "next/link";

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

type Props = {
  network: string;
  subjectType:
    SubjectType;
  subjectValue: string;
  title: string;
};

export default function AnalysisActions({
  network,
  subjectType,
  subjectValue,
  title,
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
