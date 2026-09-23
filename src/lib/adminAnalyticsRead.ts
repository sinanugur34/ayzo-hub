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

type AdminUserDirectoryRpcRow = {
  user_id: string;
  email:
    string |
    null;
  user_created_at:
    string;
  last_sign_in_at:
    string |
    null;
  signup_channel:
    string;
  device_class:
    string;
  os_family:
    string;
  country_code:
    string;
  signup_recorded_at:
    string |
    null;
  current_plan:
    string;
  subscription_provider:
    string |
    null;
  subscription_status:
    string |
    null;
  billing_interval:
    string |
    null;
  locked_price_usd_cents:
    number |
    null;
  current_period_end:
    string |
    null;
  total_count:
    number |
    string;
};

export async function searchAdminUsers(
  filters: {
    page: number;
    perPage: number;
    emailSearch:
      string |
      null;
    signupChannel:
      string |
      null;
    deviceClass:
      string |
      null;
    osFamily:
      string |
      null;
    countryCode:
      string |
      null;
    createdFrom:
      string |
      null;
    createdTo:
      string |
      null;
    plan:
      string |
      null;
    provider:
      string |
      null;
    subscriptionStatus:
      string |
      null;
    billingInterval:
      string |
      null;
  }
) {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin.rpc(
      "ayzo_admin_list_users_v2",
      {
        p_page:
          filters.page,

        p_per_page:
          filters.perPage,

        p_email_search:
          filters.emailSearch,

        p_signup_channel:
          filters.signupChannel,

        p_device_class:
          filters.deviceClass,

        p_os_family:
          filters.osFamily,

        p_country_code:
          filters.countryCode,

        p_created_from:
          filters.createdFrom,

        p_created_to:
          filters.createdTo,

        p_plan:
          filters.plan,

        p_provider:
          filters.provider,

        p_subscription_status:
          filters.subscriptionStatus,

        p_billing_interval:
          filters.billingInterval,
      }
    );

  if (
    error ||
    !Array.isArray(
      data
    )
  ) {
    throw new Error(
      "AYZO_ADMIN_USER_SEARCH_UNAVAILABLE"
    );
  }

  const rows =
    data as
      AdminUserDirectoryRpcRow[];

  const total =
    rows.length > 0
      ? Number(
          rows[0]
            .total_count
        )
      : 0;

  const safeTotal =
    Number.isFinite(
      total
    )
      ? total
      : 0;

  return {
    users:
      rows.map(
        row => ({
          id:
            row.user_id,

          email:
            row.email,

          createdAt:
            row.user_created_at,

          lastSignInAt:
            row.last_sign_in_at,

          signupSource: {
            channel:
              row.signup_channel,

            deviceClass:
              row.device_class,

            osFamily:
              row.os_family,

            countryCode:
              row.country_code,

            recordedAt:
              row.signup_recorded_at,
          },

          billing: {
            currentPlan:
              row.current_plan,

            provider:
              row.subscription_provider,

            status:
              row.subscription_status,

            interval:
              row.billing_interval,

            lockedPriceUsdCents:
              row.locked_price_usd_cents,

            currentPeriodEnd:
              row.current_period_end,
          },
        })
      ),

    total:
      safeTotal,

    page:
      filters.page,

    perPage:
      filters.perPage,

    totalPages:
      Math.max(
        1,
        Math.ceil(
          safeTotal /
          filters.perPage
        )
      ),
  };
}
