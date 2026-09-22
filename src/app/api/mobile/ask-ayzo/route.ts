import {
  authenticateMobileRequest,
} from "@/lib/account/mobileRequestAuth";

import {
  getMobileEntitlement,
} from "@/lib/account/mobileEntitlement";

import {
  routeAskAyzoQuestion,
} from "@/lib/account/askAyzoRouter";

import {
  answerAskAyzoSemantically,
  isAskAyzoSemanticEnabled,
} from "@/lib/account/askAyzoSemantic";

import {
  isRecord,
  readRequiredString,
  readSubjectType,
  requestTooLarge,
} from "@/lib/account/validation";

import {
  planHasFeature,
} from "@/lib/plans/registry";

import {
  checkRateLimit,
} from "@/lib/rateLimit";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type AskAyzoConversationTurn = {
  role:
    | "user"
    | "assistant";

  content:
    string;
};

function json(
  body: unknown,
  status = 200
) {
  return Response.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

function readRecentConversation(
  value: unknown
): AskAyzoConversationTurn[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const turns:
    AskAyzoConversationTurn[] =
    [];

  for (
    const item
    of value.slice(-6)
  ) {
    if (!isRecord(item)) {
      continue;
    }

    const role =
      item.role;

    const content =
      typeof item.content ===
        "string"
        ? item.content
            .replace(
              /[\u0000-\u001F\u007F]/g,
              " "
            )
            .replace(
              /\s+/g,
              " "
            )
            .trim()
            .slice(
              0,
              700
            )
        : "";

    if (
      (
        role !== "user" &&
        role !== "assistant"
      ) ||
      !content
    ) {
      continue;
    }

    turns.push({
      role,
      content,
    });
  }

  return turns;
}

function isShortFollowUp({
  question,
  recentConversation,
}: {
  question: string;
  recentConversation:
    readonly AskAyzoConversationTurn[];
}) {
  if (
    recentConversation.length === 0
  ) {
    return false;
  }

  const normalized =
    question
      .toLocaleLowerCase(
        "tr-TR"
      )
      .replace(
        /[?!.,;:]+/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  if (
    !normalized ||
    normalized.length > 120
  ) {
    return false;
  }

  const markers = [
    "peki",
    "neden",
    "niye",
    "bunun",
    "bu neden",
    "bu ne demek",
    "bu ne anlama geliyor",
    "o zaman",
    "neden olabilir",
    "why",
    "how so",
    "what about",
    "what does that mean",
    "and why",
    "so why",
  ] as const;

  return markers.some(
    marker =>
      normalized === marker ||
      normalized.startsWith(
        `${marker} `
      ) ||
      normalized.includes(
        ` ${marker} `
      )
  );
}

async function semanticAllowed(
  userId: string
) {
  try {
    const [
      userBurst,
      userDaily,
      globalBurst,
      globalDaily,
    ] =
      await Promise.all([
        checkRateLimit({
          key:
            `ask-ayzo:semantic:user:${userId}:burst`,
          limit: 8,
          windowMs: 60_000,
        }),

        checkRateLimit({
          key:
            `ask-ayzo:semantic:user:${userId}:daily`,
          limit: 100,
          windowMs:
            86_400_000,
        }),

        checkRateLimit({
          key:
            "ask-ayzo:semantic:global:burst",
          limit: 24,
          windowMs: 60_000,
        }),

        checkRateLimit({
          key:
            "ask-ayzo:semantic:global:daily",
          limit: 800,
          windowMs:
            86_400_000,
        }),
      ]);

    return (
      userBurst.allowed &&
      userDaily.allowed &&
      globalBurst.allowed &&
      globalDaily.allowed
    );
  } catch {
    return true;
  }
}

export async function POST(
  request: Request
) {
  if (
    requestTooLarge(
      request
    )
  ) {
    return json(
      {
        ok: false,
        error:
          "Request too large.",
      },
      413
    );
  }

  const auth =
    await authenticateMobileRequest(
      request
    );

  if (!auth.ok) {
    return json(
      {
        ok: false,
        code:
          auth.code,
        error:
          auth.error,
      },
      auth.status
    );
  }

  const {
    entitlement,
  } =
    await getMobileEntitlement(
      auth.identity.userId
    );

  if (
    !planHasFeature(
      entitlement.planId,
      "askAyzo"
    )
  ) {
    return json(
      {
        ok: false,
        code:
          "PLAN_REQUIRED",
        error:
          "Ask AYZO requires AYZO Pro or Advanced.",
      },
      403
    );
  }

  const body =
    await request
      .json()
      .catch(
        () => null
      );

  if (!isRecord(body)) {
    return json(
      {
        ok: false,
        error:
          "Invalid request.",
      },
      400
    );
  }

  const network =
    readRequiredString(
      body.network,
      64
    );

  const subjectType =
    readSubjectType(
      body.subjectType
    );

  const subjectValue =
    readRequiredString(
      body.subjectValue,
      512
    );

  const question =
    readRequiredString(
      body.question,
      280
    );

  const recentConversation =
    readRecentConversation(
      body.recentConversation
    );

  if (
    !network ||
    !subjectType ||
    !subjectValue ||
    !question
  ) {
    return json(
      {
        ok: false,
        error:
          "Invalid Ask AYZO fields.",
      },
      400
    );
  }

  const deterministic =
    routeAskAyzoQuestion({
      network,
      subjectType,
      subjectValue,
      question,
      evidencePayload:
        body.evidencePayload,
    });

  let result =
    deterministic;

  const followUp =
    isShortFollowUp({
      question,
      recentConversation,
    });

  const semanticEligible =
    deterministic.intent !==
      "financial-advice" &&
    (
      followUp ||
      (
        deterministic.mode !==
          "site-help" &&
        deterministic.mode !==
          "product-help"
      )
    );

  if (
    semanticEligible &&
    isAskAyzoSemanticEnabled() &&
    await semanticAllowed(
      auth.identity.userId
    )
  ) {
    const semantic =
      await answerAskAyzoSemantically({
        network,
        subjectType,
        subjectValue,
        question,
        recentConversation,
        evidencePayload:
          body.evidencePayload,
        fallback:
          deterministic,
      });

    if (semantic) {
      result =
        semantic;
    }
  }

  return json({
    ok: true,
    askAyzo:
      result,
  });
}
