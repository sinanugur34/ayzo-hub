import {
  CapacitorHttp,
} from "@capacitor/core";

import {
  getMobileAuthHeaders,
  MOBILE_API_BASE_URL,
} from "./mobileSession";

export type MobileAskAyzoTurn = {
  role:
    | "user"
    | "assistant";

  content:
    string;
};

export type MobileAskAyzoResult = {
  answer: string;
  status: string;
  confidence: string;
  evidence:
    readonly string[];
  caveats:
    readonly string[];
  limitation: string;
};

export async function askMobileAyzo({
  network,
  subjectValue,
  question,
  evidencePayload,
  recentConversation,
}: {
  network: string;
  subjectValue: string;
  question: string;
  evidencePayload: unknown;
  recentConversation:
    readonly MobileAskAyzoTurn[];
}): Promise<MobileAskAyzoResult> {
  const headers =
    await getMobileAuthHeaders();

  const response =
    await CapacitorHttp.request({
      url:
        `${MOBILE_API_BASE_URL}/api/mobile/ask-ayzo`,
      method:
        "POST",
      headers: {
        ...headers,
        "Content-Type":
          "application/json",
      },
      data: {
        network,
        subjectType:
          "entity",
        subjectValue,
        question,
        evidencePayload,
        recentConversation:
          recentConversation
            .slice(-6),
      },
    });

  const body =
    response.data;

  if (
    response.status < 200 ||
    response.status >= 300 ||
    !body?.ok ||
    typeof body?.askAyzo
      ?.answer !==
      "string"
  ) {
    throw new Error(
      body?.error ??
      "Ask AYZO is temporarily unavailable."
    );
  }

  const result =
    body.askAyzo;

  return {
    answer:
      result.answer,

    status:
      typeof result.status ===
        "string"
        ? result.status
        : "answered",

    confidence:
      typeof result.confidence ===
        "string"
        ? result.confidence
        : "low",

    evidence:
      Array.isArray(
        result.evidence
      )
        ? result.evidence.filter(
            (
              item: unknown
            ): item is string =>
              typeof item ===
                "string"
          )
        : [],

    caveats:
      Array.isArray(
        result.caveats
      )
        ? result.caveats.filter(
            (
              item: unknown
            ): item is string =>
              typeof item ===
                "string"
          )
        : [],

    limitation:
      typeof result.limitation ===
        "string"
        ? result.limitation
        : "",
  };
}
