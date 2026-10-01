export type MobileQuotaStatus = {
  limit:
    number;

  remaining:
    number | null;

  resetAt:
    number | null;

  network:
    string | null;

  networkLimit:
    number | null;

  networkRemaining:
    number | null;

  networkResetAt:
    number | null;
};

function isRecord(
  value:
    unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}

function nullableNumber(
  value:
    unknown,
  {
    positiveOnly =
      false,
  }: {
    positiveOnly?:
      boolean;
  } = {}
) {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return null;
  }

  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    ) ||
    (
      positiveOnly
        ? value <=
          0
        : value <
          0
    )
  ) {
    return undefined;
  }

  return value;
}

export function readMobileQuotaStatus(
  value:
    unknown
): MobileQuotaStatus | null {
  if (!isRecord(value)) {
    return null;
  }

  const limit =
    value.limit;

  if (
    typeof limit !==
      "number" ||
    !Number.isFinite(
      limit
    ) ||
    limit <
      0
  ) {
    return null;
  }

  const remaining =
    nullableNumber(
      value.remaining
    );

  const resetAt =
    nullableNumber(
      value.resetAt,
      {
        positiveOnly:
          true,
      }
    );

  const networkLimit =
    nullableNumber(
      value.networkLimit
    );

  const networkRemaining =
    nullableNumber(
      value.networkRemaining
    );

  const networkResetAt =
    nullableNumber(
      value.networkResetAt,
      {
        positiveOnly:
          true,
      }
    );

  if (
    remaining ===
      undefined ||
    resetAt ===
      undefined ||
    networkLimit ===
      undefined ||
    networkRemaining ===
      undefined ||
    networkResetAt ===
      undefined
  ) {
    return null;
  }

  const network =
    typeof value.network ===
      "string"
      ? value.network
      : null;

  return {
    limit,

    remaining,

    resetAt,

    network,

    networkLimit,

    networkRemaining,

    networkResetAt,
  };
}
