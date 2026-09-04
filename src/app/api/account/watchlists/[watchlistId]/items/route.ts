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

type Context = {
  params:
    Promise<{
      watchlistId:
        string;
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

function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(
  request: Request,
  context: Context
) {
  if (
    requestTooLarge(
      request,
      32_768
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
    watchlistId,
  } =
    await context.params;

  if (!isUuid(watchlistId)) {
    return noStoreJson(
      {
        error:
          "Invalid watchlist.",
      },
      400
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
    data:
      watchlist,
    error:
      watchlistError,
  } =
    await supabase
      .from(
        "watchlists"
      )
      .select("id")
      .eq(
        "id",
        watchlistId
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

  if (
    watchlistError ||
    !watchlist
  ) {
    return noStoreJson(
      {
        error:
          "Watchlist not found.",
      },
      404
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

  const label =
    readOptionalString(
      body.label,
      160
    );

  const notes =
    readOptionalString(
      body.notes,
      2000
    );

  if (
    !network ||
    !subjectType ||
    !subjectValue
  ) {
    return noStoreJson(
      {
        error:
          "Invalid watchlist item.",
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
        "watchlist_items"
      )
      .insert({
        watchlist_id:
          watchlistId,

        network,

        subject_type:
          subjectType,

        subject_value:
          subjectValue,

        label,

        notes,
      })
      .select(`
        id,
        network,
        subject_type,
        subject_value,
        label,
        notes,
        created_at,
        updated_at
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
            "This item is already in the watchlist.",
        },
        409
      );
    }

    return noStoreJson(
      {
        error:
          "Unable to add watchlist item.",
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
