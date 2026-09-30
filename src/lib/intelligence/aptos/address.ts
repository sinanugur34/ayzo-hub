const APTOS_ADDRESS =
  /^(?:0x)?[0-9a-fA-F]{1,64}$/;

export function normalizeAptosAddress(
  value:
    string
): string | null {
  const trimmed =
    value.trim();

  if (
    !APTOS_ADDRESS.test(
      trimmed
    )
  ) {
    return null;
  }

  const hex =
    (
      trimmed.startsWith(
        "0x"
      ) ||
      trimmed.startsWith(
        "0X"
      )
        ? trimmed.slice(2)
        : trimmed
    )
      .toLowerCase();

  if (
    hex.length === 0 ||
    hex.length > 64
  ) {
    return null;
  }

  return (
    "0x" +
    hex.padStart(
      64,
      "0"
    )
  );
}

export function isAptosAddress(
  value:
    string
) {
  return (
    normalizeAptosAddress(
      value
    ) !== null
  );
}
