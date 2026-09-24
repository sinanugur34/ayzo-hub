"use client";

import {
  useEffect,
  useState,
} from "react";

export default function EvidenceLockerQuickAdd({
  ensureSavedAnalysis,
}: {
  ensureSavedAnalysis:
    () => Promise<string | null>;
}) {
  const [
    allowed,
    setAllowed,
  ] =
    useState(false);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    locked,
    setLocked,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  useEffect(() => {
    let cancelled =
      false;

    void fetch(
      "/api/account/evidence-locker",
      {
        cache:
          "no-store",
        credentials:
          "same-origin",
      }
    )
      .then(
        response => {
          if (
            !cancelled &&
            response.ok
          ) {
            setAllowed(
              true
            );
          }
        }
      )
      .catch(
        () => undefined
      );

    return () => {
      cancelled =
        true;
    };
  }, []);

  async function lockEvidence() {
    if (
      busy ||
      locked
    ) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const savedAnalysisId =
        await ensureSavedAnalysis();

      if (!savedAnalysisId) {
        setMessage(
          "Save the analysis before locking evidence."
        );
        return;
      }

      const response =
        await fetch(
          "/api/account/evidence-locker",
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
                savedAnalysisId,
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
        response.ok ||
        response.status ===
          409
      ) {
        setLocked(
          true
        );

        setMessage(
          response.status ===
            409
            ? "Evidence is already locked."
            : "Evidence locked with SHA-256 fingerprint."
        );

        return;
      }

      setMessage(
        typeof body?.error ===
          "string"
          ? body.error
          : "Unable to lock evidence."
      );
    } catch {
      setMessage(
        "Unable to lock evidence."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-medium tracking-[0.14em] text-purple-300">
            ADVANCED · EVIDENCE LOCKER
          </div>

          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Capture an immutable snapshot of this saved analysis with a SHA-256 fingerprint.
          </p>
        </div>

        <button
          type="button"
          onClick={
            lockEvidence
          }
          disabled={
            busy ||
            locked
          }
          className="h-10 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 text-xs font-semibold text-purple-200 disabled:opacity-50"
        >
          {locked
            ? "Locked ✓"
            : busy
              ? "Locking..."
              : "Lock Evidence"}
        </button>
      </div>

      {message && (
        <div className="mt-3 text-xs text-zinc-500">
          {message}
        </div>
      )}
    </div>
  );
}
