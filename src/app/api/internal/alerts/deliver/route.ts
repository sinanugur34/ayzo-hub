import {
  NextResponse,
} from "next/server";

import {
  isInternalApiRequest,
} from "@/lib/apiSecurity";

import {
  isAlertDeliveryEnabled,
} from "@/lib/alerts/deliveryPolicy";

import {
  MANUAL_ALERT_DELIVERY_CLAIM_LIMIT,
  isValidManualAlertDeliveryClaimLimit,
} from "@/lib/alerts/manualDeliveryPolicy";

import {
  loadAlertDeliveryContext,
} from "@/lib/alerts/deliveryContext";

import {
  claimAlertDeliveries,
  markAlertDeliveryDelivered,
  markAlertDeliveryFailed,
  markAlertDeliveryTerminalFailed,
} from "@/lib/alerts/deliveryStore";

import {
  runAlertDeliveryWorker,
} from "@/lib/alerts/deliveryWorker";

import {
  isResendAlertProviderReady,
  sendResendAlertEmail,
} from "@/lib/alerts/resendProvider";

type ExecuteRequestBody = {
  execute?: unknown;
  claimLimit?: unknown;
};

export async function POST(
  request: Request
) {
  if (
    !isInternalApiRequest(
      request
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Forbidden.",
      },
      {
        status: 403,
      }
    );
  }

  let body:
    ExecuteRequestBody =
    {};

  try {
    const parsed:
      unknown =
      await request.json();

    if (
      parsed &&
      typeof parsed ===
        "object"
    ) {
      body =
        parsed as
          ExecuteRequestBody;
    }
  } catch {
    body = {};
  }

  if (
    body.execute !==
      true
  ) {
    return NextResponse.json(
      {
        ok: false,

        code:
          "EXECUTION_NOT_CONFIRMED",

        error:
          "Explicit execute=true required.",

        deliveryLive:
          false,

        providerCalls:
          0,

        deliveryClaims:
          0,
      },
      {
        status: 400,
      }
    );
  }

  if (
    !isValidManualAlertDeliveryClaimLimit(
      body.claimLimit
    )
  ) {
    return NextResponse.json(
      {
        ok: false,

        code:
          "SINGLE_DELIVERY_LIMIT_REQUIRED",

        error:
          "Explicit claimLimit=1 required for manual delivery execution.",

        deliveryLive:
          false,

        providerCalls:
          0,

        deliveryClaims:
          0,
      },
      {
        status: 400,
      }
    );
  }

  /*
   * Provider readiness is safe to evaluate
   * even while execution is disabled.
   *
   * This lets internal operators verify
   * runtime provider configuration without
   * claiming rows or sending email.
   */
  const providerConfigured =
    isResendAlertProviderReady();

  if (
    !isAlertDeliveryEnabled(
      process.env
        .AYZO_ALERT_DELIVERY_ENABLED
    )
  ) {
    return NextResponse.json(
      {
        ok: false,

        code:
          "ALERT_DELIVERY_DISABLED",

        error:
          "AYZO alert delivery execution is disabled.",

        deliveryExecutionEnabled:
          false,

        deliveryLive:
          false,

        providerConfigured,

        providerCalls:
          0,

        deliveryClaims:
          0,
      },
      {
        status: 503,
      }
    );
  }

  /*
   * PROVIDER SAFETY:
   *
   * Provider readiness is checked before
   * any delivery rows may be claimed.
   */

  if (
    !providerConfigured
  ) {
    return NextResponse.json(
      {
        ok: false,

        code:
          "ALERT_DELIVERY_PROVIDER_NOT_CONFIGURED",

        error:
          "AYZO alert delivery provider is not configured.",

        deliveryExecutionEnabled:
          true,

        deliveryLive:
          false,

        providerConfigured:
          false,

        providerCalls:
          0,

        deliveryClaims:
          0,
      },
      {
        status: 503,
      }
    );
  }

  const summary =
    await runAlertDeliveryWorker({
      isProviderReady:
        isResendAlertProviderReady,

      claim:
        () =>
          claimAlertDeliveries(
            MANUAL_ALERT_DELIVERY_CLAIM_LIMIT
          ),

      loadContext:
        loadAlertDeliveryContext,

      sendEmail:
        sendResendAlertEmail,

      markDelivered:
        markAlertDeliveryDelivered,

      markRetryableFailed:
        markAlertDeliveryFailed,

      markTerminalFailed:
        markAlertDeliveryTerminalFailed,
    });

  return NextResponse.json({
    ok: true,

    mode:
      "delivery-resend-v1",

    deliveryExecutionEnabled:
      true,

    deliveryLive:
      true,

    providerConfigured:
      true,

    providerCalls:
      summary.providerCalls,

    deliveryClaims:
      summary.claimed,

    summary,
  });
}
