const HYPERLIQUID_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

export function isHyperliquidAddress(
  value: string
): boolean {
  return HYPERLIQUID_ADDRESS.test(
    value.trim()
  );
}
