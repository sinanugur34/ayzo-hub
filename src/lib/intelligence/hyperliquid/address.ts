const HYPERLIQUID_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

export function normalizeHyperliquidAddress(
  value:
    string
): string | null {
  const trimmed =
    value.trim();

  if (
    !HYPERLIQUID_ADDRESS.test(
      trimmed
    )
  ) {
    return null;
  }

  return trimmed.toLowerCase();
}

export function isHyperliquidAddress(
  value:
    string
): boolean {
  return (
    normalizeHyperliquidAddress(
      value
    ) !== null
  );
}
