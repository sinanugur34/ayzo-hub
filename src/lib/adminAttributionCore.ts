import {
  PRODUCT_EVENT_NAMES,
  type ProductEventName,
} from "./productAnalyticsCore";

export const ADMIN_ATTRIBUTION_EVENTS = [
  "analysis_submitted",
  "intelligence_completed",
  "pricing_viewed",
  "checkout_started",
  "checkout_created",
  "subscription_paid",
] as const satisfies
  readonly ProductEventName[];

export type AdminAttributionEvent =
  typeof ADMIN_ATTRIBUTION_EVENTS[number];

export type AdminAttributionDimension =
  | "channel"
  | "device"
  | "country";

export type AdminAttributionRow = {
  metric:
    string;

  dimension:
    string;

  value:
    string;

  total:
    number |
    string;
};

export type AdminAttributionBucket = {
  value:
    string;

  total:
    number;
};

export type AdminAttributionEventBreakdown = {
  channel:
    AdminAttributionBucket[];

  device:
    AdminAttributionBucket[];

  country:
    AdminAttributionBucket[];
};

export type AdminAuthenticatedAttribution = {
  coverage: {
    recorded:
      number;

    unknown:
      number;

    total:
      number;

    percent:
      number |
      null;
  };

  events:
    Record<
      AdminAttributionEvent,
      AdminAttributionEventBreakdown
    >;
};

const EVENT_SET =
  new Set<string>(
    ADMIN_ATTRIBUTION_EVENTS
  );

function safeCount(
  value:
    number |
    string
) {
  const parsed =
    Number(
      value
    );

  return (
    Number.isFinite(
      parsed
    ) &&
    parsed >= 0
  )
    ? Math.round(
        parsed
      )
    : 0;
}

function emptyBreakdown():
  AdminAttributionEventBreakdown {
  return {
    channel: [],
    device: [],
    country: [],
  };
}

function safeValue(
  value:
    unknown
) {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  if (
    normalized.length < 1 ||
    normalized.length > 80
  ) {
    return null;
  }

  return normalized;
}

export function buildAdminAuthenticatedAttribution(
  rows:
    AdminAttributionRow[]
):
  AdminAuthenticatedAttribution {
  const events =
    Object.fromEntries(
      ADMIN_ATTRIBUTION_EVENTS.map(
        eventName => [
          eventName,
          emptyBreakdown(),
        ]
      )
    ) as
      AdminAuthenticatedAttribution["events"];

  let recorded =
    0;

  let unknown =
    0;

  for (
    const row of
    rows
  ) {
    const total =
      safeCount(
        row.total
      );

    const value =
      safeValue(
        row.value
      );

    if (!value) {
      continue;
    }

    if (
      row.metric ===
        "coverage" &&
      row.dimension ===
        "tracking"
    ) {
      if (
        value ===
          "recorded"
      ) {
        recorded +=
          total;
      }

      if (
        value ===
          "unknown"
      ) {
        unknown +=
          total;
      }

      continue;
    }

    if (
      !EVENT_SET.has(
        row.metric
      )
    ) {
      continue;
    }

    if (
      row.dimension !==
        "channel" &&
      row.dimension !==
        "device" &&
      row.dimension !==
        "country"
    ) {
      continue;
    }

    const eventName =
      row.metric as
        AdminAttributionEvent;

    events[
      eventName
    ][
      row.dimension
    ].push({
      value,
      total,
    });
  }

  for (
    const eventName of
    ADMIN_ATTRIBUTION_EVENTS
  ) {
    for (
      const dimension of [
        "channel",
        "device",
        "country",
      ] as const
    ) {
      events[
        eventName
      ][
        dimension
      ].sort(
        (
          a,
          b
        ) =>
          b.total -
            a.total ||
          a.value.localeCompare(
            b.value
          )
      );
    }
  }

  const total =
    recorded +
    unknown;

  return {
    coverage: {
      recorded,
      unknown,
      total,

      percent:
        total > 0
          ? Math.round(
              (
                recorded /
                total
              ) *
                100
            )
          : null,
    },

    events,
  };
}

export function formatAdminAttributionCoverage(
  value:
    number |
    null
) {
  return value ===
    null
    ? "—"
    : `${value}%`;
}

export function totalAdminAttributionUsers(
  buckets:
    AdminAttributionBucket[]
) {
  return buckets.reduce(
    (
      total,
      item
    ) =>
      total +
      item.total,
    0
  );
}

/*
 * Keep canonical event membership explicit.
 * This catches accidental drift if product events change.
 */
export function isCanonicalAdminAttributionEvent(
  value:
    string
): value is
  AdminAttributionEvent {
  return (
    PRODUCT_EVENT_NAMES.includes(
      value as
        ProductEventName
    ) &&
    EVENT_SET.has(
      value
    )
  );
}
