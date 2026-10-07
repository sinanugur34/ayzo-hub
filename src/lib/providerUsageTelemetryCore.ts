export type ProviderUsagePlatform =
  | "web"
  | "android"
  | "ios"
  | "api"
  | "internal";

export type ProviderUsagePlan =
  | "free"
  | "pro"
  | "advanced";

export type ProviderUsageOutcome =
  | "success"
  | "rate_limited"
  | "timeout"
  | "upstream_error"
  | "validation_error"
  | "unavailable"
  | "cache_hit";

export type ProviderUsageContext = {
  analysisId:
    string;

  userId:
    string | null;

  platform:
    ProviderUsagePlatform;

  planId:
    ProviderUsagePlan;

  network:
    string;
};

export type ProviderUsageCaptureInput = {
  provider:
    string;

  operation:
    string;

  outcome:
    ProviderUsageOutcome;

  latencyMs?:
    number | null;

  httpStatus?:
    number | null;

  errorCode?:
    string | null;

  attempt?:
    number;

  fallbackUsed?:
    boolean;

  cacheHit?:
    boolean;

  estimatedUnits?:
    number | null;

  metadata?:
    Readonly<
      Record<
        string,
        string |
        number |
        boolean |
        null
      >
    >;
};

export type ProviderUsageEvent =
  ProviderUsageContext & {
    provider:
      string;

    operation:
      string;

    outcome:
      ProviderUsageOutcome;

    latencyMs:
      number | null;

    httpStatus:
      number | null;

    errorCode:
      string | null;

    attempt:
      number;

    fallbackUsed:
      boolean;

    cacheHit:
      boolean;

    estimatedUnits:
      number | null;

    metadata:
      Readonly<
        Record<
          string,
          string |
          number |
          boolean |
          null
        >
      >;
  };

export type ProviderUsageSummaryRow = {
  provider:
    string;

  operation:
    string;

  requestCount:
    number;

  successCount:
    number;

  failureCount:
    number;

  rateLimitedCount:
    number;

  timeoutCount:
    number;

  cacheHitCount:
    number;

  fallbackCount:
    number;

  totalLatencyMs:
    number;

  maxLatencyMs:
    number;

  estimatedUnits:
    number;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SAFE_METADATA_KEY =
  /^[a-z][a-z0-9_]{0,39}$/;

const FORBIDDEN_METADATA_KEYS =
  new Set([
    "address",
    "wallet",
    "token",
    "contract",
    "subject",
    "email",
    "ip",
    "ip_address",
    "device",
    "device_id",
    "api_key",
    "apikey",
    "authorization",
    "secret",
    "password",
    "request",
    "request_body",
    "response",
    "raw",
    "payload",
  ]);

function boundedString(
  value:
    string,
  maxLength:
    number
) {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      "Telemetry string must not be empty."
    );
  }

  return normalized.slice(
    0,
    maxLength
  );
}

function boundedNullableString(
  value:
    string |
    null |
    undefined,
  maxLength:
    number
) {
  if (!value) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized
    ? normalized.slice(
        0,
        maxLength
      )
    : null;
}

function boundedInteger(
  value:
    number |
    null |
    undefined,
  {
    min,
    max,
  }: {
    min:
      number;

    max:
      number;
  }
) {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    )
  ) {
    return null;
  }

  return Math.min(
    max,
    Math.max(
      min,
      Math.round(
        value
      )
    )
  );
}

function boundedUnits(
  value:
    number |
    null |
    undefined
) {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    ) ||
    value < 0
  ) {
    return null;
  }

  return Math.min(
    value,
    1_000_000_000
  );
}

function safeMetadata(
  input:
    ProviderUsageCaptureInput[
      "metadata"
    ]
) {
  if (!input) {
    return {};
  }

  const output:
    Record<
      string,
      string |
      number |
      boolean |
      null
    > = {};

  const entries =
    Object.entries(
      input
    )
      .slice(
        0,
        20
      );

  for (
    const [
      rawKey,
      rawValue,
    ] of entries
  ) {
    const key =
      rawKey
        .trim()
        .toLowerCase();

    if (
      !SAFE_METADATA_KEY.test(
        key
      ) ||
      FORBIDDEN_METADATA_KEYS.has(
        key
      )
    ) {
      continue;
    }

    if (
      typeof rawValue ===
        "string"
    ) {
      output[key] =
        rawValue
          .trim()
          .slice(
            0,
            120
          );

      continue;
    }

    if (
      typeof rawValue ===
        "number"
    ) {
      if (
        Number.isFinite(
          rawValue
        )
      ) {
        output[key] =
          rawValue;
      }

      continue;
    }

    if (
      typeof rawValue ===
        "boolean" ||
      rawValue ===
        null
    ) {
      output[key] =
        rawValue;
    }
  }

  return output;
}

