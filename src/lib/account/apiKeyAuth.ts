import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  getMobileEntitlement,
} from "@/lib/account/mobileEntitlement";

import {
  hashApiKey,
  readApiBearerToken,
} from "@/lib/account/apiKeys";

import {
  planHasFeature,
} from "@/lib/plans/registry";

type ApiAuthFailure = {
  ok: false;
  status: number;
  code:
    | "API_KEY_REQUIRED"
    | "INVALID_API_KEY"
    | "API_KEY_STORE_UNAVAILABLE"
    | "ENTITLEMENT_UNAVAILABLE"
    | "PLAN_REQUIRED";
  error: string;
};

function failure(
  status: number,
  code: ApiAuthFailure["code"],
  error: string
): ApiAuthFailure {
  return {
    ok: false,
    status,
    code,
    error,
  };
}

export async function authenticateApiKey(
  request: Request
) {
  const token =
    readApiBearerToken(
      request
    );

  if (!token) {
    return failure(
      401,
      "API_KEY_REQUIRED",
      "A valid AYZO API key is required."
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
      .select(
        "id,user_id,key_prefix,revoked_at"
      )
      .eq(
        "key_hash",
        hashApiKey(
          token
        )
      )
      .maybeSingle();

  if (error) {
    return failure(
      503,
      "API_KEY_STORE_UNAVAILABLE",
      "AYZO could not securely validate the API key."
    );
  }

  if (
    !data ||
    data.revoked_at
  ) {
    return failure(
      401,
      "INVALID_API_KEY",
      "The AYZO API key is invalid or revoked."
    );
  }

  const {
    entitlement,
    billingAvailable,
  } =
    await getMobileEntitlement(
      data.user_id
    );

  if (!billingAvailable) {
    return failure(
      503,
      "ENTITLEMENT_UNAVAILABLE",
      "AYZO could not securely validate the account entitlement."
    );
  }

  if (
    !planHasFeature(
      entitlement.planId,
      "apiAccess"
    )
  ) {
    return failure(
      403,
      "PLAN_REQUIRED",
      "API Access requires AYZO Advanced."
    );
  }

  /*
   * Last-used telemetry must not make
   * a valid API request fail.
   */
  await admin
    .from(
      "api_keys"
    )
    .update({
      last_used_at:
        new Date()
          .toISOString(),
    })
    .eq(
      "id",
      data.id
    )
    .eq(
      "user_id",
      data.user_id
    );

  return {
    ok: true as const,

    identity: {
      keyId:
        data.id,

      userId:
        data.user_id,

      keyPrefix:
        data.key_prefix,

      planId:
        entitlement.planId,
    },
  };
}
