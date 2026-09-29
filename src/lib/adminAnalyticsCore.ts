const SAFE_FAILURE_CODE =
  /^[A-Z0-9][A-Z0-9_:-]{0,119}$/;

export function readAnalysisFailureCode(
  value: unknown
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const code =
    (
      value as Record<
        string,
        unknown
      >
    ).code;

  if (
    typeof code !==
      "string"
  ) {
    return null;
  }

  const normalized =
    code.trim();

  return SAFE_FAILURE_CODE.test(
    normalized
  )
    ? normalized
    : null;
}
