import {
  buildAskAyzoAnswer,
  type AskAyzoConfidence,
  type AskAyzoResult,
} from "@/lib/account/askAyzo";

import {
  normalizeAskAyzoQuestion,
} from "@/lib/account/askAyzoNormalize";

import {
  ASK_AYZO_SITE_KNOWLEDGE,
  type AskAyzoSiteKnowledgeEntry,
} from "@/lib/account/askAyzoSiteKnowledge";

export type AskAyzoMode =
  | "evidence"
  | "site-help"
  | "product-help"
  | "help";

export type AskAyzoRouterResult = {
  version: 1;

  mode:
    AskAyzoMode;

  question: {
    original: string;
    interpreted: string;
    changed: boolean;
  };

  status:
    AskAyzoResult["status"];

  intent:
    AskAyzoResult["intent"] |
    "site-help" |
    "product-help" |
    "help";

  answer: string;

  confidence:
    AskAyzoConfidence;

  evidence:
    readonly string[];

  caveats:
    readonly string[];

  directions:
    string | null;

  limitation:
    string;
};

type RouteInput = {
  network: string;
  subjectType: string;
  subjectValue: string;
  question: string;
  evidencePayload: unknown;
};

const NAVIGATION_TERMS =
[
  "where",
  "how do i get",
  "how do i find",
  "how to find",
  "how to open",
  "where is",
  "where are",
  "navigate",
  "go to",
  "find",

  "nerede",
  "nerden",
  "nereden",
  "nereye",
  "nasıl giderim",
  "nasıl bulurum",
  "nasıl açarım",
  "nasıl ulaşırım",
];

const PRODUCT_TERMS =
[
  "what is",
  "what does",
  "how does",
  "explain",
  "feature",
  "features",
  "available",
  "included",
  "plan",

  "nedir",
  "ne işe yarar",
  "özellik",
  "özellikler",
  "anlat",
  "açıkla",
];

function includesAny(
  value: string,
  terms:
    readonly string[]
) {
  return terms.some(
    term =>
      value.includes(
        term
      )
  );
}

function siteKnowledgeScore(
  entry:
    AskAyzoSiteKnowledgeEntry,
  searchText: string
) {
  let score =
    0;

  for (
    const keyword
    of entry.keywords
  ) {
    const normalizedKeyword =
      keyword.toLocaleLowerCase(
        "en-US"
      );

    if (
      searchText ===
      normalizedKeyword
    ) {
      score +=
        100 +
        normalizedKeyword.length;

      continue;
    }

    if (
      searchText.includes(
        normalizedKeyword
      )
    ) {
      score +=
        20 +
        normalizedKeyword.length;
    }
  }

  const title =
    entry.title
      .toLocaleLowerCase(
        "en-US"
      );

  if (
    searchText.includes(
      title
    )
  ) {
    score +=
      30 +
      title.length;
  }

  return score;
}

function bestSiteKnowledge(
  searchText: string
) {
  const ranked =
    ASK_AYZO_SITE_KNOWLEDGE
      .map(
        entry => ({
          entry,
          score:
            siteKnowledgeScore(
              entry,
              searchText
            ),
        })
      )
      .filter(
        row =>
          row.score > 0
      )
      .sort(
        (
          a,
          b
        ) =>
          b.score -
          a.score
      );

  return (
    ranked[0]?.entry ??
    null
  );
}

function siteAnswer(
  entry:
    AskAyzoSiteKnowledgeEntry,
  mode:
    "site-help" |
    "product-help",
  original: string,
  interpreted: string,
  changed: boolean
): AskAyzoRouterResult {
  const answer =
    mode ===
      "site-help"
      ? entry.directions
      : entry.description;

  return {
    version: 1,

    mode,

    question: {
      original,
      interpreted,
      changed,
    },

    status:
      "answered",

    intent:
      mode,

    answer,

    confidence:
      "high",

    evidence: [
      `AYZO product area: ${entry.title}.`,
    ],

    caveats: [],

    directions:
      mode ===
        "product-help"
        ? entry.directions
        : null,

    limitation:
      "Site guidance is generated from AYZO's build-verified product map. Ask AYZO describes where to go but does not automatically navigate or change the application state.",
  };
}

function genericHelp(
  original: string,
  interpreted: string,
  changed: boolean
): AskAyzoRouterResult {
  return {
    version: 1,

    mode:
      "help",

    question: {
      original,
      interpreted,
      changed,
    },

    status:
      "unsupported-question",

    intent:
      "help",

    answer:
      "I can explain the current AYZO analysis, holder concentration, wallet relationships, funding evidence, Solana authorities, EVM deployment and developer history. I can also explain AYZO features or tell you where Saved Analyses, Watchlists, Alerts, Entity Labels, Historical Changes and Investigation Timeline are located.",

    confidence:
      "high",

    evidence: [],

    caveats: [],

    directions:
      null,

    limitation:
      "Ask AYZO does not guess when a question cannot be mapped to available evidence or the verified AYZO product map.",
  };
}

export function routeAskAyzoQuestion({
  network,
  subjectType,
  subjectValue,
  question,
  evidencePayload,
}: RouteInput): AskAyzoRouterResult {
  const normalized =
    normalizeAskAyzoQuestion(
      question
    );

  const evidenceAnswer =
    buildAskAyzoAnswer({
      network,
      subjectType,
      subjectValue,

      question:
        normalized.normalized,

      evidencePayload,
    });

  /*
   * Financial-advice refusals and
   * successfully evidence-grounded
   * answers always take precedence
   * over product/site matching.
   */
  if (
    evidenceAnswer.intent ===
      "financial-advice" ||
    evidenceAnswer.status ===
      "answered" ||
    evidenceAnswer.status ===
      "insufficient-evidence"
  ) {
    return {
      version: 1,

      mode:
        "evidence",

      question: {
        original:
          normalized.original,

        interpreted:
          normalized.normalized,

        changed:
          normalized.changed,
      },

      status:
        evidenceAnswer.status,

      intent:
        evidenceAnswer.intent,

      answer:
        evidenceAnswer.answer,

      confidence:
        evidenceAnswer.confidence,

      evidence:
        evidenceAnswer.evidence,

      caveats:
        evidenceAnswer.caveats,

      directions:
        null,

      limitation:
        evidenceAnswer.limitation,
    };
  }

  const site =
    bestSiteKnowledge(
      normalized.searchText
    );

  if (site) {
    const navigation =
      includesAny(
        normalized.searchText,
        NAVIGATION_TERMS
      );

    const product =
      includesAny(
        normalized.searchText,
        PRODUCT_TERMS
      );

    const mode:
      "site-help" |
      "product-help" =
        navigation &&
        !product
          ? "site-help"
          : "product-help";

    return siteAnswer(
      site,
      mode,
      normalized.original,
      normalized.normalized,
      normalized.changed
    );
  }

  return genericHelp(
    normalized.original,
    normalized.normalized,
    normalized.changed
  );
}
