import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  buildAyzoEntityLabels,
} from "@/lib/account/ayzoEntityLabels";

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
      "entityLabels"
    )
  ) {
    return noStoreJson(
      {
        error:
          "AYZO Entity Labels requires AYZO Pro or Advanced.",

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

  if (
    !network ||
    !subjectType ||
    !subjectValue
  ) {
    return noStoreJson(
      {
        error:
          "Invalid entity label fields.",
      },
      400
    );
  }

  const result =
    buildAyzoEntityLabels({
      network,
      subjectType,
      subjectValue,

      evidencePayload:
        body.evidencePayload,
    });

  return noStoreJson({
    ok: true,
    entityLabels:
      result,
  });
}
