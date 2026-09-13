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

  const semanticEligible =
    network !==
      "ayzo" &&
    deterministicResult.intent !==
      "financial-advice" &&
    deterministicResult.mode !==
      "site-help" &&
    deterministicResult.mode !==
      "product-help";

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
    }
  }

  return noStoreJson({
    ok: true,
    askAyzo:
      result,
  });
}
