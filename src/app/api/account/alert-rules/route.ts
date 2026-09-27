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

import {
  planHasFeature,
} from "@/lib/plans/registry";

import {
  classifySmartAlertRuntime,
} from "@/lib/alerts/liveSupport";

import {
  isBitcoinMainnetAddress,
} from "@/lib/intelligence/bitcoin/address";

import {
  resolveIntelligenceNetwork,
} from "@/lib/intelligence/router";

import {
  isResendAlertProviderReady,
} from "@/lib/alerts/resendProvider";

import {
  isAlertDeliveryEnabled,
} from "@/lib/alerts/deliveryPolicy";

import {
  isAlertSchedulerEnabled,
} from "@/lib/alerts/schedulerPolicy";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const dynamic =
  "force-dynamic";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

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
  body:
    unknown,
  status =
    200
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

async function resolveAlertAccess(
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
      planHasFeature(
        result.entitlement.planId,
        "alerts"
      ),

    billingAvailable:
      result.billingAvailable,

    planId:
      result.entitlement
        .planId,
  };
}

function runtimeForRule(
  rule: {
    watchlist_id:
      string | null;

    network:
      string | null;

    subject_type:
      string | null;

    rule_type:
      string;
  },
  schedulerReady:
    boolean,
  deliveryReady:
    boolean
) {
  const runtimeStatus =
    classifySmartAlertRuntime({
      watchlistId:
        rule.watchlist_id,

      network:
        rule.network,

      subjectType:
        rule.subject_type,

      ruleType:
        rule.rule_type,
    });

  return {
    runtimeStatus,

    evaluationLive:
      runtimeStatus ===
        "live" &&
      schedulerReady,

    deliveryLive:
      runtimeStatus ===
        "live" &&
      schedulerReady &&
      deliveryReady,
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
        .limit(
          100
        ),

      resolveAlertAccess(
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

  const rules =
    rulesResult.data ??
    [];

  const ruleIds =
    rules.map(
      rule =>
        rule.id
    );

  const checkedAt =
    new Map<
      string,
      string
    >();

  const changedAt =
    new Map<
      string,
      string
    >();

  if (
    ruleIds.length >
    0
  ) {
    const admin =
      createAdminClient();

    const [
      stateResult,
      eventResult,
    ] =
      await Promise.all([
        admin
          .from(
            "alert_detection_state"
          )
          .select(
            "alert_rule_id,observed_at"
          )
          .eq(
            "user_id",
            userId
          )
          .in(
            "alert_rule_id",
            ruleIds
          ),

        admin
          .from(
            "alert_events"
          )
          .select(
            "alert_rule_id,detected_at"
          )
          .eq(
            "user_id",
            userId
          )
          .in(
            "alert_rule_id",
            ruleIds
          )
          .order(
            "detected_at",
            {
              ascending:
                false,
            }
          )
          .limit(
            200
          ),
      ]);

    if (
      !stateResult.error
    ) {
      for (
        const state of
        stateResult.data ??
        []
      ) {
        if (
          typeof state
            .alert_rule_id ===
            "string" &&
          typeof state
            .observed_at ===
            "string"
        ) {
          checkedAt.set(
            state.alert_rule_id,
            state.observed_at
          );
        }
      }
    }

    if (
      !eventResult.error
    ) {
      for (
        const event of
        eventResult.data ??
        []
      ) {
        if (
          typeof event
            .alert_rule_id !==
            "string" ||
          typeof event
            .detected_at !==
            "string" ||
          changedAt.has(
            event.alert_rule_id
          )
        ) {
          continue;
        }

        changedAt.set(
          event.alert_rule_id,
          event.detected_at
        );
      }
    }
  }

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

  const enrichedRules =
    rules.map(
      rule => ({
        ...rule,

        ...runtimeForRule(
          rule,
          schedulerReady,
          deliveryReady
        ),

        lastCheckedAt:
          checkedAt.get(
            rule.id
          ) ??
          null,

        lastEvidenceChangeAt:
          changedAt.get(
            rule.id
          ) ??
          null,
      })
    );

  return noStoreJson({
    rules:
      enrichedRules,

    canManage:
      access.canManage,

    planId:
      access.planId,

    billingAvailable:
      access.billingAvailable,

    monitoringLive:
      schedulerReady,

    deliveryLive:
      deliveryReady,

    foundationStatus:
      "smart_alerts_v2",
  });
}

export async function POST(
  request:
    Request
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
    await resolveAlertAccess(
      userId
    );

  if (!access.canManage) {
    return noStoreJson(
      {
        error:
          "AYZO Pro or Advanced is required to manage Smart Alerts.",

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
    parseCreateAlertRule(
      body
    );

  if (!parsed) {
    return noStoreJson(
      {
        error:
          "Invalid Smart Alert.",
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

  const runtimeStatus =
    classifySmartAlertRuntime({
      watchlistId:
        parsed.watchlistId,

      network:
        parsed.network,

      subjectType:
        parsed.subjectType,

      ruleType:
        parsed.ruleType,
    });

  /*
   * New direct Smart Alerts may only
   * be created for genuinely live
   * monitoring adapters.
   *
   * Legacy watchlist definitions remain
   * accepted/preserved as definition-only.
   */
  if (
    parsed.watchlistId ===
      null &&
    runtimeStatus !==
      "live"
  ) {
    return noStoreJson(
      {
        error:
          "Live Smart Alert monitoring is not available for this network, subject and rule combination.",

        code:
          "MONITORING_NOT_LIVE",
      },
      400
    );
  }

  if (
    parsed.watchlistId ===
      null &&
    parsed.network
  ) {
    const resolution =
      resolveIntelligenceNetwork(
        parsed.network
      );

    if (!resolution.ok) {
      return noStoreJson(
        {
          error:
            "Network is unavailable for Smart Alert monitoring.",
        },
        400
      );
    }

    if (
      resolution.engine ===
        "bitcoin" &&
      (
        parsed.subjectType !==
          "wallet" ||
        !isBitcoinMainnetAddress(
          parsed.subjectValue ??
          ""
        )
      )
    ) {
      return noStoreJson(
        {
          error:
            "Bitcoin Smart Alerts require a valid wallet address.",
        },
        400
      );
    }

    if (
      resolution.engine ===
        "evm" &&
      (
        (
          parsed.subjectType !==
            "wallet" &&
          parsed.subjectType !==
            "token"
        ) ||
        !EVM_ADDRESS.test(
          parsed.subjectValue ??
          ""
        )
      )
    ) {
      return noStoreJson(
        {
          error:
            "EVM Smart Alerts require a valid 0x wallet or token address.",
        },
        400
      );
    }

    const {
      data:
        existing,
      error:
        existingError,
    } =
      await supabase
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
        .is(
          "watchlist_id",
          null
        )
        .eq(
          "network",
          parsed.network
        )
        .eq(
          "subject_type",
          parsed.subjectType
        )
        .eq(
          "subject_value",
          parsed.subjectValue
        )
        .eq(
          "rule_type",
          parsed.ruleType
        )
        .maybeSingle();

    if (existingError) {
      return noStoreJson(
        {
          error:
            "Unable to check existing Smart Alerts.",
        },
        500
      );
    }

    if (existing) {
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

      return noStoreJson(
        {
          error:
            "This Smart Alert already exists.",

          code:
            "ALREADY_MONITORING",

          rule: {
            ...existing,

            ...runtimeForRule(
              existing,
              schedulerReady,
              deliveryReady
            ),
          },

          monitoringLive:
            schedulerReady,

          deliveryLive:
            deliveryReady,
        },
        409
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
            parsed.watchlistId
              ? "definition_only"
              : "smart_alert_v2",
        },

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
          "Unable to create Smart Alert.",
      },
      500
    );
  }

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

  return noStoreJson(
    {
      rule: {
        ...data,

        ...runtimeForRule(
          data,
          schedulerReady,
          deliveryReady
        ),

        lastCheckedAt:
          null,

        lastEvidenceChangeAt:
          null,
      },

      monitoringLive:
        runtimeStatus ===
          "live" &&
        schedulerReady,

      deliveryLive:
        runtimeStatus ===
          "live" &&
        deliveryReady,

      foundationStatus:
        "smart_alerts_v2",
    },
    201
  );
}
