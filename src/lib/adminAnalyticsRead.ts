import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  getMobileAnalysisQuotaStatus,
} from "@/lib/account/mobileAnalysisQuota";

import {
  resolveAccountEntitlement,
  type SubscriptionEntitlementRow,
} from "@/lib/billing/entitlement-core";

type AdminSubscriptionRow =
  SubscriptionEntitlementRow & {
    user_id: string;
    provider: string;
    provider_subscription_id:
      string |
      null;
    current_period_start:
      string |
      null;
    created_at: string;
    updated_at: string;
  };

function isSubscriptionRow(
  value: unknown
): value is AdminSubscriptionRow {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const row =
    value as Record<
      string,
      unknown
    >;

  return (
    typeof row.user_id ===
      "string" &&
    (
      row.plan_id ===
        "pro" ||
      row.plan_id ===
        "advanced"
    ) &&
    (
      row.billing_interval ===
        "monthly" ||
      row.billing_interval ===
        "annual"
    ) &&
    (
      row.status ===
        "pending" ||
      row.status ===
        "active" ||
      row.status ===
        "canceling" ||
      row.status ===
        "past_due" ||
      row.status ===
        "inactive"
    ) &&
    typeof row
      .locked_price_usd_cents ===
      "number" &&
    typeof row
      .cancel_at_period_end ===
      "boolean" &&
    typeof row
      .founding_customer ===
      "boolean"
  );
}

