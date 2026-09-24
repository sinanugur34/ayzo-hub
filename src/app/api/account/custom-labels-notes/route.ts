import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  canUseCustomLabelsNotes,
} from "@/lib/account/customLabelsNotesAccess";

export const dynamic =
  "force-dynamic";

const selectFields = `
  id,
  network,
  subject_type,
  subject_value,
  label,
  notes,
  color_key,
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

  if (
    !(
      await canUseCustomLabelsNotes(
        userId
      )
    )
  ) {
    return noStoreJson(
      {
        error:
          "Custom Labels & Notes requires AYZO Advanced.",

        code:
          "PLAN_REQUIRED",
      },
      403
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "entity_annotations"
      )
      .select(
        selectFields
      )
      .eq(
        "user_id",
        userId
      )
      .order(
        "updated_at",
        {
          ascending:
            false,
        }
      )
      .limit(200);

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to load Custom Labels & Notes.",
      },
      500
    );
  }

  return noStoreJson({
    annotations:
      data ?? [],
  });
}
