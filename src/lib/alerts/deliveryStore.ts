import "server-only";

import {
  randomUUID,
} from "node:crypto";

import {
  ALERT_DELIVERY_CLAIM_LIMIT,
  buildAlertDeliveryProviderIdempotencyKey,
  getAlertDeliveryNextAttemptAt,
  type AlertDeliveryChannel,
  type AlertDeliveryStatus,
} from "@/lib/alerts/delivery";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export type AlertDeliveryRow = {
  id: string;
  alert_event_id: string;
  alert_rule_id: string;
  user_id: string;
  delivery_channel:
    AlertDeliveryChannel;
  status:
    AlertDeliveryStatus;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at:
    | string
    | null;
  claim_token:
    | string
    | null;
  claimed_at:
    | string
    | null;
  last_error_code:
    | string
    | null;
  last_error_at:
    | string
    | null;
  provider_message_id:
    | string
    | null;
  delivered_at:
    | string
    | null;
  created_at: string;
  updated_at: string;
};

function isDeliveryRow(
  value: unknown
): value is AlertDeliveryRow {
  if (
    typeof value !==
      "object" ||
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
    typeof row.id ===
      "string" &&
    typeof row.alert_event_id ===
      "string" &&
    typeof row.alert_rule_id ===
      "string" &&
    typeof row.user_id ===
      "string" &&
    (
      row.delivery_channel ===
        "email" ||
      row.delivery_channel ===
        "browser" ||
      row.delivery_channel ===
        "telegram"
    ) &&
    (
      row.status ===
        "pending" ||
      row.status ===
        "processing" ||
      row.status ===
        "delivered" ||
      row.status ===
        "failed"
    ) &&
    typeof row.attempt_count ===
      "number" &&
    typeof row.max_attempts ===
      "number"
  );
}

export async function claimAlertDeliveries(
  limit =
    ALERT_DELIVERY_CLAIM_LIMIT
) {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 25
  ) {
    throw new Error(
      "Invalid alert delivery claim limit."
    );
  }

  const admin =
    createAdminClient();

  const claimToken =
    randomUUID();

  const {
    data,
    error,
  } =
    await admin.rpc(
      "ayzo_claim_alert_deliveries",
      {
        p_limit:
          limit,
        p_claim_token:
          claimToken,
      }
    );

  if (error) {
    throw new Error(
      "Unable to claim alert deliveries."
    );
  }

  if (
    !Array.isArray(data)
  ) {
    throw new Error(
      "Invalid alert delivery claim response."
    );
  }

  const rows =
    data.filter(
      isDeliveryRow
    );

  if (
    rows.length !==
    data.length
  ) {
    throw new Error(
      "Invalid alert delivery row."
    );
  }

  for (const row of rows) {
    if (
      row.status !==
        "processing" ||
      row.claim_token !==
        claimToken
    ) {
      throw new Error(
        "Invalid alert delivery claim ownership."
      );
    }
  }

  return {
    claimToken,
    rows,
  };
}

export async function resolveAlertDeliveryEmail(
  userId: string
) {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin.auth.admin.getUserById(
      userId
    );

  if (
    error ||
    !data.user
  ) {
    throw new Error(
      "Unable to resolve alert delivery user."
    );
  }

  const email =
    data.user.email
      ?.trim()
      .toLowerCase();

  if (!email) {
    throw new Error(
      "Alert delivery user has no email."
    );
  }

  return email;
}

export async function markAlertDeliveryDelivered(
  row: AlertDeliveryRow,
  claimToken: string,
  providerMessageId:
    | string
    | null
) {
  buildAlertDeliveryProviderIdempotencyKey(
    row.id
  );

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "alert_deliveries"
      )
      .update({
        status:
          "delivered",

        claim_token:
          null,

        claimed_at:
          null,

        next_attempt_at:
          null,

        last_error_code:
          null,

        provider_message_id:
          providerMessageId,

        delivered_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        row.id
      )
      .eq(
        "status",
        "processing"
      )
      .eq(
        "claim_token",
        claimToken
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    throw new Error(
      "Unable to finalize alert delivery."
    );
  }
}

export async function markAlertDeliveryFailed(
  row: AlertDeliveryRow,
  claimToken: string,
  errorCode: string
) {
  const normalizedErrorCode =
    errorCode
      .trim()
      .slice(
        0,
        120
      );

  if (
    !normalizedErrorCode
  ) {
    throw new Error(
      "Alert delivery failure code required."
    );
  }

  const now =
    new Date();

  const nextAttemptAt =
    row.attempt_count >=
      row.max_attempts
      ? null
      : getAlertDeliveryNextAttemptAt(
          row.attempt_count,
          now
        );

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "alert_deliveries"
      )
      .update({
        status:
          "failed",

        claim_token:
          null,

        claimed_at:
          null,

        next_attempt_at:
          nextAttemptAt,

        last_error_code:
          normalizedErrorCode,

        last_error_at:
          now.toISOString(),

        delivered_at:
          null,
      })
      .eq(
        "id",
        row.id
      )
      .eq(
        "status",
        "processing"
      )
      .eq(
        "claim_token",
        claimToken
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    throw new Error(
      "Unable to record alert delivery failure."
    );
  }
}

export async function markAlertDeliveryTerminalFailed(
  row: AlertDeliveryRow,
  claimToken: string,
  errorCode: string
) {
  const normalizedErrorCode =
    errorCode
      .trim()
      .slice(
        0,
        120
      );

  if (!normalizedErrorCode) {
    throw new Error(
      "Alert delivery terminal failure code required."
    );
  }

  const now =
    new Date();

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "alert_deliveries"
      )
      .update({
        status:
          "failed",

        claim_token:
          null,

        claimed_at:
          null,

        next_attempt_at:
          null,

        last_error_code:
          normalizedErrorCode,

        last_error_at:
          now.toISOString(),

        delivered_at:
          null,
      })
      .eq(
        "id",
        row.id
      )
      .eq(
        "status",
        "processing"
      )
      .eq(
        "claim_token",
        claimToken
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    throw new Error(
      "Unable to record terminal alert delivery failure."
    );
  }
}
