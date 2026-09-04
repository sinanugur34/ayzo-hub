import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  parseEntityAnnotationInput,
  parseEntityIdentity,
} from "@/lib/account/entityAnnotations";

import {
  requestTooLarge,
} from "@/lib/account/validation";

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

function identityFromRequest(
  request: Request
) {
  const params =
    new URL(
      request.url
    ).searchParams;

  return parseEntityIdentity({
    network:
      params.get(
        "network"
      ),

    subjectType:
      params.get(
        "subjectType"
      ),

    subjectValue:
      params.get(
        "subjectValue"
      ),
  });
}

export async function GET(
  request: Request
) {
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

  const identity =
    identityFromRequest(
      request
    );

  if (!identity) {
    return noStoreJson(
      {
        error:
          "Invalid entity identity.",
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
        "entity_annotations"
      )
      .select(
        selectFields
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "network",
        identity.network
      )
      .eq(
        "subject_type",
        identity.subjectType
      )
      .eq(
        "subject_value",
        identity.subjectValue
      )
      .maybeSingle();

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to load annotation.",
      },
      500
    );
  }

  return noStoreJson({
    annotation:
      data ?? null,
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

  const input =
    parseEntityAnnotationInput(
      body
    );

  if (!input) {
    return noStoreJson(
      {
        error:
          "Invalid annotation.",
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
        "entity_annotations"
      )
      .upsert(
        {
          user_id:
            userId,

          network:
            input.network,

          subject_type:
            input.subjectType,

          subject_value:
            input.subjectValue,

          label:
            input.label,

          notes:
            input.notes,

          color_key:
            input.colorKey,
        },
        {
          onConflict:
            "user_id,network,subject_type,subject_value",
        }
      )
      .select(
        selectFields
      )
      .single();

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to save annotation.",
      },
      500
    );
  }

  return noStoreJson({
    annotation:
      data,
  });
}

export async function DELETE(
  request: Request
) {
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

  const identity =
    identityFromRequest(
      request
    );

  if (!identity) {
    return noStoreJson(
      {
        error:
          "Invalid entity identity.",
      },
      400
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "entity_annotations"
      )
      .delete()
      .eq(
        "user_id",
        userId
      )
      .eq(
        "network",
        identity.network
      )
      .eq(
        "subject_type",
        identity.subjectType
      )
      .eq(
        "subject_value",
        identity.subjectValue
      );

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to delete annotation.",
      },
      500
    );
  }

  return noStoreJson({
    deleted:
      true,
  });
}
