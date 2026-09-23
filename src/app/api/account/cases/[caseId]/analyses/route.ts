import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  canUseCases,
} from "@/lib/account/casesAccess";

import {
  isCaseUuid,
  parseCaseAnalysisLinkInput,
} from "@/lib/account/cases";

import {
  requestTooLarge,
} from "@/lib/account/validation";

export const dynamic =
  "force-dynamic";

type Context = {
  params:
    Promise<{
      caseId: string;
    }>;
};

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
      await canUseCases(
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
              "Cases requires AYZO Advanced.",
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

export async function POST(
  request: Request,
  routeContext: Context
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
    caseId,
  } =
    await routeContext.params;

  if (!isCaseUuid(caseId)) {
    return noStoreJson(
      {
        error:
          "Invalid case.",
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

  const body =
    await request
      .json()
      .catch(
        () => null
      );

  const input =
    parseCaseAnalysisLinkInput(
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

  const [
    caseResult,
    analysisResult,
  ] =
    await Promise.all([
      context.supabase
        .from(
          "investigation_cases"
        )
        .select(
          "id"
        )
        .eq(
          "id",
          caseId
        )
        .eq(
          "user_id",
          context.userId!
        )
        .maybeSingle(),

      context.supabase
        .from(
          "saved_analyses"
        )
        .select(
          "id"
        )
        .eq(
          "id",
          input.savedAnalysisId
        )
        .eq(
          "user_id",
          context.userId!
        )
        .maybeSingle(),
    ]);

  if (
    caseResult.error ||
    analysisResult.error
  ) {
    return noStoreJson(
      {
        error:
          "Unable to validate case link.",
      },
      500
    );
  }

  if (!caseResult.data) {
    return noStoreJson(
      {
        error:
          "Case not found.",
      },
      404
    );
  }

  if (!analysisResult.data) {
    return noStoreJson(
      {
        error:
          "Saved analysis not found.",
      },
      404
    );
  }

  const {
    error,
  } =
    await context.supabase
      .from(
        "case_saved_analyses"
      )
      .upsert(
        {
          user_id:
            context.userId!,
          case_id:
            caseId,
          saved_analysis_id:
            input.savedAnalysisId,
        },
        {
          onConflict:
            "case_id,saved_analysis_id",
          ignoreDuplicates:
            true,
        }
      );

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to add analysis to case.",
      },
      500
    );
  }

  return noStoreJson(
    {
      linked:
        true,
    },
    201
  );
}

export async function DELETE(
  request: Request,
  routeContext: Context
) {
  const {
    caseId,
  } =
    await routeContext.params;

  const savedAnalysisId =
    new URL(
      request.url
    ).searchParams.get(
      "savedAnalysisId"
    );

  if (
    !isCaseUuid(caseId) ||
    !isCaseUuid(
      savedAnalysisId
    )
  ) {
    return noStoreJson(
      {
        error:
          "Invalid case analysis link.",
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
        "case_saved_analyses"
      )
      .delete()
      .eq(
        "user_id",
        context.userId!
      )
      .eq(
        "case_id",
        caseId
      )
      .eq(
        "saved_analysis_id",
        savedAnalysisId
      )
      .select(
        "case_id"
      )
      .maybeSingle();

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to remove analysis from case.",
      },
      500
    );
  }

  if (!data) {
    return noStoreJson(
      {
        error:
          "Case analysis link not found.",
      },
      404
    );
  }

  return noStoreJson({
    deleted:
      true,
  });
}
