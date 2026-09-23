"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

type CaseSummary = {
  id: string;
  name: string;
  description: string | null;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
};

export default function CasesPanel() {
  const [
    cases,
    setCases,
  ] =
    useState<CaseSummary[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    denied,
    setDenied,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    name,
    setName,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    creating,
    setCreating,
  ] =
    useState(false);

  async function loadCases() {
    try {
      const response =
        await fetch(
          "/api/account/cases",
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
        setDenied(true);
        setCases([]);
        return;
      }

      if (!response.ok) {
        setError(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to load cases."
        );
        return;
      }

      setDenied(false);

      setCases(
        Array.isArray(
          body?.cases
        )
          ? body.cases
          : []
      );
    } catch {
      setError(
        "Unable to load cases."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCases();
  }, []);

  async function createCase() {
    const cleanName =
      name.trim();

    if (
      !cleanName ||
      creating
    ) {
      return;
    }

    setCreating(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/account/cases",
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
                name:
                  cleanName,
                description:
                  description.trim() ||
                  null,
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
        setError(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to create case."
        );
        return;
      }

      setName("");
      setDescription("");

      await loadCases();
    } catch {
      setError(
        "Unable to create case."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="mt-5 rounded-3xl border border-purple-500/20 bg-purple-500/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium tracking-[0.16em] text-purple-300">
            ADVANCED · INVESTIGATIONS
          </div>

          <h2 className="mt-2 text-xl font-semibold">
            Cases
          </h2>

          <p className="mt-2 max-w-xl text-xs leading-5 text-zinc-500">
            Organize saved analyses into focused investigation workspaces without duplicating evidence.
          </p>
        </div>

        {!loading &&
          !denied && (
          <div className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1 text-xs text-zinc-500">
            {cases.length}
          </div>
        )}
      </div>

      {loading && (
        <p className="mt-5 text-xs text-zinc-600">
          Loading cases...
        </p>
      )}

      {!loading &&
        denied && (
        <div className="mt-5 rounded-2xl border border-purple-500/15 bg-black/30 p-5">
          <div className="text-sm font-medium text-zinc-300">
            Cases requires AYZO Advanced.
          </div>

          <p className="mt-2 text-xs leading-5 text-zinc-600">
            Your current plan remains unchanged. Advanced upgrades are available from the Plan card above.
          </p>
        </div>
      )}

      {!loading &&
        !denied && (
        <>
          <div className="mt-5 rounded-2xl border border-zinc-800 bg-black/30 p-4">
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
              New Case
            </div>

            <div className="mt-3 grid gap-3">
              <input
                value={name}
                onChange={
                  event =>
                    setName(
                      event.target.value
                    )
                }
                maxLength={160}
                placeholder="Case name"
                className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-purple-500"
              />

              <textarea
                value={
                  description
                }
                onChange={
                  event =>
                    setDescription(
                      event.target.value
                    )
                }
                maxLength={5000}
                rows={3}
                placeholder="Optional investigation context"
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-300 outline-none placeholder:text-zinc-700 focus:border-purple-500"
              />

              <button
                type="button"
                onClick={
                  createCase
                }
                disabled={
                  creating ||
                  !name.trim()
                }
                className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-default disabled:opacity-50"
              >
                {creating
                  ? "Creating..."
                  : "Create Case"}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 text-xs text-rose-300">
              {error}
            </div>
          )}

          {cases.length ===
          0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-zinc-800 p-5">
              <div className="text-sm text-zinc-300">
                No cases yet.
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-600">
                Create your first case, then attach existing or newly saved analyses.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {cases.map(
                item => (
                  <Link
                    key={
                      item.id
                    }
                    href={`/account/cases/${item.id}`}
                    className="rounded-2xl border border-zinc-800 bg-black/30 p-4 transition hover:border-purple-500/40 hover:bg-purple-500/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-200">
                          {item.name}
                        </div>

                        {item.description && (
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-600">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <span className="shrink-0 rounded-full border border-zinc-800 px-2 py-1 text-[9px] uppercase tracking-wide text-zinc-500">
                        {item.status}
                      </span>
                    </div>
                  </Link>
                )
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
