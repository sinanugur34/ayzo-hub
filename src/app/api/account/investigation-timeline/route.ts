import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  buildInvestigationTimeline,
} from "@/lib/account/investigationTimeline";

import {
  parseHistoricalSnapshot,
} from "@/lib/account/historicalChanges";

import {
  evidenceSnapshotDedupeBucket,
  evidenceSnapshotFingerprint,
} from "@/lib/account/evidenceSnapshots";

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
  createAdminClient,
} from "@/lib/supabase/admin";

export const dynamic =
  "force-dynamic";

function noStoreJson(
  body:
    unknown,
  status =
    200
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
  request:
    Request
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
      "investigationTimeline"
    )
  ) {
    return noStoreJson(
      {
        error:
          "Investigation Timeline requires AYZO Pro or Advanced.",

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
          "Invalid investigation timeline fields.",
      },
      400
    );
  }

  let currentSnapshot:
    ReturnType<
      typeof parseHistoricalSnapshot
    > =
      null;

  if (
    body.currentSnapshot !==
      undefined &&
    body.currentSnapshot !==
      null
  ) {
    const parsed =
      parseHistoricalSnapshot(
        body.currentSnapshot
      );

    if (
      !parsed ||
      parsed.network !==
        network
    ) {
      return noStoreJson(
        {
          error:
            "Invalid current analysis snapshot.",
        },
        400
      );
    }

    currentSnapshot =
      parsed;
  }

  const admin =
    createAdminClient();

  const [
    automaticResult,
    savedResult,
  ] =
    await Promise.all([
      admin
        .from(
          "evidence_snapshots"
        )
        .select(`
          id,
          created_at,
          snapshot,
          snapshot_hash,
          dedupe_bucket
        `)
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
        .order(
          "captured_at",
          {
            ascending:
              true,
          }
        )
        .limit(
          20
        ),

      supabase
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
              true,
          }
        )
        .limit(
          20
        ),
    ]);

  if (
    automaticResult.error &&
    savedResult.error
  ) {
    return noStoreJson(
      {
        error:
          "Unable to load investigation history.",
      },
      500
    );
  }

  const currentHash =
    currentSnapshot
      ? evidenceSnapshotFingerprint(
          currentSnapshot
        )
      : null;

  const currentBucket =
    evidenceSnapshotDedupeBucket();

  const automaticSnapshots =
    !automaticResult.error &&
    Array.isArray(
      automaticResult.data
    )
      ? automaticResult.data.flatMap(
          row => {
            /*
             * HistoricalChangesPanel may
             * already have persisted the
             * currently rendered analysis.
             * Keep it represented as NOW,
             * not twice in the timeline.
             */
            if (
              currentHash &&
              row.snapshot_hash ===
                currentHash &&
              Number(
                row.dedupe_bucket
              ) ===
                currentBucket
            ) {
              return [];
            }

            return [
              {
                id:
                  row.id,

                createdAt:
                  row.created_at,

                analysisPayload:
                  row.snapshot,

                kind:
                  "automatic_baseline" as const,
              },
            ];
          }
        )
      : [];

  const savedSnapshots =
    !savedResult.error &&
    Array.isArray(
      savedResult.data
    )
      ? savedResult.data.map(
          row => ({
            id:
              row.id,

            createdAt:
              row.created_at,

            analysisPayload:
              row.analysis_payload,

            kind:
              "saved_analysis" as const,
          })
        )
      : [];

  const timeline =
    buildInvestigationTimeline({
      network,

      savedSnapshots: [
        ...automaticSnapshots,
        ...savedSnapshots,
      ],

      currentSnapshot,
    });

  return noStoreJson({
    ok:
      true,

    timeline,
  });
}
