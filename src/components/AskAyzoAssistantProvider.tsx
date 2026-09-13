"use client";

import {
  createContext,
  FormEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  usePathname,
} from "next/navigation";

import {
  getAskAyzoSuggestedQuestions,
} from "@/lib/account/askAyzoNetworkRegistry";

export type AskAyzoSubjectType =
  | "wallet"
  | "token"
  | "transaction"
  | "entity"
  | "protocol";

export type AskAyzoAnalysisContext = {
  key: string;
  network: string;
  subjectType:
    AskAyzoSubjectType;
  subjectValue: string;
  evidencePayload?:
    unknown;
};

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

type ConversationMessage =
  | {
      id: string;
      role: "user";
      content: string;
    }
  | {
      id: string;
      role: "assistant";
      result: AskResult;
    };

type AssistantContextValue = {
  registerAnalysisContext: (
    value:
      AskAyzoAnalysisContext
  ) => void;

  clearAnalysisContext: (
    key: string
  ) => void;

  openAssistant:
    () => void;
};

const AssistantContext =
  createContext<
    AssistantContextValue | null
  >(null);

const PRODUCT_CONTEXT:
  AskAyzoAnalysisContext = {
  key:
    "ayzo:product",

  network:
    "ayzo",

  subjectType:
    "protocol",

  subjectValue:
    "ayzo-product",

  evidencePayload:
    null,
};

const PRODUCT_QUESTIONS = [
  "Where are Saved Analyses?",
  "What are Entity Labels?",
  "Where are Alerts?",
  "What does Ask AYZO do?",
] as const;

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

  const root =
    body as Record<
      string,
      unknown
    >;

  const candidate =
    root.askAyzo &&
    typeof root.askAyzo ===
      "object"
      ? root.askAyzo
      : root.result &&
        typeof root.result ===
          "object"
        ? root.result
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

function shortSubject(
  value: string
) {
  if (
    value.length <=
    24
  ) {
    return value;
  }

  return (
    `${value.slice(0, 10)}` +
    "..." +
    `${value.slice(-8)}`
  );
}

