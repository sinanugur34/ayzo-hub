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
  canonicalizeFastSpringExistingSubscriptionPeriod,
  getFastSpringProviderSubscriptionId,
  interpretFastSpringSubscriptionEvent,
  normalizeFastSpringExistingSubscriptionEvent,
} from "@/lib/billing/fastspringSubscriptionEvent";

type AdminClient =
  ReturnType<
    typeof createFastSpringWebhookAdminClient
  >;

type ExistingSubscription = {
  id: string;

  user_id:
    string;

  plan_id:
    string;

  billing_interval:
    "monthly" |
    "annual";

  locked_price_usd_cents:
    number;

  founding_customer:
    boolean;

  current_period_start:
    string | null;

  current_period_end:
    string | null;
};

const SUPPORTED_EVENT_TYPES =
  new Set([
    "subscription.activated",
    "subscription.charge.completed",
    "subscription.canceled",
    "subscription.uncanceled",
    "subscription.deactivated",
  ]);

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
    value * 100
  );
}

function isExistingSubscription(
  value:
    unknown
): value is ExistingSubscription {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value
    )
  ) {
    return false;
  }

  const row =
    value as Record<
      string,
      unknown
    >;

  return (
    typeof row.id ===
      "string" &&
    typeof row.user_id ===
      "string" &&
    row.plan_id ===
      "pro" &&
    (
      row.billing_interval ===
        "monthly" ||
      row.billing_interval ===
        "annual"
    ) &&
    typeof row.locked_price_usd_cents ===
      "number" &&
    Number.isInteger(
      row.locked_price_usd_cents
    ) &&
    row.locked_price_usd_cents >=
      0 &&
    row.founding_customer ===
      true &&
    (
      row.current_period_start ===
        null ||
      typeof row.current_period_start ===
        "string"
    ) &&
    (
      row.current_period_end ===
        null ||
      typeof row.current_period_end ===
        "string"
    )
  );
}

export async function processFastSpringSubscriptionEvent(
  admin:
    AdminClient,
  event:
    FastSpringWebhookEvent
) {
  const monthlyProductPath =
    requiredEnv(
      "FASTSPRING_PRO_MONTHLY_PATH"
    );

  const annualProductPath =
    requiredEnv(
      "FASTSPRING_PRO_ANNUAL_PATH"
    );

  let monthlyPriceCents =
    priceCents(
      PLANS.pro
        .monthlyPriceUsd
    );

  let annualPriceCents =
    priceCents(
      PLANS.pro
        .annualPriceUsd
    );

  const providerSubscriptionId =
    SUPPORTED_EVENT_TYPES.has(
      event.type
    )
      ? getFastSpringProviderSubscriptionId(
          event
        )
      : "";

  let existing:
    ExistingSubscription |
    null =
      null;

  if (
    providerSubscriptionId
  ) {
    const {
      data,
      error:
        lookupError,
    } =
      await admin
        .from(
          "subscriptions"
        )
        .select(
          "id,user_id,plan_id,billing_interval,locked_price_usd_cents,founding_customer,current_period_start,current_period_end"
        )
        .eq(
          "provider",
          "fastspring"
        )
        .eq(
          "provider_subscription_id",
          providerSubscriptionId
        )
        .maybeSingle();

    if (
      lookupError
    ) {
      throw new Error(
        `Subscription lookup failed: ${lookupError.code ?? "unknown"}`
      );
    }

    if (
      data &&
      !isExistingSubscription(
        data
      )
    ) {
      throw new Error(
        "Existing FastSpring subscription state is invalid."
      );
    }

    existing =
      data ?? null;
  }

  let eventForInterpretation =
    event;

  if (
    existing
  ) {
    /*
     * Once provider_subscription_id has
     * been bound, AYZO's subscription
     * ledger becomes canonical for
     * ownership, billing interval and
     * founding locked price.
     *
     * Any conflicting incoming metadata
     * is rejected by the normalizer.
     */
    eventForInterpretation =
      normalizeFastSpringExistingSubscriptionEvent({
        event,

        existing: {
          userId:
            existing.user_id,

          billingInterval:
            existing
              .billing_interval,

          lockedPriceUsdCents:
            existing
              .locked_price_usd_cents,

          monthlyProductPath,

          annualProductPath,
        },
      });

    if (
      existing.billing_interval ===
        "monthly"
    ) {
      monthlyPriceCents =
        existing
          .locked_price_usd_cents;
    } else {
      annualPriceCents =
        existing
          .locked_price_usd_cents;
    }
  }

  const interpretation =
    interpretFastSpringSubscriptionEvent(
      eventForInterpretation,
      {
        monthlyProductPath,
        annualProductPath,
        monthlyPriceCents,
        annualPriceCents,
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

  const canonicalPeriod =
    existing
      ? canonicalizeFastSpringExistingSubscriptionPeriod({
          eventType:
            event.type,

          incomingStart:
            mutation
              .currentPeriodStart,

          incomingEnd:
            mutation
              .currentPeriodEnd,

          existingStart:
            existing
              .current_period_start,

          existingEnd:
            existing
              .current_period_end,
        })
      : {
          currentPeriodStart:
            mutation
              .currentPeriodStart,

          currentPeriodEnd:
            mutation
              .currentPeriodEnd,
        };

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
      canonicalPeriod
        .currentPeriodStart,

    current_period_end:
      canonicalPeriod
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
     * Provider subscription ownership
     * is immutable after first binding.
     */
    if (
      existing.user_id !==
        mutation.userId
    ) {
      throw new Error(
        "FastSpring subscription ownership conflict."
      );
    }

    if (
      existing.billing_interval !==
        mutation.billingInterval ||
      existing.locked_price_usd_cents !==
        mutation.lockedPriceUsdCents
    ) {
      throw new Error(
        "FastSpring subscription contract conflict."
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
    /*
     * First binding still requires
     * the signed AYZO order-tag contract.
     * No DB fallback exists yet.
     */
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
       * Concurrent processing of the
       * same provider subscription must
       * fail closed and let FastSpring
       * retry.
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