export function normalizeProviderUsageContext(
  input:
    ProviderUsageContext
): ProviderUsageContext {
  if (
    !UUID.test(
      input.analysisId
    )
  ) {
    throw new Error(
      "Invalid telemetry analysis id."
    );
  }

  if (
    input.userId !==
      null &&
    !UUID.test(
      input.userId
    )
  ) {
    throw new Error(
      "Invalid telemetry user id."
    );
  }

  return {
    analysisId:
      input.analysisId
        .toLowerCase(),

    userId:
      input.userId
        ?.toLowerCase() ??
      null,

    platform:
      input.platform,

    planId:
      input.planId,

    network:
      boundedString(
        input.network,
        64
      ),
  };
}

export function buildProviderUsageEvent(
  context:
    ProviderUsageContext,

  input:
    ProviderUsageCaptureInput
): ProviderUsageEvent {
  const normalizedContext =
    normalizeProviderUsageContext(
      context
    );

  const httpStatus =
    boundedInteger(
      input.httpStatus,
      {
        min:
          100,

        max:
          599,
      }
    );

  return {
    ...normalizedContext,

    provider:
      boundedString(
        input.provider,
        64
      ),

    operation:
      boundedString(
        input.operation,
        120
      ),

    outcome:
      input.outcome,

    latencyMs:
      boundedInteger(
        input.latencyMs,
        {
          min:
            0,

          max:
            3_600_000,
        }
      ),

    httpStatus,

    errorCode:
      boundedNullableString(
        input.errorCode,
        120
      ),

    attempt:
      boundedInteger(
        input.attempt ??
          1,
        {
          min:
            1,

          max:
            20,
        }
      ) ??
      1,

    fallbackUsed:
      input.fallbackUsed ===
        true,

    cacheHit:
      input.cacheHit ===
        true,

    estimatedUnits:
      boundedUnits(
        input.estimatedUnits
      ),

    metadata:
      safeMetadata(
        input.metadata
      ),
  };
}

export function summarizeProviderUsage(
  events:
    readonly ProviderUsageEvent[]
): readonly ProviderUsageSummaryRow[] {
  const rows =
    new Map<
      string,
      ProviderUsageSummaryRow
    >();

  for (
    const event of events
  ) {
    const key =
      `${event.provider}\u0000${event.operation}`;

    const current =
      rows.get(
        key
      ) ?? {
        provider:
          event.provider,

        operation:
          event.operation,

        requestCount:
          0,

        successCount:
          0,

        failureCount:
          0,

        rateLimitedCount:
          0,

        timeoutCount:
          0,

        cacheHitCount:
          0,

        fallbackCount:
          0,

        totalLatencyMs:
          0,

        maxLatencyMs:
          0,

        estimatedUnits:
          0,
      };

    if (
      !event.cacheHit &&
      event.outcome !==
        "cache_hit"
    ) {
      current.requestCount +=
        1;
    }

    if (
      event.outcome ===
        "success" ||
      event.outcome ===
        "cache_hit"
    ) {
      current.successCount +=
        1;
    } else {
      current.failureCount +=
        1;
    }

    if (
      event.outcome ===
        "rate_limited"
    ) {
      current.rateLimitedCount +=
        1;
    }

    if (
      event.outcome ===
        "timeout"
    ) {
      current.timeoutCount +=
        1;
    }

    if (
      event.cacheHit ||
      event.outcome ===
        "cache_hit"
    ) {
      current.cacheHitCount +=
        1;
    }

    if (
      event.fallbackUsed
    ) {
      current.fallbackCount +=
        1;
    }

    const latency =
      event.latencyMs ??
      0;

    current.totalLatencyMs +=
      latency;

    current.maxLatencyMs =
      Math.max(
        current.maxLatencyMs,
        latency
      );

    current.estimatedUnits +=
      event.estimatedUnits ??
      0;

    rows.set(
      key,
      current
    );
  }

  return [
    ...rows.values(),
  ].sort(
    (
      left,
      right
    ) =>
      right.requestCount -
        left.requestCount ||
      left.provider.localeCompare(
        right.provider
      ) ||
      left.operation.localeCompare(
        right.operation
      )
  );
}
