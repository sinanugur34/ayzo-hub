import {
  ALERT_DELIVERY_CLAIM_LIMIT,
  buildAlertDeliveryProviderIdempotencyKey,
  type AlertDeliveryChannel,
} from "@/lib/alerts/delivery";

import type {
  AlertDeliveryRow,
} from "@/lib/alerts/deliveryStore";

export type AlertDeliveryEventContext = {
  eventType:
    | "new_activity"
    | "funding_movement"
    | "relationship_change"
    | "contract_activity";

  evidenceState:
    "SUPPORTED";

  evidenceRefs:
    unknown[];

  eventPayload:
    Record<
      string,
      unknown
    >;

  detectedAt:
    string;
};

export type AlertDeliveryRuleContext = {
  network:
    | string
    | null;

  subjectType:
    | string
    | null;

  subjectValue:
    | string
    | null;

  ruleType:
    string;

  deliveryChannel:
    AlertDeliveryChannel;

  enabled:
    boolean;
};

export type AlertDeliveryContext = {
  delivery:
    AlertDeliveryRow;

  event:
    AlertDeliveryEventContext;

  rule:
    AlertDeliveryRuleContext;

    proEntitled:
      boolean;

  recipientEmail:
    string;
};

export type AlertDeliveryEmailMessage = {
  to:
    string;

  subject:
    string;

  text:
    string;

  idempotencyKey:
    string;
};

export type AlertDeliveryProviderResult =
  | {
      status:
        "delivered";

      providerMessageId:
        string;
    }
  | {
      status:
        "retryable_failure";

      errorCode:
        string;
    }
  | {
      status:
        "terminal_failure";

      errorCode:
        string;
    };

export type AlertDeliveryWorkerSummary = {
  skipped:
    boolean;

  skipReason:
    | "provider_not_ready"
    | null;

  claimed:
    number;

  processed:
    number;

  delivered:
    number;

  retryableFailed:
    number;

  terminalFailed:
    number;

  providerCalls:
    number;

  errors:
    number;
};

type ClaimResult = {
  claimToken:
    string;

  rows:
    AlertDeliveryRow[];
};

export type AlertDeliveryWorkerDependencies = {
  isProviderReady:
    () =>
      | boolean
      | Promise<boolean>;

  claim:
    (
      limit: number
    ) =>
      Promise<ClaimResult>;

  loadContext:
    (
      row: AlertDeliveryRow
    ) =>
      Promise<AlertDeliveryContext>;

  sendEmail:
    (
      message:
        AlertDeliveryEmailMessage
    ) =>
      Promise<AlertDeliveryProviderResult>;

  markDelivered:
    (
      row: AlertDeliveryRow,
      claimToken: string,
      providerMessageId: string
    ) =>
      Promise<void>;

  markRetryableFailed:
    (
      row: AlertDeliveryRow,
      claimToken: string,
      errorCode: string
    ) =>
      Promise<void>;

  markTerminalFailed:
    (
      row: AlertDeliveryRow,
      claimToken: string,
      errorCode: string
    ) =>
      Promise<void>;
};

function eventTypeLabel(
  eventType:
    AlertDeliveryEventContext[
      "eventType"
    ]
) {
  switch (eventType) {
    case "new_activity":
      return "New activity detected";

    case "funding_movement":
      return "Funding movement detected";

    case "relationship_change":
      return "Relationship change detected";

    case "contract_activity":
      return "Contract activity detected";
  }
}

export function buildAlertDeliveryEmailMessage(
  context:
    AlertDeliveryContext
):
  AlertDeliveryEmailMessage {
  const {
    delivery,
    event,
    rule,
  } =
    context;

  const recipientEmail =
    context
      .recipientEmail
      .trim()
      .toLowerCase();

  if (!recipientEmail) {
    throw new Error(
      "Alert delivery recipient email is unavailable."
    );
  }

  if (
    delivery.delivery_channel !==
      "email" ||
    rule.deliveryChannel !==
      "email"
  ) {
    throw new Error(
      "Alert delivery email channel mismatch."
    );
  }

  if (
    event.evidenceState !==
      "SUPPORTED"
  ) {
    throw new Error(
      "Alert delivery requires SUPPORTED evidence."
    );
  }

  const detectedAt =
    new Date(
      event.detectedAt
    );

  if (
    Number.isNaN(
      detectedAt.getTime()
    )
  ) {
    throw new Error(
      "Invalid alert delivery detected timestamp."
    );
  }

  const label =
    eventTypeLabel(
      event.eventType
    );

  const network =
    rule.network?.trim() ||
    "Unknown network";

  const subjectType =
    rule.subjectType?.trim() ||
    "monitored target";

  const subjectValue =
    rule.subjectValue?.trim() ||
    "Watchlist target";

  const subject =
    `AYZO Alert — ${label}`;

  const text =
    [
      label,
      "",
      `Network: ${network}`,
      `Target type: ${subjectType}`,
      `Target: ${subjectValue}`,
      `Detected: ${detectedAt.toISOString()}`,
      `Evidence state: ${event.evidenceState}`,
      `Evidence references: ${event.evidenceRefs.length}`,
      "",
      "Open AYZO to review the supporting evidence.",
    ].join(
      "\n"
    );

  return {
    to:
      recipientEmail,

    subject,

    text,

    idempotencyKey:
      buildAlertDeliveryProviderIdempotencyKey(
        delivery.id
      ),
  };
}

