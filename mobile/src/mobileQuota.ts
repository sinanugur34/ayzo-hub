export type MobileQuotaStatus = {
  limit: number;
  remaining: number | null;
  resetAt: number | null;
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function readMobileQuotaStatus(
  value: unknown
): MobileQuotaStatus | null {
  if (!isRecord(value)) {
    return null;
  }

  const limit =
    value.limit;

  const remaining =
    value.remaining;

  const resetAt =
    value.resetAt;

  if (
    typeof limit !== "number" ||
    !Number.isFinite(limit) ||
    limit < 0
  ) {
    return null;
  }

  if (
    remaining !== null &&
    (
      typeof remaining !== "number" ||
      !Number.isFinite(remaining) ||
      remaining < 0
    )
  ) {
    return null;
  }

  if (
    resetAt !== null &&
    (
      typeof resetAt !== "number" ||
      !Number.isFinite(resetAt) ||
      resetAt <= 0
    )
  ) {
    return null;
  }

  return {
    limit,
    remaining:
      remaining as number | null,
    resetAt:
      resetAt as number | null,
  };
}
