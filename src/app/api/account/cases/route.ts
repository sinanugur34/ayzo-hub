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
  parseCaseCreateInput,
} from "@/lib/account/cases";

import {
  requestTooLarge,
} from "@/lib/account/validation";

export const dynamic =
  "force-dynamic";

const selectFields = `
  id,
  name,
  description,
  status,
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

async function accountContext() {
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

export async function GET() {
  const {
    context,
    response,
  } =
    await accountContext();

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
      .select(
        selectFields
      )
      .eq(
        "user_id",
        context.userId!
      )
      .order(
        "updated_at",
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
          "Unable to load cases.",
      },
      500
    );
  }

  return noStoreJson({
    cases:
      data ?? [],
  });
}

export async function POST(
  request: Request
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
    context,
    response,
  } =
    await accountContext();

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
    parseCaseCreateInput(
      body
    );

  if (!input) {
    return noStoreJson(
      {
        error:
          "Invalid case.",
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
      .insert({
        user_id:
          context.userId!,
        name:
          input.name,
        description:
          input.description,
        status:
          "open",
      })
      .select(
        selectFields
      )
      .single();

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to create case.",
      },
      500
    );
  }

  return noStoreJson(
    {
      case:
        data,
    },
    201
  );
}
