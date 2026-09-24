"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Item = {
  id: string;
  network: string;
  subjectType: string;
  subjectValue: string;
  label: string | null;
  notes: string | null;
};

type Watchlist = {
  id: string;
  name: string;
  description: string | null;
  items: Item[];
};

type Overview = {
  totalWatchlists: number;
  totalItems: number;
  uniqueSubjects: number;
  duplicateMemberships: number;
};

type FlatItem = Item & {
  watchlistId: string;
  watchlistName: string;
};

export default function AdvancedWatchlistsPanel() {
  const [
    watchlists,
    setWatchlists,
  ] =
    useState<
      Watchlist[]
    >([]);

  const [
    overview,
    setOverview,
  ] =
    useState<
      Overview | null
    >(null);

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
    error,
    setError,
  ] =
    useState("");

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    network,
    setNetwork,
  ] =
    useState("");

  const [
    subjectType,
    setSubjectType,
  ] =
    useState("");

  const [
    watchlistId,
    setWatchlistId,
  ] =
    useState("");

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      try {
        const response =
          await fetch(
            "/api/account/advanced-watchlists",
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
            setLockedOut(
              true
            );
          }

          return;
        }

        if (
          !response.ok
        ) {
          throw new Error(
            typeof body?.error ===
              "string"
              ? body.error
              : "Unable to load Advanced Watchlists."
          );
        }

        if (cancelled) {
          return;
        }

        setWatchlists(
          Array.isArray(
            body?.watchlists
          )
            ? body.watchlists
            : []
        );

        setOverview(
          body?.overview ??
            null
        );
      } catch (
        caught
      ) {
        if (!cancelled) {
          setError(
            caught instanceof
              Error
              ? caught.message
              : "Unable to load Advanced Watchlists."
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

  const items =
    useMemo<
      FlatItem[]
    >(
      () =>
        watchlists.flatMap(
          list =>
            list.items.map(
              item => ({
                ...item,
                watchlistId:
                  list.id,
                watchlistName:
                  list.name,
              })
            )
        ),
      [
        watchlists,
      ]
    );

  const networks =
    useMemo(
      () =>
        Array.from(
          new Set(
            items.map(
              item =>
                item.network
            )
          )
        ).sort(),
      [
        items,
      ]
    );

  const subjectTypes =
    useMemo(
      () =>
        Array.from(
          new Set(
            items.map(
              item =>
                item.subjectType
            )
          )
        ).sort(),
      [
        items,
      ]
    );

  const filtered =
    useMemo(
      () => {
        const normalized =
          query
            .trim()
            .toLowerCase();

        return items
          .filter(
            item =>
              !watchlistId ||
              item.watchlistId ===
                watchlistId
          )
          .filter(
            item =>
              !network ||
              item.network ===
                network
          )
          .filter(
            item =>
              !subjectType ||
              item.subjectType ===
                subjectType
          )
          .filter(
            item => {
              if (
                !normalized
              ) {
                return true;
              }

              return [
                item.watchlistName,
                item.network,
                item.subjectType,
                item.subjectValue,
                item.label ?? "",
                item.notes ?? "",
              ]
                .join(
                  " "
                )
                .toLowerCase()
                .includes(
                  normalized
                );
            }
          )
          .slice(
            0,
            100
          );
      },
      [
        items,
        network,
        query,
        subjectType,
        watchlistId,
      ]
    );

  return (
    <section className="mt-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6">
      <div className="text-xs font-medium tracking-[0.16em] text-emerald-300">
        ADVANCED · WATCHLISTS
      </div>

      <h2 className="mt-2 text-xl font-semibold">
        Advanced Watchlists
      </h2>

      <p className="mt-2 text-xs leading-5 text-zinc-500">
        Search and triage monitored subjects across your watchlists without inventing risk scores or unsupported activity signals.
      </p>

      {loading ? (
        <div className="mt-5 text-sm text-zinc-600">
          Loading Advanced Watchlists...
        </div>
      ) : lockedOut ? (
        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-black/20 p-5">
          <div className="text-sm font-medium text-zinc-200">
            AYZO Advanced required
          </div>

          <p className="mt-2 text-xs text-zinc-600">
            Advanced Watchlists is available only with AYZO Advanced.
          </p>
        </div>
      ) : (
        <>
          {overview && (
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <Metric
                label="Watchlists"
                value={
                  overview.totalWatchlists
                }
              />

              <Metric
                label="Memberships"
                value={
                  overview.totalItems
                }
              />

              <Metric
                label="Unique subjects"
                value={
                  overview.uniqueSubjects
                }
              />

              <Metric
                label="Cross-list duplicates"
                value={
                  overview.duplicateMemberships
                }
              />
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <input
              value={
                query
              }
              onChange={
                event =>
                  setQuery(
                    event.target.value
                  )
              }
              placeholder="Search subject, label or notes"
              className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200 outline-none md:col-span-2"
            />

            <select
              value={
                watchlistId
              }
              onChange={
                event =>
                  setWatchlistId(
                    event.target.value
                  )
              }
              className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200"
            >
              <option value="">
                All watchlists
              </option>

              {watchlists.map(
                list => (
                  <option
                    key={
                      list.id
                    }
                    value={
                      list.id
                    }
                  >
                    {list.name}
                  </option>
                )
              )}
            </select>

            <select
              value={
                network
              }
              onChange={
                event =>
                  setNetwork(
                    event.target.value
                  )
              }
              className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200"
            >
              <option value="">
                All networks
              </option>

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
          </div>

          <div className="mt-3">
            <select
              value={
                subjectType
              }
              onChange={
                event =>
                  setSubjectType(
                    event.target.value
                  )
              }
              className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200 sm:w-auto"
            >
              <option value="">
                All subject types
              </option>

              {subjectTypes.map(
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
          </div>

          {filtered.length ===
          0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-zinc-800 p-5 text-sm text-zinc-500">
              No watchlist subjects match the current filters.
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {filtered.map(
                item => (
                  <div
                    key={`${item.watchlistId}:${item.id}`}
                    className="rounded-2xl border border-zinc-900 bg-black/30 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="break-all text-sm font-medium text-zinc-200">
                          {item.label ||
                            item.subjectValue}
                        </div>

                        <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                          {item.network}
                          {" · "}
                          {item.subjectType}
                          {" · "}
                          {item.watchlistName}
                        </div>

                        {item.label && (
                          <div className="mt-2 break-all font-mono text-[10px] text-zinc-700">
                            {item.subjectValue}
                          </div>
                        )}

                        {item.notes && (
                          <p className="mt-2 text-xs leading-5 text-zinc-500">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
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

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-900 bg-black/30 p-4">
      <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-600">
        {label}
      </div>

      <div className="mt-2 text-lg font-semibold text-zinc-200">
        {value}
      </div>
    </div>
  );
}
