import "server-only";

import {
  createFastSpringWebhookAdminClient,
} from "@/lib/billing/fastspringWebhookAdmin";

import {
  PLANS,
} from "@/lib/plans/registry";

import type {
  FastSpringWebhookEvent,
} from "@/lib/billing/fastspringWebhookPayload";

import {
  interpretFastSpringSubscriptionEvent,
} from "@/lib/billing/fastspringSubscriptionEvent";

type AdminClient =
  ReturnType<
    typeof createFastSpringWebhookAdminClient
  >;

function requiredEnv(
  name:
    string
) {
  const value =
    process.env[
      name
    ]?.trim();

  if (!value) {
    throw new Error(
      `Missing server configuration: ${name}`
    );
  }

  return value;
}

function priceCents(
  value:
    number | null
) {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    )
  ) {
    throw new Error(
      "AYZO Pro price contract is unavailable."
    );
  }

  return Math.round(
    value *
      100
  );
}

export async function processFastSpringSubscriptionEvent(
  admin:
    AdminClient,
  event:
    FastSpringWebhookEvent
) {
  const interpretation =
    interpretFastSpringSubscriptionEvent(
      event,
      {
        monthlyProductPath:
          requiredEnv(
            "FASTSPRING_PRO_MONTHLY_PATH"
          ),

        annualProductPath:
          requiredEnv(
            "FASTSPRING_PRO_ANNUAL_PATH"
          ),

        monthlyPriceCents:
          priceCents(
            PLANS.pro
              .monthlyPriceUsd
          ),

        annualPriceCents:
          priceCents(
            PLANS.pro
              .annualPriceUsd
          ),
      }
    );

  if (
    interpretation.action ===
    "ignore"
  ) {
    return {
      outcome:
        "ignored" as const,

      reason:
        interpretation.reason,
    };
  }

  const mutation =
    interpretation
      .mutation;

  const {
    data:
      existing,
    error:
      lookupError,
  } =
    await admin
      .from(
        "subscriptions"
      )
      .select(
        "id,user_id"
      )
      .eq(
        "provider",
        "fastspring"
      )
      .eq(
        "provider_subscription_id",
        mutation
          .providerSubscriptionId
      )
      .maybeSingle();

  if (
    lookupError
  ) {
    throw new Error(
      `Subscription lookup failed: ${lookupError.code ?? "unknown"}`
    );
  }

  const values = {
    user_id:
      mutation.userId,

    provider:
      "fastspring",

    provider_subscription_id:
      mutation
        .providerSubscriptionId,

    plan_id:
      "pro",

    billing_interval:
      mutation
        .billingInterval,

    status:
      mutation.status,

    locked_price_usd_cents:
      mutation
        .lockedPriceUsdCents,

    current_period_start:
      mutation
        .currentPeriodStart,

    current_period_end:
      mutation
        .currentPeriodEnd,

    cancel_at_period_end:
      mutation
        .cancelAtPeriodEnd,

    founding_customer:
      mutation
        .foundingCustomer,
  };

  if (
    existing
  ) {
    /*
     * A provider subscription
     * can never be reassigned
     * to another AYZO account.
     */
    if (
      existing.user_id !==
      mutation.userId
    ) {
      throw new Error(
        "FastSpring subscription ownership conflict."
      );
    }

    const {
      error:
        updateError,
    } =
      await admin
        .from(
          "subscriptions"
        )
        .update(
          values
        )
        .eq(
          "id",
          existing.id
        );

    if (
      updateError
    ) {
      throw new Error(
        `Subscription update failed: ${updateError.code ?? "unknown"}`
      );
    }
  } else {
    const {
      error:
        insertError,
    } =
      await admin
        .from(
          "subscriptions"
        )
        .insert(
          values
        );

    if (
      insertError
    ) {
      /*
       * If another webhook
       * inserted the same provider
       * subscription concurrently,
       * fail and allow FastSpring
       * retry instead of guessing.
       */
      throw new Error(
        `Subscription insert failed: ${insertError.code ?? "unknown"}`
      );
    }
  }

  return {
    outcome:
      "processed" as const,

    planId:
      "pro" as const,

    status:
      mutation.status,
  };
}
