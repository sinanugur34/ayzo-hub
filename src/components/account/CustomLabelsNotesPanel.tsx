"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type ColorKey =
  | "violet"
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "zinc";

type Annotation = {
  id: string;
  network: string;
  subject_type: string;
  subject_value: string;
  label: string | null;
  notes: string | null;
  color_key: ColorKey;
  created_at: string;
  updated_at: string;
};

const colors: ColorKey[] = [
  "violet",
  "blue",
  "emerald",
  "amber",
  "rose",
  "zinc",
];

export default function CustomLabelsNotesPanel() {
  const [
    annotations,
    setAnnotations,
  ] =
    useState<
      Annotation[]
    >([]);

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
    editingId,
    setEditingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    label,
    setLabel,
  ] =
    useState("");

  const [
    notes,
    setNotes,
  ] =
    useState("");

  const [
    colorKey,
    setColorKey,
  ] =
    useState<ColorKey>(
      "violet"
    );

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

  useEffect(
    () => {
      let cancelled =
        false;

      async function load() {
        try {
          const response =
            await fetch(
              "/api/account/custom-labels-notes",
              {
                credentials:
                  "same-origin",

                cache:
                  "no-store",
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

          if (!response.ok) {
            throw new Error(
              typeof body?.error ===
                "string"
                ? body.error
                : "Unable to load Custom Labels & Notes."
            );
          }

          if (!cancelled) {
            setAnnotations(
              Array.isArray(
                body?.annotations
              )
                ? body.annotations
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
                : "Unable to load Custom Labels & Notes."
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

  const networks =
    useMemo(
      () =>
        Array.from(
          new Set(
            annotations.map(
              item =>
                item.network
            )
          )
        ).sort(),
      [
        annotations,
      ]
    );

  const subjectTypes =
    useMemo(
      () =>
        Array.from(
          new Set(
            annotations.map(
              item =>
                item.subject_type
            )
          )
        ).sort(),
      [
        annotations,
      ]
    );

  const filtered =
    useMemo(
      () => {
        const normalized =
          query
            .trim()
            .toLowerCase();

        return annotations
          .filter(
            item =>
              !network ||
              item.network ===
                network
          )
          .filter(
            item =>
              !subjectType ||
              item.subject_type ===
                subjectType
          )
          .filter(
            item => {
              if (!normalized) {
                return true;
              }

              return [
                item.network,
                item.subject_type,
                item.subject_value,
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
          );
      },
      [
        annotations,
        network,
        query,
        subjectType,
      ]
    );

  function beginEdit(
    item:
      Annotation
  ) {
    setEditingId(
      item.id
    );

    setLabel(
      item.label ??
        ""
    );

    setNotes(
      item.notes ??
        ""
    );

    setColorKey(
      item.color_key
    );

    setError("");
  }

  async function save(
    item:
      Annotation
  ) {
    if (busy) {
      return;
    }

    const cleanLabel =
      label.trim();

    const cleanNotes =
      notes.trim();

    if (
      !cleanLabel &&
      !cleanNotes
    ) {
      setError(
        "A label or note is required."
      );

      return;
    }

    setBusy(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/account/entity-annotations",
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
                network:
                  item.network,

                subjectType:
                  item.subject_type,

                subjectValue:
                  item.subject_value,

                label:
                  cleanLabel ||
                  null,

                notes:
                  cleanNotes ||
                  null,

                colorKey,
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
        !body?.annotation
      ) {
        throw new Error(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to update annotation."
        );
      }

      setAnnotations(
        current =>
          current.map(
            annotation =>
              annotation.id ===
                item.id
                ? body.annotation
                : annotation
          )
      );

      setEditingId(
        null
      );
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to update annotation."
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(
    item:
      Annotation
  ) {
    if (busy) {
      return;
    }

    setBusy(true);
    setError("");

    const params =
      new URLSearchParams({
        network:
          item.network,

        subjectType:
          item.subject_type,

        subjectValue:
          item.subject_value,
      });

    try {
      const response =
        await fetch(
          `/api/account/entity-annotations?${params.toString()}`,
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
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to delete annotation."
        );
      }

      setAnnotations(
        current =>
          current.filter(
            annotation =>
              annotation.id !==
              item.id
          )
      );

      if (
        editingId ===
          item.id
      ) {
        setEditingId(
          null
        );
      }
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to delete annotation."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-6">
      <div className="text-xs font-medium tracking-[0.16em] text-fuchsia-300">
        ADVANCED · CUSTOM LABELS & NOTES
      </div>

      <h2 className="mt-2 text-xl font-semibold">
        Custom Labels & Notes
      </h2>

      <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
        Search and manage your private wallet, token and entity annotations across AYZO.
      </p>

      <p className="mt-2 text-[10px] leading-5 text-zinc-600">
        These are your private account annotations. They are not AYZO-verified entity labels.
      </p>

      {loading ? (
        <div className="mt-5 text-sm text-zinc-600">
          Loading Custom Labels & Notes...
        </div>
      ) : lockedOut ? (
        <div className="mt-5 rounded-2xl border border-fuchsia-500/20 bg-black/20 p-5">
          <div className="text-sm font-medium text-zinc-200">
            AYZO Advanced required
          </div>

          <p className="mt-2 text-xs text-zinc-600">
            The cross-entity annotation workspace is available only with AYZO Advanced.
          </p>
        </div>
      ) : (
        <>
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
              placeholder="Search label, note or subject"
              className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200 outline-none md:col-span-2"
            />

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
              className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200"
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
              No personal labels or notes match the current filters.
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {filtered.map(
                item => (
                  <div
                    key={
                      item.id
                    }
                    className="rounded-2xl border border-zinc-900 bg-black/30 p-4"
                  >
                    {editingId ===
                    item.id ? (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            value={
                              label
                            }
                            maxLength={
                              80
                            }
                            onChange={
                              event =>
                                setLabel(
                                  event.target.value
                                )
                            }
                            placeholder="Label"
                            className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm"
                          />

                          <select
                            value={
                              colorKey
                            }
                            onChange={
                              event =>
                                setColorKey(
                                  event.target.value as
                                    ColorKey
                                )
                            }
                            className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm"
                          >
                            {colors.map(
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

                        <textarea
                          value={
                            notes
                          }
                          maxLength={
                            5000
                          }
                          rows={4}
                          onChange={
                            event =>
                              setNotes(
                                event.target.value
                              )
                          }
                          placeholder="Private note"
                          className="mt-3 w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm"
                        />

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={
                              busy
                            }
                            onClick={
                              () =>
                                save(
                                  item
                                )
                            }
                            className="rounded-lg border border-fuchsia-500/30 px-3 py-2 text-xs text-fuchsia-200 disabled:opacity-50"
                          >
                            Save
                          </button>

                          <button
                            type="button"
                            disabled={
                              busy
                            }
                            onClick={
                              () =>
                                setEditingId(
                                  null
                                )
                            }
                            className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-400 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-medium text-zinc-200">
                              {item.label ??
                                "Private note"}
                            </div>

                            <span className="rounded-full border border-zinc-800 px-2 py-1 text-[9px] uppercase text-zinc-500">
                              {item.color_key}
                            </span>
                          </div>

                          <div className="mt-2 text-[10px] uppercase tracking-[0.1em] text-zinc-600">
                            {item.network}
                            {" · "}
                            {item.subject_type}
                          </div>

                          <div className="mt-2 break-all font-mono text-[10px] text-zinc-600">
                            {item.subject_value}
                          </div>

                          {item.notes && (
                            <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-zinc-400">
                              {item.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={
                              busy
                            }
                            onClick={
                              () =>
                                beginEdit(
                                  item
                                )
                            }
                            className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300 disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={
                              busy
                            }
                            onClick={
                              () =>
                                remove(
                                  item
                                )
                            }
                            className="rounded-lg border border-rose-500/20 px-3 py-2 text-xs text-rose-300 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
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
