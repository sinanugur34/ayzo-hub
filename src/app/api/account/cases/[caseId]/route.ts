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
  parseCaseUpdateInput,
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

const caseFields = `
  id,
  name,
  description,
  status,
  created_at,
  updated_at
`;

const analysisFields = `
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

export async function GET(
  _request: Request,
  routeContext: Context
) {
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

  const {
    data: caseRow,
    error: caseError,
  } =
    await context.supabase
      .from(
        "investigation_cases"
      )
      .select(
        caseFields
      )
      .eq(
        "id",
        caseId
      )
      .eq(
        "user_id",
        context.userId!
      )
      .maybeSingle();

  if (caseError) {
    return noStoreJson(
      {
        error:
          "Unable to load case.",
      },
      500
    );
  }

  if (!caseRow) {
    return noStoreJson(
      {
        error:
          "Case not found.",
      },
      404
    );
  }

  const {
    data: links,
    error: linkError,
  } =
    await context.supabase
      .from(
        "case_saved_analyses"
      )
      .select(
        "saved_analysis_id,created_at"
      )
      .eq(
        "user_id",
        context.userId!
      )
      .eq(
        "case_id",
        caseId
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (linkError) {
    return noStoreJson(
      {
        error:
          "Unable to load case analyses.",
      },
      500
    );
  }

  const linkRows =
    links ?? [];

  const ids =
    linkRows.map(
      row =>
        row.saved_analysis_id
    );

  let analysisRows:
    Record<string, unknown>[] =
      [];

  if (ids.length > 0) {
    const {
      data,
      error,
    } =
      await context.supabase
        .from(
          "saved_analyses"
        )
        .select(
          analysisFields
        )
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

    analysisRows =
      data ?? [];
  }

  const analysisMap =
    new Map(
      analysisRows.map(
        row => [
          row.id,
          row,
        ]
      )
    );

  const analyses =
    linkRows
      .map(
        link => {
          const analysis =
            analysisMap.get(
              link.saved_analysis_id
            );

          return analysis
            ? {
                ...analysis,
                linked_at:
                  link.created_at,
              }
            : null;
        }
      )
      .filter(Boolean);

  return noStoreJson({
    case:
      caseRow,
    analyses,
  });
}

export async function PATCH(
  request: Request,
  routeContext: Context
) {
  if (
    requestTooLarge(
      request,
      16_384
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

  const update =
    parseCaseUpdateInput(
      body
    );

  if (!update) {
    return noStoreJson(
      {
        error:
          "Invalid case update.",
      },
      400
    );
  }

  const {
    data,
    error,
  } =
    await context.supabase
      .from(
        "investigation_cases"
      )
      .update(update)
      .eq(
        "id",
        caseId
      )
      .eq(
        "user_id",
        context.userId!
      )
      .select(
        caseFields
      )
      .maybeSingle();

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to update case.",
      },
      500
    );
  }

  if (!data) {
    return noStoreJson(
      {
        error:
          "Case not found.",
      },
      404
    );
  }

  return noStoreJson({
    case:
      data,
  });
}

export async function DELETE(
  _request: Request,
  routeContext: Context
) {
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

  const {
    data,
    error,
  } =
    await context.supabase
      .from(
        "investigation_cases"
      )
      .delete()
      .eq(
        "id",
        caseId
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
          "Unable to delete case.",
      },
      500
    );
  }

  if (!data) {
    return noStoreJson(
      {
        error:
          "Case not found.",
      },
      404
    );
  }

  return noStoreJson({
    deleted:
      true,
  });
}
