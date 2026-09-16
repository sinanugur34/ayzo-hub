import "server-only";

import {
  createCreemWebhookAdminClient,
} from "@/lib/billing/creemWebhookAdmin";

import {
  interpretCreemSubscriptionEvent,
} from "@/lib/billing/creemSubscriptionEvent";

import type {
  CreemWebhookEvent,
} from "@/lib/billing/creemWebhookPayload";

export async function processCreemSubscriptionEvent(
  event:
    CreemWebhookEvent
) {
  const mutation =
    interpretCreemSubscriptionEvent(
      event
    );

  if (
    mutation.action ===
      "ignore"
  ) {
    return {
      status:
        "ignored" as const,
    };
  }

  const admin =
    createCreemWebhookAdminClient();

  /*
   * Bind Creem customer identity to exactly
   * one AYZO account. Database uniqueness
   * prevents one Creem customer from being
   * silently claimed by multiple users.
   */
  const {
    error:
      customerError,
  } =
    await admin
      .from(
        "billing_customers"
      )
      .upsert(
        {
          user_id:
            mutation.userId,

          provider:
            "creem",

          provider_customer_id:
            mutation
              .providerCustomerId,
        },
        {
          onConflict:
            "user_id,provider",
        }
      );

  if (customerError) {
    throw new Error(
      "CREEM_CUSTOMER_BIND_FAILED"
    );
  }

  const {
    data:
      existing,
    error:
      existingError,
  } =
    await admin
      .from(
        "subscriptions"
      )
      .select(
        "id,user_id,plan_id,billing_interval,locked_price_usd_cents"
      )
      .eq(
        "provider",
        "creem"
      )
      .eq(
        "provider_subscription_id",
        mutation
          .providerSubscriptionId
      )
      .maybeSingle();

  if (existingError) {
    throw new Error(
      "CREEM_SUBSCRIPTION_LOOKUP_FAILED"
    );
  }

  if (existing) {
    if (
      existing.user_id !==
        mutation.userId
    ) {
      throw new Error(
        "CREEM_SUBSCRIPTION_OWNERSHIP_CONFLICT"
      );
    }

    const contractChanged =
      existing.plan_id !==
        mutation.planId ||
      existing
        .billing_interval !==
        mutation.billingInterval ||
      existing
        .locked_price_usd_cents !==
        mutation.lockedPriceUsdCents;

    const allowedUpgrade =
      existing.plan_id ===
        "pro" &&
      mutation.planId ===
        "advanced";

    if (
      contractChanged &&
      !allowedUpgrade
    ) {
      throw new Error(
        "CREEM_SUBSCRIPTION_CONTRACT_CONFLICT"
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
        .update({
          plan_id:
            mutation.planId,

          billing_interval:
            mutation.billingInterval,

          locked_price_usd_cents:
            mutation.lockedPriceUsdCents,

          status:
            mutation.status,

          current_period_start:
            mutation
              .currentPeriodStart,

          current_period_end:
            mutation
              .currentPeriodEnd,

          cancel_at_period_end:
            mutation
              .cancelAtPeriodEnd,
        })
        .eq(
          "id",
          existing.id
        );

    if (updateError) {
      throw new Error(
        "CREEM_SUBSCRIPTION_UPDATE_FAILED"
      );
    }

    return {
      status:
        "processed" as const,
    };
  }

  const {
    error:
      insertError,
  } =
    await admin
      .from(
        "subscriptions"
      )
      .insert({
        user_id:
          mutation.userId,

        provider:
          "creem",

        provider_subscription_id:
          mutation
            .providerSubscriptionId,

        plan_id:
          mutation.planId,

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
      });

  if (insertError) {
    throw new Error(
      "CREEM_SUBSCRIPTION_INSERT_FAILED"
    );
  }

  return {
    status:
      "processed" as const,
  };
}
