export const subjectTypes = [
  "wallet",
  "token",
  "transaction",
  "entity",
  "protocol",
] as const;

export type SubjectType =
  (typeof subjectTypes)[number];

export function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function readRequiredString(
  value: unknown,
  maxLength: number
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  if (
    !trimmed ||
    trimmed.length >
      maxLength
  ) {
    return null;
  }

  return trimmed;
}

export function readOptionalString(
  value: unknown,
  maxLength: number
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return readRequiredString(
    value,
    maxLength
  );
}

export function readSubjectType(
  value: unknown
): SubjectType | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  return subjectTypes.includes(
    value as SubjectType
  )
    ? (value as SubjectType)
    : null;
}

export function requestTooLarge(
  request: Request,
  maxBytes = 524_288
) {
  const raw =
    request.headers.get(
      "content-length"
    );

  if (!raw) {
    return false;
  }

  const length =
    Number(raw);

  return (
    Number.isFinite(length) &&
    length > maxBytes
  );
}
