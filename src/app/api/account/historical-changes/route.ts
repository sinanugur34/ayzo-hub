import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  compareHistoricalSnapshots,
  parseHistoricalSnapshot,
} from "@/lib/account/historicalChanges";

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
    supabase,
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
      "historicalChanges"
    )
  ) {
    return noStoreJson(
      {
        error:
          "Historical Changes requires AYZO Pro or Advanced.",

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

  const currentSnapshot =
    parseHistoricalSnapshot(
      body.currentSnapshot
    );

  if (
    !network ||
    !subjectType ||
    !subjectValue ||
    !currentSnapshot
  ) {
    return noStoreJson(
      {
        error:
          "Invalid historical comparison fields.",
      },
      400
    );
  }

  if (
    currentSnapshot.network !==
    network
  ) {
    return noStoreJson(
      {
        error:
          "Snapshot network does not match request network.",
      },
      400
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "saved_analyses"
      )
      .select(
        "id,created_at,analysis_payload"
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "network",
        network
      )
      .eq(
        "subject_type",
        subjectType
      )
      .eq(
        "subject_value",
        subjectValue
      )
      .not(
        "analysis_payload",
        "is",
        null
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(10);

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to load historical analysis.",
      },
      500
    );
  }

  const rows =
    Array.isArray(data)
      ? data
      : [];

  for (
    const row of rows
  ) {
    const previousSnapshot =
      parseHistoricalSnapshot(
        row.analysis_payload
      );

    if (
      !previousSnapshot
    ) {
      continue;
    }

    const comparison =
      compareHistoricalSnapshots(
        previousSnapshot,
        currentSnapshot
      );

    if (!comparison) {
      continue;
    }

    return noStoreJson({
      available:
        true,

      baseline: {
        id:
          row.id,

        createdAt:
          row.created_at,
      },

      comparison,
    });
  }

  return noStoreJson({
    available:
      false,

    baseline:
      null,

    comparison:
      null,
  });
}
