"use client";

import {
  useEffect,
  useState,
} from "react";

type SavedAnalysis = {
  id: string;
  network: string;
  subject_type: string;
  subject_value: string;
  title: string | null;
};

type Comparison = {
  subjects: {
    sameNetwork: boolean;
    sameSubjectType: boolean;
    sameSubjectValue: boolean;
  };

  payload: {
    exactMatch: boolean;
    leftKeyCount: number;
    rightKeyCount: number;
    sharedKeyCount: number;
    changedKeyCount: number;
    unchangedKeyCount: number;
    changedKeys: string[];
    leftOnlyKeys: string[];
    rightOnlyKeys: string[];
  };

  left: {
    title: string | null;
    network: string;
    subjectType: string;
    subjectValue: string;
  };

  right: {
    title: string | null;
    network: string;
    subjectType: string;
    subjectValue: string;
  };
};

function yesNo(
  value: boolean
) {
  return value
    ? "YES"
    : "NO";
}

export default function CompareInvestigationsPanel() {
  const [
    analyses,
    setAnalyses,
  ] =
    useState<SavedAnalysis[]>(
      []
    );

  const [
    leftId,
    setLeftId,
  ] =
    useState("");

  const [
    rightId,
    setRightId,
  ] =
    useState("");

  const [
    comparison,
    setComparison,
  ] =
    useState<Comparison | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    comparing,
    setComparing,
  ] =
    useState(false);

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

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      try {
        const access =
          await fetch(
            "/api/account/compare-investigations",
            {
              cache:
                "no-store",
              credentials:
                "same-origin",
            }
          );

        if (
          access.status ===
          403
        ) {
          if (!cancelled) {
            setLockedOut(
              true
            );
          }

          return;
        }

        if (!access.ok) {
          throw new Error();
        }

        const response =
          await fetch(
            "/api/account/saved-analyses",
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
          !response.ok ||
          !Array.isArray(
            body?.analyses
          )
        ) {
          throw new Error();
        }

        if (cancelled) {
          return;
        }

        const rows =
          body.analyses as SavedAnalysis[];

        setAnalyses(
          rows
        );

        if (
          rows.length >=
          2
        ) {
          setLeftId(
            rows[0].id
          );

          setRightId(
            rows[1].id
          );
        }
      } catch {
        if (!cancelled) {
          setError(
            "Unable to load investigations."
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

  async function compare() {
    if (
      comparing ||
      !leftId ||
      !rightId ||
      leftId === rightId
    ) {
      return;
    }

    setComparing(
      true
    );
    setError("");
    setComparison(
      null
    );

    try {
      const response =
        await fetch(
          "/api/account/compare-investigations",
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
                leftSavedAnalysisId:
                  leftId,
                rightSavedAnalysisId:
                  rightId,
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
        !body?.comparison
      ) {
        setError(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to compare investigations."
        );
        return;
      }

      setComparison(
        body.comparison
      );
    } catch {
      setError(
        "Unable to compare investigations."
      );
    } finally {
      setComparing(
        false
      );
    }
  }

  return (
    <section className="mt-5 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6">
      <div className="text-xs font-medium tracking-[0.16em] text-cyan-300">
        ADVANCED · COMPARE INVESTIGATIONS
      </div>

      <h2 className="mt-2 text-xl font-semibold">
        Compare Investigations
      </h2>

      <p className="mt-2 text-xs leading-5 text-zinc-500">
        Compare two saved analyses using their recorded evidence structure without generating risk scores or unsupported conclusions.
      </p>

      {loading ? (
        <div className="mt-5 text-sm text-zinc-600">
          Loading investigations...
        </div>
      ) : lockedOut ? (
        <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-black/20 p-5">
          <div className="text-sm font-medium text-zinc-200">
            AYZO Advanced required
          </div>

          <p className="mt-2 text-xs text-zinc-600">
            Compare Investigations is available only with AYZO Advanced.
          </p>
        </div>
      ) : analyses.length < 2 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-zinc-800 p-5">
          <div className="text-sm text-zinc-300">
            Save at least two analyses to compare them.
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <select
              value={
                leftId
              }
              onChange={
                event =>
                  setLeftId(
                    event.target.value
                  )
              }
              className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200"
            >
              {analyses.map(
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
                  </option>
                )
              )}
            </select>

            <select
              value={
                rightId
              }
              onChange={
                event =>
                  setRightId(
                    event.target.value
                  )
              }
              className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200"
            >
              {analyses.map(
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
                  </option>
                )
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={
              compare
            }
            disabled={
              comparing ||
              !leftId ||
              !rightId ||
              leftId ===
                rightId
            }
            className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 disabled:opacity-50"
          >
            {comparing
              ? "Comparing..."
              : "Compare Investigations"}
          </button>
        </>
      )}

      {comparison && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                Same network
              </div>

              <div className="mt-2 text-sm font-semibold text-zinc-200">
                {yesNo(
                  comparison
                    .subjects
                    .sameNetwork
                )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                Same type
              </div>

              <div className="mt-2 text-sm font-semibold text-zinc-200">
                {yesNo(
                  comparison
                    .subjects
                    .sameSubjectType
                )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                Exact subject
              </div>

              <div className="mt-2 text-sm font-semibold text-zinc-200">
                {yesNo(
                  comparison
                    .subjects
                    .sameSubjectValue
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-900 bg-black/30 p-4">
              <div className="text-[10px] text-zinc-600">
                Shared modules
              </div>
              <div className="mt-1 text-lg font-semibold">
                {
                  comparison
                    .payload
                    .sharedKeyCount
                }
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-black/30 p-4">
              <div className="text-[10px] text-zinc-600">
                Changed
              </div>
              <div className="mt-1 text-lg font-semibold">
                {
                  comparison
                    .payload
                    .changedKeyCount
                }
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-black/30 p-4">
              <div className="text-[10px] text-zinc-600">
                Left modules
              </div>
              <div className="mt-1 text-lg font-semibold">
                {
                  comparison
                    .payload
                    .leftKeyCount
                }
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-black/30 p-4">
              <div className="text-[10px] text-zinc-600">
                Right modules
              </div>
              <div className="mt-1 text-lg font-semibold">
                {
                  comparison
                    .payload
                    .rightKeyCount
                }
              </div>
            </div>
          </div>

          {comparison.payload
            .changedKeys.length >
            0 && (
            <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
              <div className="text-xs font-medium text-zinc-300">
                Changed evidence modules
              </div>

              <div className="mt-2 break-words font-mono text-xs leading-5 text-zinc-500">
                {comparison.payload.changedKeys.join(
                  ", "
                )}
              </div>
            </div>
          )}

          {(comparison.payload
            .leftOnlyKeys.length >
            0 ||
            comparison.payload
              .rightOnlyKeys
              .length >
              0) && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
                <div className="text-xs font-medium text-zinc-300">
                  Left-only modules
                </div>

                <div className="mt-2 break-words font-mono text-xs text-zinc-600">
                  {comparison.payload.leftOnlyKeys.join(
                    ", "
                  ) ||
                    "None"}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
                <div className="text-xs font-medium text-zinc-300">
                  Right-only modules
                </div>

                <div className="mt-2 break-words font-mono text-xs text-zinc-600">
                  {comparison.payload.rightOnlyKeys.join(
                    ", "
                  ) ||
                    "None"}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 text-xs text-rose-300">
          {error}
        </div>
      )}
    </section>
  );
}
