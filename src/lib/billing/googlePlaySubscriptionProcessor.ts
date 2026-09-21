import "server-only";

import {
  createHash,
} from "node:crypto";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import type {
  VerifiedGooglePlaySubscription,
} from "@/lib/billing/googlePlaySubscriptionCore";

function purchaseTokenReference(
  purchaseToken: string
) {
  const hash =
    createHash(
      "sha256"
    );

  hash.update(
    "ayzo:google-play:purchase-token:v1\0"
  );

  hash.update(
    purchaseToken
  );

  return (
    "sha256:" +
    hash.digest(
      "hex"
    )
  );
}

export async function persistGooglePlaySubscription({
  userId,
  purchaseToken,
  subscription,
}: {
  userId: string;
  purchaseToken: string;
  subscription:
    VerifiedGooglePlaySubscription;
}) {
  const admin =
    createAdminClient();

  const providerSubscriptionId =
    purchaseTokenReference(
      purchaseToken
    );

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
        "id,user_id,plan_id,billing_interval"
      )
      .eq(
        "provider",
        "google_play"
      )
      .eq(
        "provider_subscription_id",
        providerSubscriptionId
      )
      .maybeSingle();

  if (lookupError) {
    throw new Error(
      "GOOGLE_PLAY_SUBSCRIPTION_LOOKUP_FAILED"
    );
  }

  if (existing) {
    if (
      existing.user_id !==
        userId
    ) {
      throw new Error(
        "GOOGLE_PLAY_SUBSCRIPTION_OWNERSHIP_CONFLICT"
      );
    }

    if (
      existing.plan_id !==
        subscription.planId ||
      existing
        .billing_interval !==
        subscription
          .billingInterval
    ) {
      throw new Error(
        "GOOGLE_PLAY_SUBSCRIPTION_CONTRACT_CONFLICT"
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
          status:
            subscription.status,

          locked_price_usd_cents:
            subscription
              .lockedPriceUsdCents,

          current_period_start:
            subscription
              .currentPeriodStart,

          current_period_end:
            subscription
              .currentPeriodEnd,

          cancel_at_period_end:
            subscription
              .cancelAtPeriodEnd,
        })
        .eq(
          "id",
          existing.id
        );

    if (updateError) {
      throw new Error(
        "GOOGLE_PLAY_SUBSCRIPTION_UPDATE_FAILED"
      );
    }

    return;
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
          userId,

        provider:
          "google_play",

        provider_subscription_id:
          providerSubscriptionId,

        plan_id:
          subscription.planId,

        billing_interval:
          subscription
            .billingInterval,

        status:
          subscription.status,

        locked_price_usd_cents:
          subscription
            .lockedPriceUsdCents,

        current_period_start:
          subscription
            .currentPeriodStart,

        current_period_end:
          subscription
            .currentPeriodEnd,

        cancel_at_period_end:
          subscription
            .cancelAtPeriodEnd,

        founding_customer:
          false,
      });

  if (insertError) {
    throw new Error(
      "GOOGLE_PLAY_SUBSCRIPTION_INSERT_FAILED"
    );
  }
}
