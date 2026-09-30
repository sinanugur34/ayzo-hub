const SUI_ADDRESS =
  /^0x[0-9a-fA-F]{64}$/;

export function isSuiAddress(
  value: string
): boolean {
  return SUI_ADDRESS.test(
    value.trim()
  );
}
