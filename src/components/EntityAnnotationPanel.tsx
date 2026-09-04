"use client";

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

type AnnotationColor =
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
  color_key: AnnotationColor;
};

type Props = {
  network: string;
  subjectType: SubjectType;
  subjectValue: string;
};

const colors: {
  key: AnnotationColor;
  label: string;
  selectedClass: string;
  dotClass: string;
  badgeClass: string;
}[] = [
  {
    key: "violet",
    label: "Violet",
    selectedClass:
      "border-violet-400 bg-violet-500/15 text-violet-200",
    dotClass:
      "bg-violet-400",
    badgeClass:
      "border-violet-500/30 bg-violet-500/10 text-violet-200",
  },
  {
    key: "blue",
    label: "Blue",
    selectedClass:
      "border-blue-400 bg-blue-500/15 text-blue-200",
    dotClass:
      "bg-blue-400",
    badgeClass:
      "border-blue-500/30 bg-blue-500/10 text-blue-200",
  },
  {
    key: "emerald",
    label: "Emerald",
    selectedClass:
      "border-emerald-400 bg-emerald-500/15 text-emerald-200",
    dotClass:
      "bg-emerald-400",
    badgeClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  },
  {
    key: "amber",
    label: "Amber",
    selectedClass:
      "border-amber-400 bg-amber-500/15 text-amber-200",
    dotClass:
      "bg-amber-400",
    badgeClass:
      "border-amber-500/30 bg-amber-500/10 text-amber-200",
  },
  {
    key: "rose",
    label: "Rose",
    selectedClass:
      "border-rose-400 bg-rose-500/15 text-rose-200",
    dotClass:
      "bg-rose-400",
    badgeClass:
      "border-rose-500/30 bg-rose-500/10 text-rose-200",
  },
  {
    key: "zinc",
    label: "Zinc",
    selectedClass:
      "border-zinc-400 bg-zinc-500/15 text-zinc-200",
    dotClass:
      "bg-zinc-400",
    badgeClass:
      "border-zinc-600 bg-zinc-800/50 text-zinc-200",
  },
];

function isAnnotationColor(
  value: unknown
): value is AnnotationColor {
  return colors.some(
    color =>
      color.key === value
  );
}

function parseAnnotation(
  value: unknown
): Annotation | null {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return null;
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  if (
    typeof record.id !==
      "string" ||
    typeof record.network !==
      "string" ||
    typeof record.subject_type !==
      "string" ||
    typeof record.subject_value !==
      "string" ||
    !isAnnotationColor(
      record.color_key
    )
  ) {
    return null;
  }

  return {
    id:
      record.id,

    network:
      record.network,

    subject_type:
      record.subject_type,

    subject_value:
      record.subject_value,

    label:
      typeof record.label ===
        "string"
        ? record.label
        : null,

    notes:
      typeof record.notes ===
        "string"
        ? record.notes
        : null,

    color_key:
      record.color_key,
  };
}

