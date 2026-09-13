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

export async function POST(
  request: Request
) {
  if (
    requestTooLarge(
      request,
      196_608
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

  if (
    semanticEligible &&
    isAskAyzoSemanticEnabled()
  ) {
    const semanticResult =
      await answerAskAyzoSemantically({
        network,
        subjectType,
        subjectValue,
        question,
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
