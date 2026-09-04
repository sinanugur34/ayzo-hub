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
        "watchlists"
      )
      .select(`
        id,
        name,
        description,
        created_at,
        updated_at,
        watchlist_items (
          id,
          network,
          subject_type,
          subject_value,
          label,
          notes,
          created_at,
          updated_at
        )
      `)
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
      .limit(50);

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to load watchlists.",
      },
      500
    );
  }

  return noStoreJson({
    watchlists:
      data ?? [],
  });
}

export async function POST(
  request: Request
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

  const name =
    readRequiredString(
      body.name,
      120
    );

  const description =
    readOptionalString(
      body.description,
      1000
    );

  if (!name) {
    return noStoreJson(
      {
        error:
          "Invalid watchlist name.",
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
        "watchlists"
      )
      .insert({
        user_id:
          userId,
        name,
        description,
      })
      .select(`
        id,
        name,
        description,
        created_at,
        updated_at
      `)
      .single();

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to create watchlist.",
      },
      500
    );
  }

  return noStoreJson(
    {
      watchlist:
        data,
    },
    201
  );
}