function newMessageId(
  prefix: string
) {
  return (
    `${prefix}-` +
    `${Date.now()}-` +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}

function recentConversation(
  messages:
    ConversationMessage[]
) {
  return messages
    .slice(-6)
    .map(
      message => {
        if (
          message.role ===
          "user"
        ) {
          return {
            role:
              "user" as const,

            content:
              message.content
                .slice(
                  0,
                  500
                ),
          };
        }

        return {
          role:
            "assistant" as const,

          content:
            (
              message.result
                .answer ??
              ""
            ).slice(
              0,
              700
            ),
        };
      }
    )
    .filter(
      item =>
        item.content
          .trim()
          .length >
        0
    );
}

function ResultCard({
  result,
}: {
  result:
    AskResult;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
      {result.question
        ?.changed &&
        result.question
          .interpreted && (
          <div className="mb-3 text-[10px] leading-5 text-zinc-600">
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

      <div className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">
        {result.answer}
      </div>

      {result.directions && (
        <div className="mt-4 rounded-xl border border-violet-500/10 bg-violet-500/5 px-4 py-3">
          <div className="text-[9px] font-medium tracking-[0.12em] text-violet-400">
            WHERE TO FIND IT
          </div>

          <p className="mt-2 text-xs leading-5 text-zinc-400">
            {
              result
                .directions
            }
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
          <div className="mt-4 border-t border-zinc-900 pt-3">
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
        <p className="mt-4 border-t border-zinc-900 pt-3 text-[10px] leading-5 text-zinc-700">
          {
            result
              .limitation
          }
        </p>
      )}
    </div>
  );
}

function FloatingAssistant({
  activeContext,
  analysisConnected,
  open,
  closeAssistant,
}: {
  activeContext:
    AskAyzoAnalysisContext;

  analysisConnected:
    boolean;

  open:
    boolean;

  closeAssistant:
    () => void;
}) {
  const [
    question,
    setQuestion,
  ] =
    useState("");

  const [
    messages,
    setMessages,
  ] =
    useState<
      ConversationMessage[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(
    () => {
      if (!open) {
        return;
      }

      bottomRef.current
        ?.scrollIntoView({
          behavior:
            "smooth",

          block:
            "end",
        });
    },
    [
      open,
      messages.length,
      loading,
      error,
    ]
  );

  const suggestions =
    analysisConnected
      ? getAskAyzoSuggestedQuestions(
          activeContext.network
        )
      : PRODUCT_QUESTIONS;

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

    const history =
      recentConversation(
        messages
      );

    const userMessage:
      ConversationMessage = {
      id:
        newMessageId(
          "user"
        ),

      role:
        "user",

      content:
        value,
    };

    setMessages(
      current => [
        ...current,
        userMessage,
      ]
    );

    setQuestion("");
    setLoading(true);
    setError("");

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
                network:
                  activeContext.network,

                subjectType:
                  activeContext.subjectType,

                subjectValue:
                  activeContext.subjectValue,

                question:
                  value,

                recentConversation:
                  history,

                evidencePayload:
                  activeContext
                    .evidencePayload ??
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

      setMessages(
        current => [
          ...current,
          {
            id:
              newMessageId(
                "assistant"
              ),

            role:
              "assistant",

            result:
              parsed,
          },
        ]
      );
    } catch {
      setError(
        "Ask AYZO is temporarily unavailable."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <section
      id="ask-ayzo-assistant"
      role="dialog"
      aria-label="Ask AYZO"
      className="fixed bottom-20 left-4 right-4 z-[90] flex max-h-[76vh] min-h-[420px] flex-col overflow-hidden rounded-3xl border border-violet-500/25 bg-zinc-950/95 shadow-2xl shadow-black/70 backdrop-blur-xl sm:left-auto sm:right-6 sm:w-[400px]"
    >
      <header className="shrink-0 border-b border-zinc-900 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-medium tracking-[0.18em] text-violet-400">
              ASK AYZO
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-white">
                {analysisConnected
                  ? "Analysis assistant"
                  : "AYZO assistant"}
              </h3>

              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[8px] font-medium tracking-[0.12em] text-violet-300">
                {analysisConnected
                  ? "ANALYSIS CONNECTED"
                  : "PRODUCT MODE"}
              </span>
            </div>

            {analysisConnected ? (
              <p className="mt-2 truncate text-[10px] text-zinc-600">
                {activeContext.network.toUpperCase()}
                {" · "}
                {activeContext.subjectType.toUpperCase()}
                {" · "}
                {shortSubject(
                  activeContext.subjectValue
                )}
              </p>
            ) : (
              <p className="mt-2 text-[10px] leading-5 text-zinc-600">
                Ask about AYZO features, plans, or where something is located.
              </p>
            )}
          </div>

          <button
            type="button"
            aria-label="Close Ask AYZO"
            onClick={
              closeAssistant
            }
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-800 text-sm text-zinc-500 transition hover:border-zinc-700 hover:text-white"
          >
            ×
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {messages.length ===
          0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions
              .slice(
                0,
                4
              )
              .map(
                item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setQuestion(
                        item
                      )
                    }
                    className="rounded-lg border border-zinc-900 bg-black/30 px-3 py-1.5 text-left text-[10px] leading-4 text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
                  >
                    {item}
                  </button>
                )
              )}
          </div>
        )}

        <div className="space-y-4">
          {messages.map(
            message => {
              if (
                message.role ===
                "user"
              ) {
                return (
                  <div
                    key={
                      message.id
                    }
                    className="flex justify-end"
                  >
                    <div className="max-w-[88%] rounded-2xl rounded-br-md border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm leading-6 text-zinc-200">
                      {
                        message
                          .content
                      }
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={
                    message.id
                  }
                >
                  <ResultCard
                    result={
                      message.result
                    }
                  />
                </div>
              );
            }
          )}

          {loading && (
            <div className="rounded-2xl border border-zinc-900 bg-black/20 px-4 py-3 text-xs text-zinc-500">
              Ask AYZO is analyzing the connected evidence…
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-amber-300">
              {error}
            </div>
          )}

          <div
            ref={
              bottomRef
            }
            aria-hidden="true"
          />
        </div>
      </div>

      <form
        onSubmit={ask}
        className="shrink-0 border-t border-zinc-900 bg-zinc-950/95 p-4"
      >
        <div className="flex gap-2">
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
            placeholder={
              analysisConnected
                ? "Ask a follow-up about this analysis..."
                : "Ask about AYZO..."
            }
            className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-800 bg-black/50 px-4 text-sm text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-violet-500"
          />

          <button
            type="submit"
            disabled={
              loading ||
              !question.trim()
            }
            className="h-11 shrink-0 rounded-xl border border-violet-500/20 bg-violet-500/10 px-5 text-sm font-medium text-violet-200 transition hover:border-violet-400/40 hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading
              ? "..."
              : "Ask"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function useAskAyzoAssistant() {
  const value =
    useContext(
      AssistantContext
    );

  if (!value) {
    throw new Error(
      "useAskAyzoAssistant must be used inside AskAyzoAssistantProvider."
    );
  }

  return value;
}

export default function AskAyzoAssistantProvider({
  children,
}: {
  children:
    ReactNode;
}) {
  const pathname =
    usePathname();

  const [
    analysisContext,
    setAnalysisContext,
  ] =
    useState<
      AskAyzoAnalysisContext | null
    >(null);

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const registerAnalysisContext =
    useCallback(
      (
        value:
          AskAyzoAnalysisContext
      ) => {
        setAnalysisContext(
          current => {
            if (
              current?.key ===
                value.key &&
              current.network ===
                value.network &&
              current.subjectType ===
                value.subjectType &&
              current.subjectValue ===
                value.subjectValue &&
              current.evidencePayload ===
                value.evidencePayload
            ) {
              return current;
            }

            return value;
          }
        );
      },
      []
    );

  const clearAnalysisContext =
    useCallback(
      (
        key:
          string
      ) => {
        setAnalysisContext(
          current =>
            current?.key ===
            key
              ? null
              : current
        );
      },
      []
    );

  const openAssistant =
    useCallback(
      () => {
        setOpen(true);
      },
      []
    );

  const contextValue =
    useMemo(
      () => ({
        registerAnalysisContext,
        clearAnalysisContext,
        openAssistant,
      }),
      [
        registerAnalysisContext,
        clearAnalysisContext,
        openAssistant,
      ]
    );

  const activeContext =
    analysisContext ??
    PRODUCT_CONTEXT;

  const analysisConnected =
    analysisContext !==
    null;

  const hiddenRoute =
    pathname ===
      "/login" ||
    pathname.startsWith(
      "/auth/"
    );

  return (
    <AssistantContext.Provider
      value={
        contextValue
      }
    >
      {children}

      {!hiddenRoute && (
        <>
          <FloatingAssistant
            key={
              activeContext.key
            }
            activeContext={
              activeContext
            }
            analysisConnected={
              analysisConnected
            }
            open={
              open
            }
            closeAssistant={() =>
              setOpen(false)
            }
          />

          <button
            type="button"
            onClick={() =>
              setOpen(
                value =>
                  !value
              )
            }
            aria-expanded={
              open
            }
            aria-controls="ask-ayzo-assistant"
            className="fixed bottom-5 right-5 z-[91] flex h-12 items-center gap-2 rounded-full border border-violet-500/30 bg-zinc-950/95 px-4 text-sm font-semibold text-white shadow-xl shadow-black/50 backdrop-blur-xl transition hover:border-violet-400/50 hover:bg-zinc-900 sm:right-6"
          >
            <span
              aria-hidden="true"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/15 text-xs text-violet-300"
            >
              ✦
            </span>

            <span>
              Ask AYZO
            </span>

            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${
                analysisConnected
                  ? "bg-emerald-400"
                  : "bg-violet-400"
              }`}
            />
          </button>
        </>
      )}
    </AssistantContext.Provider>
  );
}
