export const PRODUCT_EVENT_NAMES = [
  "product_session_started",
  "example_gallery_viewed",
  "example_opened",
  "example_cta_clicked",
  "analysis_submitted",
  "analysis_started",
  "intelligence_completed",
  "analysis_failed",
  "analysis_quota_blocked",
  "login_started",
  "login_failed",
  "login_link_sent",
  "analysis_saved",
  "watchlist_item_added",
  "smart_alert_enabled",
  "ask_ayzo_opened",
  "pricing_viewed",
  "checkout_started",
  "checkout_auth_required",
  "checkout_failed",
  "checkout_created",
  "subscription_upgraded",
] as const;

export type ProductEventName =
  typeof PRODUCT_EVENT_NAMES[number];

export type ProductEventProperty =
  | string
  | number
  | boolean;

export type ProductEventProperties =
  Record<
    string,
    ProductEventProperty
  >;

const EVENT_NAMES =
  new Set<string>(
    PRODUCT_EVENT_NAMES
  );

const SAFE_PROPERTY_KEYS =
  new Set([
    "surface",
    "network",
    "plan",
    "interval",
    "method",
    "action",
    "status",
    "provider",
    "result",
    "source",
    "flow",
    "feature",
  ]);

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safePropertyValue(
  value: unknown
):
  ProductEventProperty |
  null {
  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  if (
    typeof value ===
    "number" &&
    Number.isFinite(
      value
    ) &&
    Math.abs(value) <=
      1_000_000_000
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    const normalized =
      value.trim();

    if (
      normalized.length >= 1 &&
      normalized.length <= 80
    ) {
      return normalized;
    }
  }

  return null;
}

export function sanitizeProductEventPayload(
  value: unknown
): {
  eventName:
    ProductEventName;

  sessionId:
    string;

  properties:
    ProductEventProperties;
} | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  const row =
    value as Record<
      string,
      unknown
    >;

  if (
    typeof row.eventName !==
      "string" ||
    !EVENT_NAMES.has(
      row.eventName
    )
  ) {
    return null;
  }

  if (
    typeof row.sessionId !==
      "string" ||
    !UUID.test(
      row.sessionId
    )
  ) {
    return null;
  }

  const properties:
    ProductEventProperties =
      {};

  if (
    row.properties &&
    typeof row.properties ===
      "object" &&
    !Array.isArray(
      row.properties
    )
  ) {
    for (
      const [
        key,
        candidate,
      ] of Object.entries(
        row.properties
      )
    ) {
      if (
        !SAFE_PROPERTY_KEYS.has(
          key
        )
      ) {
        continue;
      }

      const safe =
        safePropertyValue(
          candidate
        );

      if (
        safe !==
        null
      ) {
        properties[
          key
        ] =
          safe;
      }
    }
  }

  return {
    eventName:
      row.eventName as
        ProductEventName,

    sessionId:
      row.sessionId
        .toLowerCase(),

    properties,
  };
}
