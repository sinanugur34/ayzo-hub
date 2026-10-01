export type NearAccountKind =
  | "named"
  | "implicit"
  | "eth-implicit"
  | "near-deterministic";

const NAMED_PART =
  /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

const IMPLICIT =
  /^[0-9a-f]{64}$/;

const ETH_IMPLICIT =
  /^0x[0-9a-f]{40}$/;

const NEAR_DETERMINISTIC =
  /^0s[0-9a-f]{40}$/;

export function classifyNearAccountId(
  value:
    string
): NearAccountKind | null {
  const accountId =
    value.trim();

  if (
    accountId.length < 2 ||
    accountId.length > 64
  ) {
    return null;
  }

  if (
    IMPLICIT.test(
      accountId
    )
  ) {
    return "implicit";
  }

  if (
    ETH_IMPLICIT.test(
      accountId
    )
  ) {
    return "eth-implicit";
  }

  if (
    NEAR_DETERMINISTIC.test(
      accountId
    )
  ) {
    return "near-deterministic";
  }

  const parts =
    accountId.split(".");

  if (
    parts.some(
      part =>
        !NAMED_PART.test(
          part
        )
    )
  ) {
    return null;
  }

  return "named";
}

export function normalizeNearAccountId(
  value:
    string
): string | null {
  const trimmed =
    value.trim();

  return (
    classifyNearAccountId(
      trimmed
    ) !== null
  )
    ? trimmed
    : null;
}

export function isNearAccountId(
  value:
    string
) {
  return (
    normalizeNearAccountId(
      value
    ) !== null
  );
}
