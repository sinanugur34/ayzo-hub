import {
  NextResponse,
} from "next/server";

import {
  isInternalApiRequest,
} from "@/lib/apiSecurity";

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
};

function isDeliveryExecutionEnabled() {
  return (
    process.env
      .AYZO_ALERT_DELIVERY_ENABLED
      ?.trim()
      .toLowerCase() ===
    "true"
  );
}

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
    !isDeliveryExecutionEnabled()
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

  /*
   * PROVIDER SAFETY:
   *
   * Provider readiness is checked before
   * any delivery rows may be claimed.
   */
  const providerConfigured =
    isResendAlertProviderReady();

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
        claimAlertDeliveries,

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
