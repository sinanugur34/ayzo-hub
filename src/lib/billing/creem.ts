import "server-only";

import type {
  BillingInterval,
  PlanId,
} from "@/lib/plans/types";

type PaidPlanId =
  Exclude<PlanId, "free">;

export type CreemMode =
  | "test"
  | "live";

export type CreemCheckoutInput = {
  userId: string;
  userEmail: string | null;
  planId: PaidPlanId;
  interval: BillingInterval;
};

export type CreemCheckoutResult =
  | {
      ok: true;
      checkoutUrl: string;
      checkoutId: string;
    }
  | {
      ok: false;
      stage:
        | "config"
        | "request"
        | "provider"
        | "response";
      providerStatus:
        number | null;
    };

function requiredEnv(
  name: string
) {
  const value =
    process.env[name]
      ?.trim();

  if (!value) {
    throw new Error(
      `${name} is not configured.`
    );
  }

  return value;
}

function parseMode(
  value:
    string | undefined
): CreemMode {
  const normalized =
    value?.trim();

  if (
    normalized === "test" ||
    normalized === "live"
  ) {
    return normalized;
  }

  throw new Error(
    "Invalid CREEM_MODE."
  );
}

function apiBaseUrl(
  mode: CreemMode
) {
  return mode === "test"
    ? "https://test-api.creem.io"
    : "https://api.creem.io";
}

function productIdFor({
  planId,
  interval,
}: {
  planId: PaidPlanId;
  interval: BillingInterval;
}) {
  if (
    planId === "pro" &&
    interval === "monthly"
  ) {
    return requiredEnv(
      "CREEM_PRO_MONTHLY_PRODUCT_ID"
    );
  }

  if (
    planId === "pro" &&
    interval === "annual"
  ) {
    return requiredEnv(
      "CREEM_PRO_ANNUAL_PRODUCT_ID"
    );
  }

  if (
    planId === "advanced" &&
    interval === "monthly"
  ) {
    return requiredEnv(
      "CREEM_ADVANCED_MONTHLY_PRODUCT_ID"
    );
  }

  return requiredEnv(
    "CREEM_ADVANCED_ANNUAL_PRODUCT_ID"
  );
}

function isCheckoutResponse(
  value: unknown
): value is {
  id: string;
  checkout_url: string;
} {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const row =
    value as Record<
      string,
      unknown
    >;

  return (
    typeof row.id === "string" &&
    row.id.length > 0 &&
    typeof row.checkout_url === "string" &&
    row.checkout_url.startsWith(
      "https://"
    )
  );
}

export async function createCreemCheckout({
  userId,
  userEmail,
  planId,
  interval,
}: CreemCheckoutInput):
  Promise<CreemCheckoutResult> {
  let apiKey:
    string;

  let mode:
    CreemMode;

  let productId:
    string;

  try {
    apiKey =
      requiredEnv(
        "CREEM_API_KEY"
      );

    mode =
      parseMode(
        process.env
          .CREEM_MODE
      );

    productId =
      productIdFor({
        planId,
        interval,
      });
  } catch {
    return {
      ok: false,
      stage: "config",
      providerStatus:
        null,
    };
  }

  const successUrl =
    "https://app.ayzo.io/account?checkout=success";

  const requestId =
    `ayzo:${userId}:${planId}:${interval}:${crypto.randomUUID()}`;

  let response:
    Response;

  try {
    response =
      await fetch(
        `${apiBaseUrl(mode)}/v1/checkouts`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-api-key":
              apiKey,
          },

          body:
            JSON.stringify({
              product_id:
                productId,

              request_id:
                requestId,

              units:
                1,

              ...(userEmail
                ? {
                    customer: {
                      email:
                        userEmail,
                    },
                  }
                : {}),

              success_url:
                successUrl,

              metadata: {
                ayzo_user_id:
                  userId,

                ayzo_plan:
                  planId,

                ayzo_interval:
                  interval,
              },
            }),
        }
      );
  } catch {
    return {
      ok: false,
      stage: "request",
      providerStatus:
        null,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      stage: "provider",
      providerStatus:
        response.status,
    };
  }

  let payload:
    unknown;

  try {
    payload =
      await response.json();
  } catch {
    return {
      ok: false,
      stage: "response",
      providerStatus:
        response.status,
    };
  }

  if (
    !isCheckoutResponse(
      payload
    )
  ) {
    return {
      ok: false,
      stage: "response",
      providerStatus:
        response.status,
    };
  }

  return {
    ok: true,
    checkoutId:
      payload.id,
    checkoutUrl:
      payload.checkout_url,
  };
}