export default function EntityAnnotationPanel({
  network,
  subjectType,
  subjectValue,
}: Props) {
  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    removing,
    setRemoving,
  ] =
    useState(false);

  const [
    annotation,
    setAnnotation,
  ] =
    useState<Annotation | null>(
      null
    );

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
    useState<AnnotationColor>(
      "violet"
    );

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

    async function load() {
      setLoading(true);
      setMessage("");
      setMessageType("");

      const params =
        new URLSearchParams({
          network,
          subjectType,
          subjectValue,
        });

      try {
        const response =
          await fetch(
            `/api/account/entity-annotations?${params.toString()}`,
            {
              credentials:
                "same-origin",

              cache:
                "no-store",
            }
          );

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setMessage(
            "Unable to load your annotation."
          );

          setMessageType(
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

        const parsed =
          parseAnnotation(
            body?.annotation
          );

        setAnnotation(
          parsed
        );

        setLabel(
          parsed?.label ??
            ""
        );

        setNotes(
          parsed?.notes ??
            ""
        );

        setColorKey(
          parsed?.color_key ??
            "violet"
        );
      } catch {
        if (!cancelled) {
          setMessage(
            "Unable to load your annotation."
          );

          setMessageType(
            "error"
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

    load();

    return () => {
      cancelled =
        true;
    };
  }, [
    network,
    subjectType,
    subjectValue,
  ]);

  function showMessage(
    text: string,
    type:
      "success" |
      "error"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  async function save() {
    if (saving) {
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
      showMessage(
        "Add a label or private note first.",
        "error"
      );

      return;
    }

    setSaving(true);
    setMessage("");
    setMessageType("");

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
                network,
                subjectType,
                subjectValue,
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

      if (!response.ok) {
        showMessage(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to save your annotation.",
          "error"
        );

        return;
      }

      const parsed =
        parseAnnotation(
          body?.annotation
        );

      if (!parsed) {
        showMessage(
          "Annotation saved but could not be refreshed.",
          "error"
        );

        return;
      }

      setAnnotation(
        parsed
      );

      setLabel(
        parsed.label ??
          ""
      );

      setNotes(
        parsed.notes ??
          ""
      );

      setColorKey(
        parsed.color_key
      );

      showMessage(
        "Your private annotation was saved.",
        "success"
      );
    } catch {
      showMessage(
        "Unable to save your annotation.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (
      !annotation ||
      removing
    ) {
      return;
    }

    setRemoving(true);
    setMessage("");
    setMessageType("");

    const params =
      new URLSearchParams({
        network,
        subjectType,
        subjectValue,
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

      if (!response.ok) {
        const body =
          await response
            .json()
            .catch(
              () => null
            );

        showMessage(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to remove your annotation.",
          "error"
        );

        return;
      }

      setAnnotation(
        null
      );

      setLabel("");
      setNotes("");
      setColorKey(
        "violet"
      );

      showMessage(
        "Your annotation was removed.",
        "success"
      );
    } catch {
      showMessage(
        "Unable to remove your annotation.",
        "error"
      );
    } finally {
      setRemoving(false);
    }
  }

  const activeColor =
    colors.find(
      color =>
        color.key ===
        (
          annotation?.color_key ??
          colorKey
        )
    ) ??
    colors[0];

  return (
    <div className="mt-5 rounded-2xl border border-zinc-800 bg-black/30 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="text-[10px] font-medium tracking-[0.16em] text-zinc-600">
            YOUR LABEL
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {annotation?.label ? (
              <span
                className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${activeColor.badgeClass}`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${activeColor.dotClass}`}
                />

                <span className="truncate">
                  {annotation.label}
                </span>
              </span>
            ) : (
              <span className="text-sm text-zinc-500">
                No personal label yet.
              </span>
            )}

            {annotation?.notes && (
              <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-700">
                Private note saved
              </span>
            )}
          </div>

          <p className="mt-2 text-[11px] leading-5 text-zinc-600">
            Personal annotations are private to your AYZO account and are not AYZO-verified entity labels.
          </p>
        </div>

        <button
          type="button"
          aria-expanded={
            open
          }
          onClick={() =>
            setOpen(
              value =>
                !value
            )
          }
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800"
        >
          {open
            ? "Close"
            : annotation
              ? "Edit Label & Note"
              : "Add Label & Note"}
        </button>
      </div>

      {open && (
        <div className="mt-5 border-t border-zinc-900 pt-5">
          {loading ? (
            <div className="text-xs text-zinc-600">
              Loading your annotation...
            </div>
          ) : (
            <>
              <label
                htmlFor={`entity-label-${network}-${subjectValue}`}
                className="text-[10px] uppercase tracking-[0.12em] text-zinc-600"
              >
                Your label
              </label>

              <input
                id={`entity-label-${network}-${subjectValue}`}
                type="text"
                value={
                  label
                }
                onChange={
                  event =>
                    setLabel(
                      event.target.value
                    )
                }
                maxLength={
                  80
                }
                placeholder="e.g. Treasury, Whale, Founder Wallet"
                className="mt-2 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-300 outline-none placeholder:text-zinc-700 focus:border-violet-500"
              />

              <div className="mt-5">
                <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                  Label color
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {colors.map(
                    color => {
                      const selected =
                        colorKey ===
                        color.key;

                      return (
                        <button
                          key={
                            color.key
                          }
                          type="button"
                          aria-pressed={
                            selected
                          }
                          onClick={() =>
                            setColorKey(
                              color.key
                            )
                          }
                          className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs transition ${
                            selected
                              ? color.selectedClass
                              : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${color.dotClass}`}
                          />

                          {color.label}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="mt-5">
                <label
                  htmlFor={`entity-note-${network}-${subjectValue}`}
                  className="text-[10px] uppercase tracking-[0.12em] text-zinc-600"
                >
                  Private note
                </label>

                <textarea
                  id={`entity-note-${network}-${subjectValue}`}
                  value={
                    notes
                  }
                  onChange={
                    event =>
                      setNotes(
                        event.target.value
                      )
                  }
                  maxLength={
                    5000
                  }
                  rows={
                    4
                  }
                  placeholder="Add context, investigation notes, or why this entity matters..."
                  className="mt-2 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-300 outline-none placeholder:text-zinc-700 focus:border-violet-500"
                />

                <div className="mt-1 text-right text-[10px] text-zinc-700">
                  {notes.length}
                  /5000
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={
                    saving ||
                    removing ||
                    (
                      !label.trim() &&
                      !notes.trim()
                    )
                  }
                  onClick={
                    save
                  }
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-default disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : annotation
                      ? "Update Annotation"
                      : "Save Annotation"}
                </button>

                {annotation && (
                  <button
                    type="button"
                    disabled={
                      saving ||
                      removing
                    }
                    onClick={
                      remove
                    }
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 text-xs font-medium text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50"
                  >
                    {removing
                      ? "Removing..."
                      : "Remove"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {message && (
        <div
          className={`mt-3 text-xs ${
            messageType ===
            "success"
              ? "text-emerald-400"
              : "text-rose-300"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
