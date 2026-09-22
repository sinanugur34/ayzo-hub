import {
  authenticateMobileRequest,
} from "@/lib/account/mobileRequestAuth";

import {
  getMobileEntitlement,
} from "@/lib/account/mobileEntitlement";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export async function GET(
  request: Request
) {
  const auth =
    await authenticateMobileRequest(
      request
    );

  if (!auth.ok) {
    return Response.json(
      {
        ok: false,
        code:
          auth.code,
        error:
          auth.error,
      },
      {
        status:
          auth.status,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const admin =
    createAdminClient();

  const [
    rulesResult,
    entitlementResult,
  ] =
    await Promise.all([
      admin
        .from(
          "alert_rules"
        )
        .select(
          "id,watchlist_id,network,subject_type,subject_value,rule_type,delivery_channel,enabled,created_at,updated_at"
        )
        .eq(
          "user_id",
          auth.identity.userId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(100),

      getMobileEntitlement(
        auth.identity.userId
      ),
    ]);

  if (rulesResult.error) {
    return Response.json(
      {
        ok: false,
        code:
          "ALERTS_UNAVAILABLE",
        error:
          "Unable to load AYZO alerts.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const planId =
    entitlementResult
      .entitlement
      .planId;

  return Response.json(
    {
      ok: true,

      rules:
        rulesResult.data ??
        [],

      plan:
        planId,

      canManage:
        planId === "pro" ||
        planId === "advanced",

      deliveryChannel:
        "email",
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
