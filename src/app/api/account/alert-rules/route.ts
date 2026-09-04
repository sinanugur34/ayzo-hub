import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  requestTooLarge,
} from "@/lib/account/validation";

import {
  parseCreateAlertRule,
} from "@/lib/account/alertRules";

import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

export const dynamic =
  "force-dynamic";

const selectFields = `
  id,
  watchlist_id,
  network,
  subject_type,
  subject_value,
  rule_type,
  rule_config,
  delivery_channel,
  enabled,
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

async function resolveProAccess(
  expectedUserId:
    string
) {
  const result =
    await getServerEntitlement();

  return {
    canManage:
      result.userId ===
        expectedUserId &&
      result.billingAvailable &&
      result.entitlement
        .planId ===
        "pro",

    billingAvailable:
      result.billingAvailable,

    planId:
      result.entitlement
        .planId,
  };
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

  const [
    rulesResult,
    access,
  ] =
    await Promise.all([
      supabase
        .from(
          "alert_rules"
        )
        .select(
          selectFields
        )
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
        .limit(100),

      resolveProAccess(
        userId
      ),
    ]);

  if (
    rulesResult.error
  ) {
    return noStoreJson(
      {
        error:
          "Unable to load alert rules.",
      },
      500
    );
  }

  return noStoreJson({
    rules:
      rulesResult.data ??
      [],

    canManage:
      access.canManage,

    planId:
      access.planId,

    billingAvailable:
      access.billingAvailable,

    deliveryLive:
      false,

    foundationStatus:
      "definition_only",
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

  const access =
    await resolveProAccess(
      userId
    );

  if (!access.canManage) {
    return noStoreJson(
      {
        error:
          "Pro is required to manage alert rules.",

        code:
          "PRO_REQUIRED",
      },
      403
    );
  }

  const body =
    await request
      .json()
      .catch(
        () => null
      );

  const parsed =
    parseCreateAlertRule(
      body
    );

  if (!parsed) {
    return noStoreJson(
      {
        error:
          "Invalid alert rule.",
      },
      400
    );
  }

  if (
    parsed.watchlistId
  ) {
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
        .select(
          "id"
        )
        .eq(
          "id",
          parsed.watchlistId
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
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "alert_rules"
      )
      .insert({
        user_id:
          userId,

        watchlist_id:
          parsed.watchlistId,

        network:
          parsed.network,

        subject_type:
          parsed.subjectType,

        subject_value:
          parsed.subjectValue,

        rule_type:
          parsed.ruleType,

        rule_config: {
          version:
            1,

          mode:
            "definition_only",
        },

        /*
         * Database contract requires a
         * delivery channel.
         *
         * No message is sent by this
         * foundation route.
         */
        delivery_channel:
          "email",

        enabled:
          parsed.enabled,
      })
      .select(
        selectFields
      )
      .single();

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to create alert rule.",
      },
      500
    );
  }

  return noStoreJson(
    {
      rule:
        data,

      deliveryLive:
        false,

      foundationStatus:
        "definition_only",
    },
    201
  );
}
