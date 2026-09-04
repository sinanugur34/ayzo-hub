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
  isUuid,
  parseAlertRuleToggle,
} from "@/lib/account/alertRules";

import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

export const dynamic =
  "force-dynamic";

type Context = {
  params:
    Promise<{
      ruleId:
        string;
    }>;
};

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

async function canManagePro(
  expectedUserId:
    string
) {
  const result =
    await getServerEntitlement();

  return (
    result.userId ===
      expectedUserId &&
    result.billingAvailable &&
    result.entitlement
      .planId ===
      "pro"
  );
}

export async function PATCH(
  request: Request,
  context: Context
) {
  if (
    requestTooLarge(
      request,
      8_192
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
    ruleId,
  } =
    await context.params;

  if (!isUuid(ruleId)) {
    return noStoreJson(
      {
        error:
          "Invalid alert rule.",
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

  if (
    !(
      await canManagePro(
        userId
      )
    )
  ) {
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
    parseAlertRuleToggle(
      body
    );

  if (!parsed) {
    return noStoreJson(
      {
        error:
          "Invalid alert rule update.",
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
        "alert_rules"
      )
      .update({
        enabled:
          parsed.enabled,
      })
      .eq(
        "id",
        ruleId
      )
      .eq(
        "user_id",
        userId
      )
      .select(
        selectFields
      )
      .maybeSingle();

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to update alert rule.",
      },
      500
    );
  }

  if (!data) {
    return noStoreJson(
      {
        error:
          "Alert rule not found.",
      },
      404
    );
  }

  return noStoreJson({
    rule:
      data,

    deliveryLive:
      false,
  });
}

export async function DELETE(
  _request: Request,
  context: Context
) {
  const {
    ruleId,
  } =
    await context.params;

  if (!isUuid(ruleId)) {
    return noStoreJson(
      {
        error:
          "Invalid alert rule.",
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

  if (
    !(
      await canManagePro(
        userId
      )
    )
  ) {
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

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "alert_rules"
      )
      .delete()
      .eq(
        "id",
        ruleId
      )
      .eq(
        "user_id",
        userId
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to delete alert rule.",
      },
      500
    );
  }

  if (!data) {
    return noStoreJson(
      {
        error:
          "Alert rule not found.",
      },
      404
    );
  }

  return noStoreJson({
    deleted:
      true,

    id:
      data.id,
  });
}
