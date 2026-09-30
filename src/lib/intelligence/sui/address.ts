const SUI_ADDRESS =
  /^0x[0-9a-fA-F]{1,64}$/;

export function normalizeSuiAddress(
  value: string
): string | null {
  const trimmed =
    value.trim();

  if (
    !SUI_ADDRESS.test(
      trimmed
    )
  ) {
    return null;
  }

  const hex =
    trimmed
      .slice(2)
      .toLowerCase();

  return (
    "0x" +
    hex.padStart(
      64,
      "0"
    )
  );
}

export function isSuiAddress(
  value: string
): boolean {
  return (
    normalizeSuiAddress(
      value
    ) !== null
  );
}
