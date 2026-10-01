const ALGORAND_ADDRESS =
  /^[A-Z2-7]{58}$/;

export function normalizeAlgorandAddress(
  input: string
): string | null {
  const value =
    input
      .trim()
      .toUpperCase();

  if (
    !ALGORAND_ADDRESS.test(
      value
    )
  ) {
    return null;
  }

  return value;
}