export async function getAdminUserSnapshot(
  userId: string
) {
  const admin =
    createAdminClient();

  const [
    userResult,
    subscriptionsResult,
    activityResult,
    signupSourceResult,
  ] =
    await Promise.all([
      admin.auth.admin
        .getUserById(
          userId
        ),

      admin
        .from(
          "subscriptions"
        )
        .select(`
          user_id,
          provider,
          provider_subscription_id,
          plan_id,
          billing_interval,
          status,
          locked_price_usd_cents,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          founding_customer,
          created_at,
          updated_at
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
        ),

      admin
        .from(
          "analysis_activity"
        )
        .select(`
          id,
          platform,
          network,
          plan_id,
          outcome,
          http_status,
          failure_code,
          quota_limit,
          quota_remaining,
          quota_reset_at,
          created_at
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
        .limit(100),

      admin
        .from(
          "user_signup_source"
        )
        .select(
          "signup_channel,device_class,os_family,country_code,source_version,created_at"
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle(),
    ]);

  if (
    userResult.error ||
    !userResult.data.user
  ) {
    throw new Error(
      "AYZO_ADMIN_USER_NOT_FOUND"
    );
  }

  const subscriptions =
    Array.isArray(
      subscriptionsResult.data
    )
      ? subscriptionsResult
          .data
          .filter(
            isSubscriptionRow
          )
      : [];

  const entitlement =
    resolveAccountEntitlement(
      subscriptions
    );

  const quota =
    await getMobileAnalysisQuotaStatus(
      userId,
      entitlement.planId
    );

  return {
    user: {
      id:
        userResult
          .data
          .user
          .id,

      email:
        userResult
          .data
          .user
          .email ??
        null,

      createdAt:
        userResult
          .data
          .user
          .created_at,

      lastSignInAt:
        userResult
          .data
          .user
          .last_sign_in_at ??
        null,
    },

    signupSource:
      signupSourceResult.data
        ? {
            channel:
              signupSourceResult
                .data
                .signup_channel,

            deviceClass:
              signupSourceResult
                .data
                .device_class,

            osFamily:
              signupSourceResult
                .data
                .os_family,

            countryCode:
              signupSourceResult
                .data
                .country_code,

            sourceVersion:
              signupSourceResult
                .data
                .source_version,

            createdAt:
              signupSourceResult
                .data
                .created_at,
          }
        : null,

    entitlement,

    quota: {
      limit:
        quota.limit,

      remaining:
        quota.remaining,

      resetAt:
        quota.resetAt,

      available:
        quota.available,
    },

    subscriptions,

    activity:
      activityResult.data ??
      [],
  };
}

export async function listAdminUsers(
  page = 1,
  perPage = 50
) {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin.auth.admin
      .listUsers({
        page,
        perPage,
      });

  if (error) {
    throw new Error(
      "AYZO_ADMIN_USERS_UNAVAILABLE"
    );
  }

  return data.users.map(
    user => ({
      id:
        user.id,

      email:
        user.email ??
        null,

      createdAt:
        user.created_at,

      lastSignInAt:
        user.last_sign_in_at ??
        null,
    })
  );
}

export type AdminDashboardSnapshot = {
  users: number;

  subscriptions: {
    total: number;
    active: number;
    pro: number;
    advanced: number;
    googlePlay: number;
    creem: number;
  };

  activity: {
    last24h: number;
    last7d: number;
    completed7d: number;
    failed7d: number;
    quotaBlocked7d: number;
    web7d: number;
    android7d: number;
  };
};

export async function getAdminDashboardSnapshot():
  Promise<AdminDashboardSnapshot> {
  const admin =
    createAdminClient();

  const now =
    Date.now();

  const since24h =
    new Date(
      now -
      24 * 60 * 60 * 1000
    ).toISOString();

  const since7d =
    new Date(
      now -
      7 * 24 * 60 * 60 * 1000
    ).toISOString();

  const countActivity = (
    filters: {
      platform?:
        "web" |
        "android";

      outcome?:
        "completed" |
        "failed" |
        "quota_blocked";
    } = {}
  ) => {
    let query =
      admin
        .from(
          "analysis_activity"
        )
        .select(
          "id",
          {
            count:
              "exact",
            head:
              true,
          }
        )
        .gte(
          "created_at",
          since7d
        );

    if (
      filters.platform
    ) {
      query =
        query.eq(
          "platform",
          filters.platform
        );
    }

    if (
      filters.outcome
    ) {
      query =
        query.eq(
          "outcome",
          filters.outcome
        );
    }

    return query;
  };

  const [
    usersResult,
    subscriptionsResult,
    activity24hResult,
    activity7dResult,
    completed7dResult,
    failed7dResult,
    quotaBlocked7dResult,
    web7dResult,
    android7dResult,
  ] =
    await Promise.all([
      admin.auth.admin
        .listUsers({
          page:
            1,
          perPage:
            1,
        }),

      admin
        .from(
          "subscriptions"
        )
        .select(
          "plan_id,status,provider"
        ),

      admin
        .from(
          "analysis_activity"
        )
        .select(
          "id",
          {
            count:
              "exact",
            head:
              true,
          }
        )
        .gte(
          "created_at",
          since24h
        ),

      countActivity(),

      countActivity({
        outcome:
          "completed",
      }),

      countActivity({
        outcome:
          "failed",
      }),

      countActivity({
        outcome:
          "quota_blocked",
      }),

      countActivity({
        platform:
          "web",
      }),

      countActivity({
        platform:
          "android",
      }),
    ]);

  const results = [
    usersResult.error,
    subscriptionsResult.error,
    activity24hResult.error,
    activity7dResult.error,
    completed7dResult.error,
    failed7dResult.error,
    quotaBlocked7dResult.error,
    web7dResult.error,
    android7dResult.error,
  ];

  if (
    results.some(
      Boolean
    )
  ) {
    throw new Error(
      "AYZO_ADMIN_DASHBOARD_UNAVAILABLE"
    );
  }

  if (
    !(
      "total" in
      usersResult.data
    ) ||
    typeof usersResult
      .data
      .total !==
      "number"
  ) {
    throw new Error(
      "AYZO_ADMIN_USERS_TOTAL_UNAVAILABLE"
    );
  }

  const usersTotal =
    usersResult.data.total;

  const subscriptions =
    subscriptionsResult.data ??
    [];

  const activeSubscriptions =
    subscriptions.filter(
      row =>
        row.status ===
          "active" ||
        row.status ===
          "canceling"
    );

  return {
    users:
      usersTotal,

    subscriptions: {
      total:
        subscriptions.length,

      active:
        activeSubscriptions.length,

      pro:
        activeSubscriptions.filter(
          row =>
            row.plan_id ===
            "pro"
        ).length,

      advanced:
        activeSubscriptions.filter(
          row =>
            row.plan_id ===
            "advanced"
        ).length,

      googlePlay:
        activeSubscriptions.filter(
          row =>
            row.provider ===
            "google_play"
        ).length,

      creem:
        activeSubscriptions.filter(
          row =>
            row.provider ===
            "creem"
        ).length,
    },

    activity: {
      last24h:
        activity24hResult.count ??
        0,

      last7d:
        activity7dResult.count ??
        0,

      completed7d:
        completed7dResult.count ??
        0,

      failed7d:
        failed7dResult.count ??
        0,

      quotaBlocked7d:
        quotaBlocked7dResult.count ??
        0,

      web7d:
        web7dResult.count ??
        0,

      android7d:
        android7dResult.count ??
        0,
    },
  };
}
