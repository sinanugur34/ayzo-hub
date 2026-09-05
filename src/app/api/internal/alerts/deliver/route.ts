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
   * FOUNDATION SAFETY:
   *
   * There is intentionally no production
   * mail provider adapter yet.
   *
   * runAlertDeliveryWorker checks
   * provider readiness BEFORE calling
   * claimAlertDeliveries().
   *
   * Therefore even if the env gate is
   * temporarily enabled, this route
   * performs zero delivery claims.
   */
  const summary =
    await runAlertDeliveryWorker({
      isProviderReady:
        () => false,

      claim:
        claimAlertDeliveries,

      loadContext:
        loadAlertDeliveryContext,

      sendEmail:
        async () => {
          throw new Error(
            "Alert delivery provider is not configured."
          );
        },

      markDelivered:
        markAlertDeliveryDelivered,

      markRetryableFailed:
        markAlertDeliveryFailed,

      markTerminalFailed:
        markAlertDeliveryTerminalFailed,
    });

  return NextResponse.json({
    ok:
      true,

    mode:
      "delivery-foundation-v1",

    deliveryExecutionEnabled:
      true,

    deliveryLive:
      false,

    providerConfigured:
      false,

    providerCalls:
      summary.providerCalls,

    deliveryClaims:
      summary.claimed,

    summary,
  });
}