function normalizeErrorCode(
  value: string,
  fallback: string
) {
  const normalized =
    value
      .trim()
      .slice(
        0,
        120
      );

  return (
    normalized ||
    fallback
  );
}

export async function runAlertDeliveryWorker(
  dependencies:
    AlertDeliveryWorkerDependencies
):
  Promise<AlertDeliveryWorkerSummary> {
  const summary:
    AlertDeliveryWorkerSummary =
  {
    skipped:
      false,

    skipReason:
      null,

    claimed:
      0,

    processed:
      0,

    delivered:
      0,

    retryableFailed:
      0,

    terminalFailed:
      0,

    providerCalls:
      0,

    errors:
      0,
  };

  /*
   * CRITICAL:
   *
   * Provider readiness is checked BEFORE
   * the database claim.
   *
   * Until a real idempotent provider is
   * configured, no delivery row can become
   * stuck in processing merely because the
   * worker endpoint was invoked.
   */
  if (
    !await dependencies
      .isProviderReady()
  ) {
    return {
      ...summary,

      skipped:
        true,

      skipReason:
        "provider_not_ready",
    };
  }

  const {
    claimToken,
    rows,
  } =
    await dependencies.claim(
      ALERT_DELIVERY_CLAIM_LIMIT
    );

  summary.claimed =
    rows.length;

  async function recordRetryableFailure(
    row:
      AlertDeliveryRow,
    errorCode:
      string
  ) {
    /*
     * Retryable failures become terminal
     * automatically after the configured
     * attempt budget is exhausted.
     */
    if (
      row.attempt_count >=
      row.max_attempts
    ) {
      await dependencies
        .markTerminalFailed(
          row,
          claimToken,
          normalizeErrorCode(
            errorCode,
            "DELIVERY_ATTEMPTS_EXHAUSTED"
          )
        );

      summary.terminalFailed +=
        1;

      return;
    }

    await dependencies
      .markRetryableFailed(
        row,
        claimToken,
        normalizeErrorCode(
          errorCode,
          "DELIVERY_RETRYABLE_FAILURE"
        )
      );

    summary.retryableFailed +=
      1;
  }

  /*
   * Intentionally sequential.
   *
   * Provider concurrency and throughput
   * controls will be introduced only when
   * a real provider is connected.
   */
  for (
    const row of rows
  ) {
    summary.processed +=
      1;

    let context:
      AlertDeliveryContext;

    try {
      context =
        await dependencies
          .loadContext(
            row
          );
    } catch {
      summary.errors +=
        1;

      await recordRetryableFailure(
        row,
        "DELIVERY_CONTEXT_UNAVAILABLE"
      );

      continue;
    }

    if (
      !context.rule.enabled
    ) {
      await dependencies
        .markTerminalFailed(
          row,
          claimToken,
          "ALERT_RULE_DISABLED"
        );

      summary.terminalFailed +=
        1;

      continue;
    }

      if (
        !context.proEntitled
      ) {
        await dependencies
          .markTerminalFailed(
            row,
            claimToken,
            "ALERT_ENTITLEMENT_INACTIVE"
          );

        summary.terminalFailed +=
          1;

        continue;
      }

    if (
      row.delivery_channel !==
        "email" ||
      context.rule
        .deliveryChannel !==
        "email"
    ) {
      await dependencies
        .markTerminalFailed(
          row,
          claimToken,
          "DELIVERY_CHANNEL_UNSUPPORTED"
        );

      summary.terminalFailed +=
        1;

      continue;
    }

    let message:
      AlertDeliveryEmailMessage;

    try {
      message =
        buildAlertDeliveryEmailMessage(
          context
        );
    } catch {
      summary.errors +=
        1;

      await dependencies
        .markTerminalFailed(
          row,
          claimToken,
          "DELIVERY_PAYLOAD_INVALID"
        );

      summary.terminalFailed +=
        1;

      continue;
    }

    let providerResult:
      AlertDeliveryProviderResult;

    try {
      summary.providerCalls +=
        1;

      providerResult =
        await dependencies
          .sendEmail(
            message
          );
    } catch {
      summary.errors +=
        1;

      await recordRetryableFailure(
        row,
        "DELIVERY_PROVIDER_EXCEPTION"
      );

      continue;
    }

    if (
      providerResult.status ===
        "delivered"
    ) {
      const providerMessageId =
        providerResult
          .providerMessageId
          .trim();

      if (!providerMessageId) {
        summary.errors +=
          1;

        await recordRetryableFailure(
          row,
          "DELIVERY_PROVIDER_ID_MISSING"
        );

        continue;
      }

      await dependencies
        .markDelivered(
          row,
          claimToken,
          providerMessageId
        );

      summary.delivered +=
        1;

      continue;
    }

    if (
      providerResult.status ===
        "retryable_failure"
    ) {
      await recordRetryableFailure(
        row,
        providerResult.errorCode
      );

      continue;
    }

    await dependencies
      .markTerminalFailed(
        row,
        claimToken,
        normalizeErrorCode(
          providerResult.errorCode,
          "DELIVERY_TERMINAL_FAILURE"
        )
      );

    summary.terminalFailed +=
      1;
  }

  return summary;
}
