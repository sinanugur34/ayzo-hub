import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

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
  getServerEntitlement,
} from "@/lib/billing/entitlement";

import {
  planHasFeature,
} from "@/lib/plans/registry";

import {
  checkRateLimit,
} from "@/lib/rateLimit";

export const dynamic =
  "force-dynamic";

function noStoreJson(
  body: unknown,
  status = 200
) {
  return NextResponse.json(
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

function isShortConversationalFollowUp({
  question,
  recentConversation,
}: {
  question: string;
  recentConversation:
    readonly AskAyzoConversationTurn[];
}) {
  if (
    recentConversation.length ===
      0
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
    normalized.length >
      120
  ) {
    return false;
  }

  const markers = [
    "peki",
    "neden",
    "niye",
    "bunun",
    "bunun nedeni",
    "bu neden",
    "bu ne anlama geliyor",
    "bu ne demek",
    "o zaman",
    "peki ya",
    "peki bunun",
    "neden olabilir",
    "why",
    "why is that",
    "how so",
    "what about",
    "what does that mean",
    "and why",
    "so why",
    "then why",
  ] as const;

  return markers.some(
    marker =>
      normalized ===
        marker ||
      normalized.startsWith(
        `${marker} `
      ) ||
      normalized.includes(
        ` ${marker} `
      )
  );
}

function unresolvedFollowUpResult({
  deterministicResult,
}: {
  deterministicResult:
    ReturnType<
      typeof routeAskAyzoQuestion
    >;
}) {
  return {
    ...deterministicResult,

    mode:
      "evidence" as const,

    status:
      "insufficient-evidence" as const,

    answer:
      "Ask AYZO could not ground this follow-up reliably from the current bounded evidence. The previous conversation was preserved, but no unsupported explanation was generated.",

    confidence:
      "low" as const,

    evidence:
      [] as readonly string[],

    caveats: [
      "A short follow-up was recognized, but the semantic reasoning layer did not return a verifiable evidence-grounded answer.",
    ],

    directions:
      null,

    limitation:
      "Ask AYZO does not replace a failed semantic follow-up with an unrelated product-help answer or an uncited factual conclusion.",
  };
}

async function canUseAskAyzoSemantic(
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
          limit:
            8,
          windowMs:
            60_000,
        }),

        checkRateLimit({
          key:
            `ask-ayzo:semantic:user:${userId}:daily`,
          limit:
            100,
          windowMs:
            86_400_000,
        }),

        checkRateLimit({
          key:
            "ask-ayzo:semantic:global:burst",
          limit:
            24,
          windowMs:
            60_000,
        }),

        checkRateLimit({
          key:
            "ask-ayzo:semantic:global:daily",
          limit:
            800,
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
    /*
     * Rate-limit infrastructure
     * must not take Ask AYZO
     * offline. Provider-level
     * failures still fall back
     * to the deterministic engine.
     */
    return true;
  }
}

type AskAyzoConversationTurn = {
  role:
    | "user"
    | "assistant";

  content:
    string;
};

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
        role !==
          "user" &&
        role !==
          "assistant"
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

export async function POST(
  request: Request
) {
  if (
    requestTooLarge(
      request
    )
  ) {
    return noStoreJson(
      {
        error:
          "Request too large.",
      },
      413
    );
  }

  const {
    userId,
  } =
    await getAuthenticatedAccountContext();

  if (!userId) {
    return noStoreJson(
      {
        error:
          "Unauthorized",
      },
      401
    );
  }

  const {
    entitlement,
  } =
    await getServerEntitlement();

  if (
    !planHasFeature(
      entitlement.planId,
      "askAyzo"
    )
  ) {
    return noStoreJson(
      {
        error:
          "Ask AYZO requires AYZO Pro or Advanced.",

        code:
          "PLAN_REQUIRED",
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
    return noStoreJson(
      {
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
    return noStoreJson(
      {
        error:
          "Invalid Ask AYZO fields.",
      },
      400
    );
  }

  const deterministicResult =
    routeAskAyzoQuestion({
      network,
      subjectType,
      subjectValue,
      question,
      evidencePayload:
        body.evidencePayload,
    });

  let result =
    deterministicResult;

  const shortFollowUp =
    isShortConversationalFollowUp({
      question,
      recentConversation,
    });

  const semanticEligible =
    network !==
      "ayzo" &&
    deterministicResult.intent !==
      "financial-advice" &&
    (
      shortFollowUp ||
      (
        deterministicResult.mode !==
          "site-help" &&
        deterministicResult.mode !==
          "product-help"
      )
    );

  const semanticAllowed =
    semanticEligible &&
    isAskAyzoSemanticEnabled()
      ? await canUseAskAyzoSemantic(
          userId
        )
      : false;

  if (
    semanticEligible &&
    semanticAllowed &&
    isAskAyzoSemanticEnabled()
  ) {
    const semanticResult =
      await answerAskAyzoSemantically({
        network,
        subjectType,
        subjectValue,
        question,
        recentConversation,
        evidencePayload:
          body.evidencePayload,
        fallback:
          deterministicResult,
      });

    if (semanticResult) {
      result =
        semanticResult;
    } else if (
      shortFollowUp
    ) {
      /*
       * One bounded retry is allowed
       * only for short conversational
       * follow-ups. This protects the
       * UX from transient provider /
       * schema failures without
       * doubling normal Groq usage.
       */
      const retryResult =
        await answerAskAyzoSemantically({
          network,
          subjectType,
          subjectValue,
          question,
          recentConversation,
          evidencePayload:
            body.evidencePayload,
          fallback:
            deterministicResult,
        });

      result =
        retryResult ??
        unresolvedFollowUpResult({
          deterministicResult,
        });
    }
  }

  return noStoreJson({
    ok: true,
    askAyzo:
      result,
  });
}
