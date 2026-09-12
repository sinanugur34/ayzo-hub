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

type Confidence =
  | "high"
  | "medium"
  | "low";

type Label = {
  id: string;
  address: string;
  label: string;
  category: string;
  confidence:
    Confidence;
  source: string;
  evidence: string;
  caveat:
    string | null;
};

type LabelsResult = {
  status:
    | "ready"
    | "no-evidence"
    | "unsupported";

  labels:
    Label[];

  limitation:
    string;
};

type Props = {
  network: string;

  subjectType:
    SubjectType;

  subjectValue:
    string;

  evidencePayload:
    unknown;
};

type State =
  | "loading"
  | "locked"
  | "ready"
  | "empty"
  | "unsupported"
  | "error";

function short(
  value: string
) {
  if (value.length <= 20) {
    return value;
  }

  return (
    `${value.slice(0, 8)}` +
    `...` +
    `${value.slice(-6)}`
  );
}

function isConfidence(
  value: unknown
): value is Confidence {
  return (
    value === "high" ||
    value === "medium" ||
    value === "low"
  );
}

function parseLabel(
  value: unknown
): Label | null {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return null;
  }

  const row =
    value as Record<
      string,
      unknown
    >;

  if (
    typeof row.id !==
      "string" ||
    typeof row.address !==
      "string" ||
    typeof row.label !==
      "string" ||
    typeof row.category !==
      "string" ||
    !isConfidence(
      row.confidence
    ) ||
    typeof row.source !==
      "string" ||
    typeof row.evidence !==
      "string"
  ) {
    return null;
  }

  return {
    id:
      row.id,

    address:
      row.address,

    label:
      row.label,

    category:
      row.category,

    confidence:
      row.confidence,

    source:
      row.source,

    evidence:
      row.evidence,

    caveat:
      typeof row.caveat ===
        "string"
        ? row.caveat
        : null,
  };
}

function confidenceClass(
  value: Confidence
) {
  switch (value) {
    case "high":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

    case "medium":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";

    case "low":
      return "border-zinc-700 bg-zinc-900 text-zinc-400";
  }
}

export default function AyzoEntityLabelsPanel({
  network,
  subjectType,
  subjectValue,
  evidencePayload,
}: Props) {
  const [
    state,
    setState,
  ] =
    useState<State>(
      "loading"
    );

  const [
    result,
    setResult,
  ] =
    useState<LabelsResult | null>(
      null
    );

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      setState(
        "loading"
      );

      setResult(
        null
      );

      try {
        const response =
          await fetch(
            "/api/account/entity-labels",
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
                  evidencePayload,
                }),
            }
          );

        if (cancelled) {
          return;
        }

        if (
          response.status ===
          403
        ) {
          setState(
            "locked"
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
          typeof body
            ?.entityLabels !==
            "object" ||
          body.entityLabels ===
            null
        ) {
          setState(
            "error"
          );

          return;
        }

        const raw =
          body.entityLabels as Record<
            string,
            unknown
          >;

        const labels =
          Array.isArray(
            raw.labels
          )
            ? raw.labels
                .map(
                  parseLabel
                )
                .filter(
                  (
                    item
                  ): item is Label =>
                    item !==
                    null
                )
            : [];

        const limitation =
          typeof raw
            .limitation ===
            "string"
            ? raw.limitation
            : "AYZO Entity Labels are bounded to available evidence.";

        const status =
          raw.status;

        setResult({
          status:
            status ===
              "ready" ||
            status ===
              "unsupported"
              ? status
              : "no-evidence",

          labels,

          limitation,
        });

        if (
          status ===
          "unsupported"
        ) {
          setState(
            "unsupported"
          );
        } else if (
          labels.length ===
          0
        ) {
          setState(
            "empty"
          );
        } else {
          setState(
            "ready"
          );
        }
      } catch {
        if (!cancelled) {
          setState(
            "error"
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
    evidencePayload,
  ]);

  if (
    state ===
    "loading"
  ) {
    return (
      <div className="mt-5 rounded-2xl border border-zinc-800 bg-black/30 p-4">
        <div className="text-[10px] font-medium tracking-[0.16em] text-violet-400">
          PRO · AYZO ENTITY LABELS
        </div>

        <div className="mt-2 text-xs text-zinc-600">
          Resolving evidence-backed on-chain roles...
        </div>
      </div>
    );
  }

  if (
    state ===
    "locked"
  ) {
    return (
      <div className="mt-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
        <div className="text-[10px] font-medium tracking-[0.16em] text-violet-400">
          PRO + ADVANCED · ENTITY LABELS
        </div>

        <div className="mt-2 text-sm font-medium text-zinc-200">
          Evidence-backed entity roles
        </div>

        <p className="mt-2 text-xs leading-5 text-zinc-500">
          AYZO Entity Labels are available with Pro and Advanced.
          Personal labels and private notes remain separate.
        </p>
      </div>
    );
  }

  if (
    state ===
    "unsupported"
  ) {
    return null;
  }

  if (
    state ===
    "error"
  ) {
    return (
      <div className="mt-5 rounded-2xl border border-zinc-900 bg-black/20 p-4">
        <div className="text-[10px] font-medium tracking-[0.16em] text-zinc-600">
          AYZO ENTITY LABELS
        </div>

        <div className="mt-2 text-xs text-zinc-600">
          Entity label evidence is temporarily unavailable.
        </div>
      </div>
    );
  }

  if (
    state ===
      "empty" ||
    !result
  ) {
    return (
      <div className="mt-5 rounded-2xl border border-zinc-800 bg-black/30 p-4">
        <div className="text-[10px] font-medium tracking-[0.16em] text-violet-400">
          PRO · AYZO ENTITY LABELS
        </div>

        <div className="mt-2 text-sm font-medium text-zinc-200">
          No evidence-backed role resolved
        </div>

        <p className="mt-2 text-xs leading-5 text-zinc-600">
          AYZO did not attach an entity role from the bounded evidence
          available in this analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-medium tracking-[0.16em] text-violet-400">
            PRO · AYZO ENTITY LABELS
          </div>

          <h4 className="mt-2 text-sm font-semibold text-zinc-100">
            Evidence-backed on-chain roles
          </h4>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
            AYZO labels roles only when supported by deterministic or
            observed on-chain evidence.
          </p>
        </div>

        <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-medium text-violet-300">
          {result.labels.length} LABEL
          {result.labels.length === 1
            ? ""
            : "S"}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {result.labels.map(
          label => (
            <div
              key={label.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-200">
                    {label.label}
                  </div>

                  <div className="mt-1 break-all font-mono text-[10px] text-zinc-600">
                    {short(
                      label.address
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[9px] uppercase tracking-wide text-zinc-400">
                    {label.category}
                  </span>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-wide ${confidenceClass(
                      label.confidence
                    )}`}
                  >
                    {label.confidence}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-zinc-400">
                {label.evidence}
              </p>

              <div className="mt-3 text-[10px] uppercase tracking-[0.12em] text-zinc-700">
                SOURCE · {label.source}
              </div>

              {label.caveat && (
                <p className="mt-3 border-t border-zinc-900 pt-3 text-[11px] leading-5 text-zinc-600">
                  {label.caveat}
                </p>
              )}
            </div>
          )
        )}
      </div>

      <p className="mt-4 text-[10px] leading-5 text-zinc-700">
        {result.limitation}
      </p>
    </div>
  );
}
