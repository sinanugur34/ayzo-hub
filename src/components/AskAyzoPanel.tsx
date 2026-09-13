"use client";

import {
  FormEvent,
  useState,
} from "react";

type SubjectType =
  | "wallet"
  | "token"
  | "transaction"
  | "entity"
  | "protocol";

type AskResult = {
  mode?: string;
  status?: string;
  intent?: string;
  answer?: string;
  confidence?: string;

  evidence?:
    readonly string[];

  caveats?:
    readonly string[];

  directions?:
    string | null;

  limitation?:
    string;

  question?: {
    original?: string;
    interpreted?: string;
    changed?: boolean;
  };
};

type Props = {
  network: string;

  subjectType:
    SubjectType;

  subjectValue:
    string;

  evidencePayload?:
    unknown;
};

function extractResult(
  body: unknown
): AskResult | null {
  if (
    !body ||
    typeof body !==
      "object"
  ) {
    return null;
  }

  const record =
    body as Record<
      string,
      unknown
    >;

  const candidate =
    record.result &&
    typeof record.result ===
      "object"
      ? record.result
      : body;

  if (
    !candidate ||
    typeof candidate !==
      "object"
  ) {
    return null;
  }

  return candidate as
    AskResult;
}

export default function AskAyzoPanel({
  network,
  subjectType,
  subjectValue,
  evidencePayload,
}: Props) {
  const [
    question,
    setQuestion,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    result,
    setResult,
  ] =
    useState<AskResult | null>(
      null
    );

  const [
    error,
    setError,
  ] =
    useState("");

  async function ask(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const value =
      question.trim();

    if (
      !value ||
      loading
    ) {
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/account/ask-ayzo",
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

                question:
                  value,

                evidencePayload:
                  evidencePayload ??
                  null,
              }),
          }
        );

      const body:
        unknown =
          await response
            .json()
            .catch(
              () => null
            );

      if (
        response.status ===
        401
      ) {
        setError(
          "Sign in to use Ask AYZO."
        );

        return;
      }

      if (
        response.status ===
        403
      ) {
        setError(
          "Ask AYZO is available on Pro and Advanced plans."
        );

        return;
      }

      if (!response.ok) {
        const candidate =
          body &&
          typeof body ===
            "object" &&
          "error" in body
            ? (
                body as {
                  error?: unknown;
                }
              ).error
            : null;

        setError(
          typeof candidate ===
            "string"
            ? candidate
            : "Ask AYZO is temporarily unavailable."
        );

        return;
      }

      const parsed =
        extractResult(
          body
        );

      if (
        !parsed ||
        typeof parsed.answer !==
          "string"
      ) {
        setError(
          "Ask AYZO returned an unexpected response."
        );

        return;
      }

      setResult(
        parsed
      );
    } catch {
      setError(
        "Ask AYZO is temporarily unavailable."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-medium tracking-[0.16em] text-violet-400">
            ASK AYZO
          </div>

          <h4 className="mt-2 text-base font-semibold text-zinc-100">
            Ask about this evidence
          </h4>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
            Ask about the current analysis, AYZO features, or where something is located in the app.
          </p>
        </div>

        <span className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1 text-[9px] font-medium tracking-[0.12em] text-zinc-500">
          EVIDENCE GROUNDED
        </span>
      </div>

      <form
        onSubmit={ask}
        className="mt-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            maxLength={280}
            value={question}
            onChange={
              event =>
                setQuestion(
                  event.target.value
                )
            }
            placeholder="e.g. who deplyd ths contrct?"
            className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-800 bg-black/40 px-4 text-sm text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-violet-500"
          />

          <button
            type="submit"
            disabled={
              loading ||
              !question.trim()
            }
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Asking..."
              : "Ask AYZO"}
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {[
            "What are the most important findings?",
            "Is there shared funding evidence?",
            "Who deployed this contract?",
          ].map(
            item => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setQuestion(
                    item
                  )
                }
                className="rounded-lg border border-zinc-900 bg-black/30 px-3 py-1.5 text-[10px] text-zinc-600 transition hover:border-zinc-800 hover:text-zinc-400"
              >
                {item}
              </button>
            )
          )}
        </div>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-amber-300">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/30 p-5">
          {result.question
            ?.changed &&
            result.question
              .interpreted && (
              <div className="mb-4 text-[10px] leading-5 text-zinc-600">
                Interpreted as:{" "}
                <span className="text-zinc-400">
                  {
                    result
                      .question
                      .interpreted
                  }
                </span>
              </div>
            )}

          <div className="text-sm leading-6 text-zinc-200">
            {result.answer}
          </div>

          {result.directions && (
            <div className="mt-4 rounded-xl border border-violet-500/10 bg-violet-500/5 px-4 py-3">
              <div className="text-[9px] font-medium tracking-[0.12em] text-violet-400">
                WHERE TO FIND IT
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-400">
                {result.directions}
              </p>
            </div>
          )}

          {Array.isArray(
            result.evidence
          ) &&
            result.evidence
              .length >
              0 && (
              <div className="mt-4">
                <div className="text-[9px] font-medium tracking-[0.12em] text-zinc-600">
                  EVIDENCE
                </div>

                <div className="mt-2 space-y-1.5">
                  {result.evidence
                    .slice(
                      0,
                      6
                    )
                    .map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={`${index}-${item}`}
                          className="text-xs leading-5 text-zinc-500"
                        >
                          • {item}
                        </div>
                      )
                    )}
                </div>
              </div>
            )}

          {Array.isArray(
            result.caveats
          ) &&
            result.caveats
              .length >
              0 && (
              <div className="mt-4 border-t border-zinc-900 pt-4">
                {result.caveats
                  .slice(
                    0,
                    4
                  )
                  .map(
                    (
                      item,
                      index
                    ) => (
                      <p
                        key={`${index}-${item}`}
                        className="mt-1 text-[10px] leading-5 text-zinc-600"
                      >
                        {item}
                      </p>
                    )
                  )}
              </div>
            )}

          {result.limitation && (
            <p className="mt-4 border-t border-zinc-900 pt-4 text-[10px] leading-5 text-zinc-700">
              {result.limitation}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
