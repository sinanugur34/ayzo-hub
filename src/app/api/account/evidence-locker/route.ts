import {
  createHash,
} from "node:crypto";

import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  canUseEvidenceLocker,
} from "@/lib/account/evidenceLockerAccess";

import {
  isEvidenceLockerUuid,
  parseEvidenceLockerCreateInput,
} from "@/lib/account/evidenceLocker";

import {
  requestTooLarge,
} from "@/lib/account/validation";

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

async function authorize() {
  const context =
    await getAuthenticatedAccountContext();

  if (!context.userId) {
    return {
      context,
      response:
        noStoreJson(
          {
            error:
              "Unauthorized",
          },
          401
        ),
    };
  }

  if (
    !(
      await canUseEvidenceLocker(
        context.userId
      )
    )
  ) {
    return {
      context,
      response:
        noStoreJson(
          {
            error:
              "Evidence Locker requires AYZO Advanced.",
            code:
              "PLAN_REQUIRED",
          },
          403
        ),
    };
  }

  return {
    context,
    response:
      null,
  };
}

function stableStringify(
  value: unknown
): string {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return JSON.stringify(
      value
    );
  }

  if (Array.isArray(value)) {
    return `[${value
      .map(stableStringify)
      .join(",")}]`;
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  const keys =
    Object.keys(record)
      .sort();

  return `{${keys
    .map(
      key =>
        `${JSON.stringify(
          key
        )}:${stableStringify(
          record[key]
        )}`
    )
    .join(",")}}`;
}

export async function GET() {
  const {
    context,
    response,
  } =
    await authorize();

  if (response) {
    return response;
  }

  const {
    data,
    error,
  } =
    await context.supabase
      .from(
        "evidence_locker_items"
      )
      .select(`
        id,
        source_saved_analysis_id,
        snapshot,
        snapshot_sha256,
        locked_at
      `)
      .eq(
        "user_id",
        context.userId!
      )
      .order(
        "locked_at",
        {
          ascending:
            false,
        }
      )
      .limit(100);

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to load Evidence Locker.",
      },
      500
    );
  }

  return noStoreJson({
    items:
      data ?? [],
  });
}

export async function POST(
  request: Request
) {
  if (
    requestTooLarge(
      request,
      8_192
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
    context,
    response,
  } =
    await authorize();

  if (response) {
    return response;
  }

  const body =
    await request
      .json()
      .catch(
        () => null
      );

  const input =
    parseEvidenceLockerCreateInput(
      body
    );

  if (!input) {
    return noStoreJson(
      {
        error:
          "Invalid saved analysis.",
      },
      400
    );
  }

  const {
    data: analysis,
    error: analysisError,
  } =
    await context.supabase
      .from(
        "saved_analyses"
      )
      .select(`
        id,
        network,
        subject_type,
        subject_value,
        title,
        notes,
        source_analysis_id,
        analysis_payload,
        created_at,
        updated_at
      `)
      .eq(
        "id",
        input.savedAnalysisId
      )
      .eq(
        "user_id",
        context.userId!
      )
      .maybeSingle();

  if (analysisError) {
    return noStoreJson(
      {
        error:
          "Unable to load saved analysis.",
      },
      500
    );
  }

  if (!analysis) {
    return noStoreJson(
      {
        error:
          "Saved analysis not found.",
      },
      404
    );
  }

  const snapshot = {
    version:
      1,
    sourceSavedAnalysisId:
      analysis.id,
    capturedAt:
      new Date().toISOString(),
    analysis: {
      network:
        analysis.network,
      subjectType:
        analysis.subject_type,
      subjectValue:
        analysis.subject_value,
      title:
        analysis.title,
      notes:
        analysis.notes,
      sourceAnalysisId:
        analysis.source_analysis_id,
      createdAt:
        analysis.created_at,
      updatedAt:
        analysis.updated_at,
      payload:
        analysis.analysis_payload,
    },
  };

  const snapshotSha256 =
    createHash(
      "sha256"
    )
      .update(
        stableStringify(
          snapshot
        )
      )
      .digest(
        "hex"
      );

  const {
    data,
    error,
  } =
    await context.supabase
      .from(
        "evidence_locker_items"
      )
      .insert({
        user_id:
          context.userId!,
        source_saved_analysis_id:
          analysis.id,
        snapshot,
        snapshot_sha256:
          snapshotSha256,
      })
      .select(`
        id,
        source_saved_analysis_id,
        snapshot,
        snapshot_sha256,
        locked_at
      `)
      .single();

  if (error) {
    if (
      error.code ===
      "23505"
    ) {
      return noStoreJson(
        {
          error:
            "This saved analysis is already locked.",
          code:
            "ALREADY_LOCKED",
        },
        409
      );
    }

    return noStoreJson(
      {
        error:
          "Unable to lock evidence.",
      },
      500
    );
  }

  return noStoreJson(
    {
      item:
        data,
    },
    201
  );
}

export async function DELETE(
  request: Request
) {
  const itemId =
    new URL(
      request.url
    ).searchParams.get(
      "itemId"
    );

  if (
    !isEvidenceLockerUuid(
      itemId
    )
  ) {
    return noStoreJson(
      {
        error:
          "Invalid locker item.",
      },
      400
    );
  }

  const {
    context,
    response,
  } =
    await authorize();

  if (response) {
    return response;
  }

  const {
    data,
    error,
  } =
    await context.supabase
      .from(
        "evidence_locker_items"
      )
      .delete()
      .eq(
        "id",
        itemId
      )
      .eq(
        "user_id",
        context.userId!
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to remove locked evidence.",
      },
      500
    );
  }

  if (!data) {
    return noStoreJson(
      {
        error:
          "Locker item not found.",
      },
      404
    );
  }

  return noStoreJson({
    deleted:
      true,
  });
}
