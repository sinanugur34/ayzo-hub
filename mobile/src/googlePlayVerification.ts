import {
  CapacitorHttp,
} from "@capacitor/core";

import {
  getMobileAuthHeaders,
  MOBILE_API_BASE_URL,
} from "./mobileSession";

import type {
  BillingInterval,
  PlanId,
} from "../../src/lib/plans/types";

export type GooglePlayVerificationResult = {
  ok: true;
  plan: Exclude<
    PlanId,
    "free"
  >;
  interval: BillingInterval;
  status: string;
  currentPeriodEnd: string | null;
  testPurchase: boolean;
};

export async function verifyGooglePlayPurchase(
  purchaseToken: string
): Promise<
  GooglePlayVerificationResult
> {
  const headers =
    await getMobileAuthHeaders();

  const response =
    await CapacitorHttp.request({
      url:
        `${MOBILE_API_BASE_URL}/api/mobile/billing/google-play/verify`,

      method:
        "POST",

      headers: {
        ...headers,
        "Content-Type":
          "application/json",
      },

      data: {
        purchaseToken,
      },
    });

  const body =
    response.data;

  if (
    response.status < 200 ||
    response.status >= 300 ||
    !body?.ok
  ) {
    throw new Error(
      body?.error ??
      "Google Play purchase verification failed."
    );
  }

  return body as GooglePlayVerificationResult;
}
