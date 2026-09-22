import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  googlePlayObfuscatedAccountId,
} from "@/lib/billing/googlePlayAccountBinding";

import {
  googlePlayPurchaseTokenReference,
} from "@/lib/billing/googlePlaySubscriptionProcessor";

export async function ensureGooglePlayBillingCustomer(
  userId: string
) {
  const admin =
    createAdminClient();

  const providerCustomerId =
    googlePlayObfuscatedAccountId(
      userId
    );

  const {
    data: existing,
    error: lookupError,
  } =
    await admin
      .from(
        "billing_customers"
      )
      .select(
        "id,provider_customer_id"
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "provider",
        "google_play"
      )
      .maybeSingle();

  if (lookupError) {
    throw new Error(
      "GOOGLE_PLAY_CUSTOMER_LOOKUP_FAILED"
    );
  }

  if (existing) {
    if (
      existing
        .provider_customer_id !==
      providerCustomerId
    ) {
      throw new Error(
        "GOOGLE_PLAY_CUSTOMER_CONFLICT"
      );
    }

    return;
  }

  const {
    error: insertError,
  } =
    await admin
      .from(
        "billing_customers"
      )
      .insert({
        user_id:
          userId,

        provider:
          "google_play",

        provider_customer_id:
          providerCustomerId,
      });

  if (insertError) {
    throw new Error(
      "GOOGLE_PLAY_CUSTOMER_INSERT_FAILED"
    );
  }
}

export async function resolveGooglePlayRtdnUserId({
  purchaseToken,
  obfuscatedExternalAccountId,
}: {
  purchaseToken: string;
  obfuscatedExternalAccountId:
    string | null;
}) {
  const admin =
    createAdminClient();

  const tokenReference =
    googlePlayPurchaseTokenReference(
      purchaseToken
    );

  const {
    data: subscription,
    error: subscriptionError,
  } =
    await admin
      .from(
        "subscriptions"
      )
      .select(
        "user_id"
      )
      .eq(
        "provider",
        "google_play"
      )
      .eq(
        "provider_subscription_id",
        tokenReference
      )
      .maybeSingle();

  if (subscriptionError) {
    throw new Error(
      "GOOGLE_PLAY_RTDN_SUBSCRIPTION_LOOKUP_FAILED"
    );
  }

  if (subscription?.user_id) {
    return subscription.user_id;
  }

  if (
    !obfuscatedExternalAccountId
  ) {
    return null;
  }

  const {
    data: customer,
    error: customerError,
  } =
    await admin
      .from(
        "billing_customers"
      )
      .select(
        "user_id"
      )
      .eq(
        "provider",
        "google_play"
      )
      .eq(
        "provider_customer_id",
        obfuscatedExternalAccountId
      )
      .maybeSingle();

  if (customerError) {
    throw new Error(
      "GOOGLE_PLAY_RTDN_CUSTOMER_LOOKUP_FAILED"
    );
  }

  return (
    customer?.user_id ??
    null
  );
}
