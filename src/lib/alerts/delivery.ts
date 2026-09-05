export const ALERT_DELIVERY_CLAIM_LIMIT =
  10;

export const ALERT_DELIVERY_MAX_ATTEMPTS =
  3;

export const ALERT_DELIVERY_RETRY_SECONDS =
  [
    60,
    5 * 60,
  ] as const;

export type AlertDeliveryChannel =
  | "email"
  | "browser"
  | "telegram";

export type AlertDeliveryStatus =
  | "pending"
  | "processing"
  | "delivered"
  | "failed";

export function getAlertDeliveryRetryDelaySeconds(
  attemptCount: number
):
  | number
  | null {
  if (
    !Number.isInteger(
      attemptCount
    ) ||
    attemptCount < 1
  ) {
    throw new Error(
      "Invalid alert delivery attempt count."
    );
  }

  if (
    attemptCount >=
    ALERT_DELIVERY_MAX_ATTEMPTS
  ) {
    return null;
  }

  const index =
    attemptCount - 1;

  return (
    ALERT_DELIVERY_RETRY_SECONDS[
      index
    ] ??
    ALERT_DELIVERY_RETRY_SECONDS[
      ALERT_DELIVERY_RETRY_SECONDS.length -
        1
    ]
  );
}

export function getAlertDeliveryNextAttemptAt(
  attemptCount: number,
  now: Date
):
  | string
  | null {
  const delaySeconds =
    getAlertDeliveryRetryDelaySeconds(
      attemptCount
    );

  if (
    delaySeconds === null
  ) {
    return null;
  }

  return new Date(
    now.getTime() +
      delaySeconds * 1000
  ).toISOString();
}

export function buildAlertDeliveryProviderIdempotencyKey(
  deliveryId: string
) {
  const normalized =
    deliveryId.trim();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized
    )
  ) {
    throw new Error(
      "Invalid alert delivery id."
    );
  }

  return (
    "ayzo-alert-delivery:" +
    normalized.toLowerCase()
  );
}
