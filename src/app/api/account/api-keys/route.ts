import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  generateApiKey,
  normalizeApiKeyName,
} from "@/lib/account/apiKeys";

import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

import {
  planHasFeature,
} from "@/lib/plans/registry";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  requestTooLarge,
} from "@/lib/account/validation";

export const dynamic =
  "force-dynamic";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(
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

async function authenticatedAdvancedUser() {
  const {
    userId,
  } =
    await getAuthenticatedAccountContext();

  if (!userId) {
    return {
      ok:
        false as const,

      response:
        json(
          {
            error:
              "Unauthorized",
          },
          401
        ),
    };
  }

  const entitlement =
    await getServerEntitlement();

  if (
    entitlement.userId !==
      userId ||
    !entitlement.billingAvailable ||
    !planHasFeature(
      entitlement
        .entitlement
        .planId,
      "apiAccess"
    )
  ) {
    return {
      ok:
        false as const,

      response:
        json(
          {
            error:
              "API Access requires AYZO Advanced.",

            code:
              "PLAN_REQUIRED",
          },
          403
        ),
    };
  }

  return {
    ok:
      true as const,
    userId,
  };
}

export async function GET() {
  const auth =
    await authenticatedAdvancedUser();

  if (!auth.ok) {
    return auth.response;
  }

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "api_keys"
      )
      .select(
        "id,name,key_prefix,created_at,last_used_at,revoked_at"
      )
      .eq(
        "user_id",
        auth.userId
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(10);

  if (error) {
    return json(
      {
        error:
          "Unable to load API keys.",
      },
      500
    );
  }

  return json({
    keys:
      data ?? [],
  });
}

export async function POST(
  request: Request
) {
  if (
    requestTooLarge(
      request,
      4096
    )
  ) {
    return json(
      {
        error:
          "Request too large.",
      },
      413
    );
  }

  const auth =
    await authenticatedAdvancedUser();

  if (!auth.ok) {
    return auth.response;
  }

  const body =
    await request
      .json()
      .catch(
        () => null
      );

  const name =
    normalizeApiKeyName(
      body?.name
    );

  if (!name) {
    return json(
      {
        error:
          "A key name between 1 and 80 characters is required.",
      },
      400
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      existing,
    error:
      existingError,
  } =
    await admin
      .from(
        "api_keys"
      )
      .select(
        "id"
      )
      .eq(
        "user_id",
        auth.userId
      )
      .is(
        "revoked_at",
        null
      )
      .maybeSingle();

  if (existingError) {
    return json(
      {
        error:
          "Unable to validate current API keys.",
      },
      500
    );
  }

  if (existing) {
    return json(
      {
        error:
          "Revoke the current API key before creating another.",

        code:
          "ACTIVE_KEY_EXISTS",
      },
      409
    );
  }

  const generated =
    generateApiKey();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "api_keys"
      )
      .insert({
        user_id:
          auth.userId,

        name,

        key_prefix:
          generated.keyPrefix,

        key_hash:
          generated.keyHash,
      })
      .select(
        "id,name,key_prefix,created_at,last_used_at,revoked_at"
      )
      .single();

  if (error) {
    return json(
      {
        error:
          error.code ===
            "23505"
            ? "An active API key already exists."
            : "Unable to create API key.",
      },
      error.code ===
        "23505"
        ? 409
        : 500
    );
  }

  /*
   * This is the ONLY response that
   * contains the raw API key.
   */
  return json(
    {
      key:
        data,

      secret:
        generated.token,
    },
    201
  );
}

export async function DELETE(
  request: Request
) {
  const auth =
    await authenticatedAdvancedUser();

  if (!auth.ok) {
    return auth.response;
  }

  const id =
    new URL(
      request.url
    ).searchParams
      .get(
        "id"
      )
      ?.trim() ??
    "";

  if (!UUID.test(id)) {
    return json(
      {
        error:
          "Invalid API key id.",
      },
      400
    );
  }

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "api_keys"
      )
      .update({
        revoked_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        id
      )
      .eq(
        "user_id",
        auth.userId
      )
      .is(
        "revoked_at",
        null
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (error) {
    return json(
      {
        error:
          "Unable to revoke API key.",
      },
      500
    );
  }

  if (!data) {
    return json(
      {
        error:
          "Active API key not found.",
      },
      404
    );
  }

  return json({
    revoked:
      true,
  });
}
