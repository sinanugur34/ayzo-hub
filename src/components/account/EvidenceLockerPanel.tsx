"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type LockerItem = {
  id: string;
  source_saved_analysis_id: string;
  snapshot: {
    analysis?: {
      network?: string;
      subjectType?: string;
      subjectValue?: string;
      title?: string | null;
    };
  };
  snapshot_sha256: string;
  locked_at: string;
};

export default function EvidenceLockerPanel() {
  const [
    items,
    setItems,
  ] =
    useState<LockerItem[]>(
      []
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
    error,
    setError,
  ] =
    useState("");

  const load =
    useCallback(async () => {
      setError("");

      try {
        const response =
          await fetch(
            "/api/account/evidence-locker",
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
          setLockedOut(
            true
          );
          return;
        }

        if (!response.ok) {
          setError(
            typeof body?.error ===
              "string"
              ? body.error
              : "Unable to load Evidence Locker."
          );
          return;
        }

        setLockedOut(
          false
        );

        setItems(
          Array.isArray(
            body?.items
          )
            ? body.items
            : []
        );
      } catch {
        setError(
          "Unable to load Evidence Locker."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    let cancelled =
      false;

    void Promise.resolve().then(
      () => {
        if (!cancelled) {
          return load();
        }
      }
    );

    return () => {
      cancelled =
        true;
    };
  }, [load]);

  async function removeItem(
    itemId: string
  ) {
    if (
      !window.confirm(
        "Remove this snapshot from Evidence Locker? The underlying Saved Analysis will not be deleted."
      )
    ) {
      return;
    }

    const response =
      await fetch(
        `/api/account/evidence-locker?itemId=${encodeURIComponent(
          itemId
        )}`,
        {
          method:
            "DELETE",
          credentials:
            "same-origin",
        }
      );

    if (!response.ok) {
      setError(
        "Unable to remove locked evidence."
      );
      return;
    }

    await load();
  }

  return (
    <section className="mt-5 rounded-3xl border border-purple-500/20 bg-purple-500/5 p-6">
      <div className="text-xs font-medium tracking-[0.16em] text-purple-300">
        ADVANCED · EVIDENCE LOCKER
      </div>

      <h2 className="mt-2 text-xl font-semibold">
        Evidence Locker
      </h2>

      <p className="mt-2 text-xs leading-5 text-zinc-500">
        Preserve immutable snapshots of important analyses with SHA-256 fingerprints.
      </p>

      {loading ? (
        <div className="mt-5 text-sm text-zinc-600">
          Loading Evidence Locker...
        </div>
      ) : lockedOut ? (
        <div className="mt-5 rounded-2xl border border-purple-500/20 bg-black/20 p-5">
          <div className="text-sm font-medium text-zinc-200">
            AYZO Advanced required
          </div>

          <p className="mt-2 text-xs leading-5 text-zinc-600">
            Evidence Locker is available only with AYZO Advanced.
          </p>
        </div>
      ) : items.length ===
        0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-zinc-800 p-5 text-sm text-zinc-500">
          No locked evidence yet.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map(
            item => {
              const analysis =
                item.snapshot
                  ?.analysis;

              return (
                <div
                  key={
                    item.id
                  }
                  className="rounded-2xl border border-zinc-900 bg-black/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-all text-sm font-medium text-zinc-200">
                        {analysis
                          ?.title ||
                          analysis
                            ?.subjectValue ||
                          "Locked evidence"}
                      </div>

                      <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                        {analysis
                          ?.network ||
                          "unknown"}
                        {" · "}
                        {analysis
                          ?.subjectType ||
                          "evidence"}
                      </div>

                      <div className="mt-3 break-all font-mono text-[10px] text-zinc-700">
                        SHA-256{" "}
                        {
                          item.snapshot_sha256
                        }
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeItem(
                          item.id
                        )
                      }
                      className="text-xs text-zinc-600 transition hover:text-rose-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            }
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
