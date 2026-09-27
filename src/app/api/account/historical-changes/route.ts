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
  EVIDENCE_SNAPSHOT_RETENTION,
  evidenceSnapshotDedupeBucket,
  evidenceSnapshotFingerprint,
  serverCapturedSnapshot,
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
      "historicalChanges"
    )
  ) {
    return noStoreJson(
      {
        error:
          "Evidence Change requires AYZO Pro or Advanced.",

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

  const parsedSnapshot =
    parseHistoricalSnapshot(
      body.currentSnapshot
    );

  if (
    !network ||
    !subjectType ||
    !subjectValue ||
    !parsedSnapshot
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
    parsedSnapshot.network !==
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

  /*
   * Persisted chronology uses a
   * server-controlled timestamp.
   */
  const currentSnapshot =
    serverCapturedSnapshot(
      parsedSnapshot
    );

  const snapshotHash =
    evidenceSnapshotFingerprint(
      currentSnapshot
    );

  const dedupeBucket =
    evidenceSnapshotDedupeBucket();

  const admin =
    createAdminClient();

  type ParsedSnapshot =
    NonNullable<
      ReturnType<
        typeof parseHistoricalSnapshot
      >
    >;

  type Baseline = {
    id:
      string;

    createdAt:
      string;

    source:
      "automatic" |
      "saved";

    snapshot:
      ParsedSnapshot;
  };

  let baseline:
    Baseline | null =
      null;

  const {
    data:
      automaticRows,
    error:
      automaticError,
  } =
    await admin
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
            false,
        }
      )
      .limit(
        EVIDENCE_SNAPSHOT_RETENTION
      );

  if (
    !automaticError &&
    Array.isArray(
      automaticRows
    )
  ) {
    for (
      const row of
      automaticRows
    ) {
      /*
       * Remounts inside the same window
       * must not compare current evidence
       * with itself.
       */
      if (
        row.snapshot_hash ===
          snapshotHash &&
        Number(
          row.dedupe_bucket
        ) ===
          dedupeBucket
      ) {
        continue;
      }

      const parsed =
        parseHistoricalSnapshot(
          row.snapshot
        );

      if (!parsed) {
        continue;
      }

      baseline = {
        id:
          row.id,

        createdAt:
          row.created_at,

        source:
          "automatic",

        snapshot:
          parsed,
      };

      break;
    }
  }

  /*
   * Existing manually saved analyses
   * remain valid historical baselines.
   */
  if (!baseline) {
    const {
      data:
        savedRows,
      error:
        savedError,
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
        .limit(
          10
        );

    if (
      savedError &&
      automaticError
    ) {
      return noStoreJson(
        {
          error:
            "Unable to load historical evidence.",
        },
        500
      );
    }

    if (
      !savedError &&
      Array.isArray(
        savedRows
      )
    ) {
      for (
        const row of
        savedRows
      ) {
        const parsed =
          parseHistoricalSnapshot(
            row.analysis_payload
          );

        if (!parsed) {
          continue;
        }

        baseline = {
          id:
            row.id,

          createdAt:
            row.created_at,

          source:
            "saved",

          snapshot:
            parsed,
        };

        break;
      }
    }
  }

  const comparison =
    baseline
      ? compareHistoricalSnapshots(
          baseline.snapshot,
          currentSnapshot
        )
      : null;

  /*
   * Capture only after baseline selection.
   */
  const {
    error:
      insertError,
  } =
    await admin
      .from(
        "evidence_snapshots"
      )
      .insert({
        user_id:
          userId,

        network,

        subject_type:
          subjectType,

        subject_value:
          subjectValue,

        snapshot:
          currentSnapshot,

        snapshot_hash:
          snapshotHash,

        dedupe_bucket:
          dedupeBucket,

        captured_at:
          currentSnapshot
            .capturedAt,
      });

  const duplicate =
    insertError?.code ===
      "23505";

  const trackingActive =
    !insertError ||
    duplicate;

  const captured =
    !insertError;

  if (
    insertError &&
    !duplicate
  ) {
    console.error(
      "Automatic evidence snapshot capture failed:",
      insertError.code
    );
  }

  /*
   * Retain the newest twenty automatic
   * baselines per exact subject.
   */
  if (captured) {
    const {
      data:
        staleRows,
      error:
        staleReadError,
    } =
      await admin
        .from(
          "evidence_snapshots"
        )
        .select(
          "id"
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
        .order(
          "captured_at",
          {
            ascending:
              false,
          }
        )
        .range(
          EVIDENCE_SNAPSHOT_RETENTION,
          EVIDENCE_SNAPSHOT_RETENTION +
            99
        );

    if (
      !staleReadError &&
      Array.isArray(
        staleRows
      ) &&
      staleRows.length >
        0
    ) {
      const {
        error:
          cleanupError,
      } =
        await admin
          .from(
            "evidence_snapshots"
          )
          .delete()
          .eq(
            "user_id",
            userId
          )
          .in(
            "id",
            staleRows.map(
              row =>
                row.id
            )
          );

      if (cleanupError) {
        console.error(
          "Evidence snapshot retention cleanup failed:",
          cleanupError.code
        );
      }
    }
  }

  const tracking = {
    active:
      trackingActive,

    captured,
  };

  if (
    baseline &&
    comparison
  ) {
    return noStoreJson({
      available:
        true,

      baseline: {
        id:
          baseline.id,

        createdAt:
          baseline.createdAt,

        source:
          baseline.source,
      },

      comparison,

      tracking,
    });
  }

  return noStoreJson({
    available:
      false,

    baseline:
      null,

    comparison:
      null,

    tracking,
  });
}
