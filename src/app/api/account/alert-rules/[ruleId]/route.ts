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

import {
  planHasFeature,
} from "@/lib/plans/registry";

import {
  classifySmartAlertRuntime,
} from "@/lib/alerts/liveSupport";

import {
  isResendAlertProviderReady,
} from "@/lib/alerts/resendProvider";

import {
  isAlertDeliveryEnabled,
} from "@/lib/alerts/deliveryPolicy";

import {
  isAlertSchedulerEnabled,
} from "@/lib/alerts/schedulerPolicy";

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

async function canManageAlerts(
  expectedUserId:
    string
) {
  const result =
    await getServerEntitlement();

  return (
    result.userId ===
      expectedUserId &&
    result.billingAvailable &&
    planHasFeature(
      result.entitlement.planId,
      "alerts"
    )
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
      await canManageAlerts(
        userId
      )
    )
  ) {
    return noStoreJson(
      {
        error:
          "AYZO Pro or Advanced is required to manage alert rules.",

        code:
          "PAID_PLAN_REQUIRED",
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

  const runtimeStatus =
    classifySmartAlertRuntime({
      watchlistId:
        data.watchlist_id,

      network:
        data.network,

      subjectType:
        data.subject_type,

      ruleType:
        data.rule_type,
    });

  const schedulerReady =
    isAlertSchedulerEnabled(
      process.env
        .AYZO_ALERT_SCHEDULER_ENABLED
    );

  const deliveryReady =
    schedulerReady &&
    isAlertDeliveryEnabled(
      process.env
        .AYZO_ALERT_DELIVERY_ENABLED
    ) &&
    isResendAlertProviderReady();

  return noStoreJson({
    rule: {
      ...data,

      runtimeStatus,

      evaluationLive:
        runtimeStatus ===
          "live" &&
        schedulerReady,

      deliveryLive:
        runtimeStatus ===
          "live" &&
        deliveryReady,
    },

    monitoringLive:
      schedulerReady,

    deliveryLive:
      runtimeStatus ===
        "live" &&
      deliveryReady,

    foundationStatus:
      "smart_alerts_v2",
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
      await canManageAlerts(
        userId
      )
    )
  ) {
    return noStoreJson(
      {
        error:
          "AYZO Pro or Advanced is required to manage alert rules.",

        code:
          "PAID_PLAN_REQUIRED",
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
