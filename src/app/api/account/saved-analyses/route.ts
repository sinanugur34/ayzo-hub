import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  isRecord,
  readOptionalString,
  readRequiredString,
  readSubjectType,
  requestTooLarge,
} from "@/lib/account/validation";

export const dynamic =
  "force-dynamic";

const selectFields = `
  id,
  network,
  subject_type,
  subject_value,
  title,
  notes,
  source_analysis_id,
  created_at,
  updated_at
`;

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

export async function GET() {
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
    data,
    error,
  } =
    await supabase
      .from(
        "saved_analyses"
      )
      .select(
        selectFields
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
      .limit(100);

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to load saved analyses.",
      },
      500
    );
  }

  return noStoreJson({
    analyses:
      data ?? [],
  });
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

  const title =
    readOptionalString(
      body.title,
      160
    );

  const notes =
    readOptionalString(
      body.notes,
      5000
    );

  const sourceAnalysisId =
    readOptionalString(
      body.sourceAnalysisId,
      160
    );

  if (
    !network ||
    !subjectType ||
    !subjectValue
  ) {
    return noStoreJson(
      {
        error:
          "Invalid analysis fields.",
      },
      400
    );
  }

  const analysisPayload =
    body.analysisPayload ===
      undefined
      ? null
      : body.analysisPayload;

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "saved_analyses"
      )
      .insert({
        user_id:
          userId,

        network,

        subject_type:
          subjectType,

        subject_value:
          subjectValue,

        title,

        notes,

        source_analysis_id:
          sourceAnalysisId,

        analysis_payload:
          analysisPayload,
      })
      .select(
        selectFields
      )
      .single();

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to save analysis.",
      },
      500
    );
  }

  return noStoreJson(
    {
      analysis:
        data,
    },
    201
  );
}
