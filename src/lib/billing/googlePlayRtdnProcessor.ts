import "server-only";

import {
  acknowledgeGooglePlaySubscription,
  getGooglePlaySubscription,
} from "@/lib/billing/googlePlayApi";

import {
  googlePlayObfuscatedAccountId,
} from "@/lib/billing/googlePlayAccountBinding";

import {
  ensureGooglePlayBillingCustomer,
  resolveGooglePlayRtdnUserId,
} from "@/lib/billing/googlePlayBillingCustomer";

import {
  interpretGooglePlaySubscription,
} from "@/lib/billing/googlePlaySubscriptionCore";

import {
  persistGooglePlaySubscription,
} from "@/lib/billing/googlePlaySubscriptionProcessor";

export async function processGooglePlayRtdnSubscription(
  purchaseToken: string
) {
  const providerPayload =
    await getGooglePlaySubscription(
      purchaseToken
    );

  const subscription =
    interpretGooglePlaySubscription(
      providerPayload
    );

  if (!subscription) {
    throw new Error(
      "GOOGLE_PLAY_RTDN_UNRECOGNIZED_SUBSCRIPTION"
    );
  }

  const userId =
    await resolveGooglePlayRtdnUserId({
      purchaseToken,

      obfuscatedExternalAccountId:
        subscription
          .obfuscatedExternalAccountId,
    });

  if (!userId) {
    /*
     * A first-purchase RTDN can race the
     * authenticated mobile verification.
     * Returning a failure asks Pub/Sub to
     * retry after the account mapping exists.
     */
    throw new Error(
      "GOOGLE_PLAY_RTDN_ACCOUNT_NOT_FOUND"
    );
  }

  const expectedAccountId =
    googlePlayObfuscatedAccountId(
      userId
    );

  if (
    subscription
      .obfuscatedExternalAccountId !==
    expectedAccountId
  ) {
    throw new Error(
      "GOOGLE_PLAY_RTDN_ACCOUNT_CONFLICT"
    );
  }

  await ensureGooglePlayBillingCustomer(
    userId
  );

  if (
    subscription
      .shouldAcknowledge
  ) {
    await acknowledgeGooglePlaySubscription({
      productId:
        subscription.productId,

      purchaseToken,
    });
  }

  await persistGooglePlaySubscription({
    userId,
    purchaseToken,
    subscription,
  });

  return {
    plan:
      subscription.planId,

    interval:
      subscription.billingInterval,

    status:
      subscription.status,
  };
}
