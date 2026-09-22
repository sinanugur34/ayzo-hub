import {
  authenticateMobileRequest,
} from "@/lib/account/mobileRequestAuth";

import {
  acknowledgeGooglePlaySubscription,
  getGooglePlaySubscription,
} from "@/lib/billing/googlePlayApi";

import {
  interpretGooglePlaySubscription,
} from "@/lib/billing/googlePlaySubscriptionCore";

import {
  googlePlayObfuscatedAccountId,
} from "@/lib/billing/googlePlayAccountBinding";

import {
  ensureGooglePlayBillingCustomer,
} from "@/lib/billing/googlePlayBillingCustomer";

import {
  persistGooglePlaySubscription,
} from "@/lib/billing/googlePlaySubscriptionProcessor";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function validPurchaseToken(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.length >= 16 &&
    value.length <= 4096 &&
    value.trim() === value
  );
}

export async function POST(
  request: Request
) {
  const auth =
    await authenticateMobileRequest(
      request
    );

  if (!auth.ok) {
    return Response.json(
      {
        ok: false,
        code:
          auth.code,
        error:
          auth.error,
      },
      {
        status:
          auth.status,
      }
    );
  }

  let body:
    unknown;

  try {
    body =
      await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "Invalid request body.",
      },
      {
        status: 400,
      }
    );
  }

  const purchaseToken =
    typeof body === "object" &&
    body !== null
      ? (
          body as Record<
            string,
            unknown
          >
        ).purchaseToken
      : null;

  if (
    !validPurchaseToken(
      purchaseToken
    )
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Invalid Google Play purchase token.",
      },
      {
        status: 400,
      }
    );
  }

  let providerPayload:
    unknown;

  try {
    providerPayload =
      await getGooglePlaySubscription(
        purchaseToken
      );
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "Google Play verification is unavailable.",
      },
      {
        status: 502,
      }
    );
  }

  const subscription =
    interpretGooglePlaySubscription(
      providerPayload
    );

  if (!subscription) {
    return Response.json(
      {
        ok: false,
        error:
          "Google Play subscription contract is not recognized.",
      },
      {
        status: 409,
      }
    );
  }

  const expectedAccountId =
    googlePlayObfuscatedAccountId(
      auth.identity.userId
    );

  if (
    subscription
      .obfuscatedExternalAccountId !==
    expectedAccountId
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Google Play purchase account does not match the AYZO account.",
      },
      {
        status: 409,
      }
    );
  }

  try {
    await ensureGooglePlayBillingCustomer(
      auth.identity.userId
    );
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "Google Play account mapping could not be stored.",
      },
      {
        status: 500,
      }
    );
  }

  if (
    subscription
      .shouldAcknowledge
  ) {
    try {
      await acknowledgeGooglePlaySubscription({
        productId:
          subscription.productId,

        purchaseToken,
      });
    } catch {
      return Response.json(
        {
          ok: false,
          error:
            "Google Play purchase acknowledgement failed.",
        },
        {
          status: 502,
        }
      );
    }
  }

  try {
    await persistGooglePlaySubscription({
      userId:
        auth.identity.userId,

      purchaseToken,

      subscription,
    });
  } catch (error) {
    const conflict =
      error instanceof Error &&
      (
        error.message ===
          "GOOGLE_PLAY_SUBSCRIPTION_OWNERSHIP_CONFLICT" ||
        error.message ===
          "GOOGLE_PLAY_SUBSCRIPTION_CONTRACT_CONFLICT"
      );

    return Response.json(
      {
        ok: false,
        error:
          conflict
            ? "Google Play subscription ownership conflict."
            : "Google Play subscription could not be stored.",
      },
      {
        status:
          conflict
            ? 409
            : 500,
      }
    );
  }

  return Response.json(
    {
      ok: true,

      plan:
        subscription.planId,

      interval:
        subscription
          .billingInterval,

      status:
        subscription.status,

      currentPeriodEnd:
        subscription
          .currentPeriodEnd,

      testPurchase:
        subscription
          .testPurchase,
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
