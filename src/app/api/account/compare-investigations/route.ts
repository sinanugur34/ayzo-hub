import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  canUseCompareInvestigations,
} from "@/lib/account/compareInvestigationsAccess";

import {
  buildInvestigationComparison,
  parseCompareInvestigationsInput,
} from "@/lib/account/compareInvestigations";

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
      await canUseCompareInvestigations(
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
              "Compare Investigations requires AYZO Advanced.",
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

export async function GET() {
  const {
    response,
  } =
    await authorize();

  if (response) {
    return response;
  }

  return noStoreJson({
    available:
      true,
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
    parseCompareInvestigationsInput(
      body
    );

  if (!input) {
    return noStoreJson(
      {
        error:
          "Select two different saved analyses.",
      },
      400
    );
  }

  const ids = [
    input.leftSavedAnalysisId,
    input.rightSavedAnalysisId,
  ];

  const {
    data,
    error,
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
        analysis_payload,
        created_at
      `)
      .eq(
        "user_id",
        context.userId!
      )
      .in(
        "id",
        ids
      );

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to load saved analyses.",
      },
      500
    );
  }

  if (
    !data ||
    data.length !==
      2
  ) {
    return noStoreJson(
      {
        error:
          "One or more saved analyses were not found.",
      },
      404
    );
  }

  const byId =
    new Map(
      data.map(
        row => [
          row.id,
          row,
        ]
      )
    );

  const left =
    byId.get(
      input.leftSavedAnalysisId
    );

  const right =
    byId.get(
      input.rightSavedAnalysisId
    );

  if (
    !left ||
    !right
  ) {
    return noStoreJson(
      {
        error:
          "Unable to resolve comparison subjects.",
      },
      404
    );
  }

  const comparison =
    buildInvestigationComparison(
      {
        id:
          left.id,
        network:
          left.network,
        subjectType:
          left.subject_type,
        subjectValue:
          left.subject_value,
        title:
          left.title,
        createdAt:
          left.created_at,
        analysisPayload:
          left.analysis_payload,
      },
      {
        id:
          right.id,
        network:
          right.network,
        subjectType:
          right.subject_type,
        subjectValue:
          right.subject_value,
        title:
          right.title,
        createdAt:
          right.created_at,
        analysisPayload:
          right.analysis_payload,
      }
    );

  return noStoreJson({
    comparison,
  });
}
