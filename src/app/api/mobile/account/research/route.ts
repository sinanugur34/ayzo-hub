import {
  authenticateMobileRequest,
} from "@/lib/account/mobileRequestAuth";

import {
  getMobileEntitlement,
} from "@/lib/account/mobileEntitlement";

import {
  EVIDENCE_SNAPSHOT_RETENTION,
} from "@/lib/account/evidenceSnapshots";

import {
  planHasFeature,
} from "@/lib/plans/registry";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

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

export async function GET(
  request: Request
) {
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

  const userId =
    auth.identity.userId;

  const {
    entitlement,
    billingAvailable,
  } =
    await getMobileEntitlement(
      userId
    );

  const planId =
    entitlement.planId;

  const historicalChanges =
    billingAvailable &&
    planHasFeature(
      planId,
      "historicalChanges"
    );

  const walletProfiler =
    billingAvailable &&
    planHasFeature(
      planId,
      "walletProfiler"
    );

  const evidenceMemory =
    historicalChanges ||
    walletProfiler;

  const admin =
    createAdminClient();

  const [
    savedResult,
    watchlistsResult,
  ] =
    await Promise.all([
      admin
        .from(
          "saved_analyses"
        )
        .select(
          "id,network,subject_type,subject_value,title,created_at"
        )
        .eq(
          "user_id",
          userId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(10),

      admin
        .from(
          "watchlists"
        )
        .select(
          "id,name,description,created_at"
        )
        .eq(
          "user_id",
          userId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(10),
    ]);

  let evidenceSnapshots:
    unknown[] = [];

  let evidenceUnavailable =
    false;

  if (evidenceMemory) {
    const evidenceResult =
      await admin
        .from(
          "evidence_snapshots"
        )
        .select(
          "id,network,subject_type,subject_value,captured_at,created_at"
        )
        .eq(
          "user_id",
          userId
        )
        .order(
          "captured_at",
          {
            ascending:
              false,
          }
        )
        .limit(12);

    evidenceSnapshots =
      evidenceResult.data ??
      [];

    evidenceUnavailable =
      Boolean(
        evidenceResult.error
      );
  }

  return json({
    ok: true,

    plan:
      planId,

    features: {
      historicalChanges,
      walletProfiler,
    },

    savedAnalyses:
      savedResult.data ??
      [],

    savedAnalysesUnavailable:
      Boolean(
        savedResult.error
      ),

    watchlists:
      watchlistsResult.data ??
      [],

    watchlistsUnavailable:
      Boolean(
        watchlistsResult.error
      ),

    evidenceSnapshots,

    evidenceUnavailable,

    evidenceRetention:
      EVIDENCE_SNAPSHOT_RETENTION,
  });
}
