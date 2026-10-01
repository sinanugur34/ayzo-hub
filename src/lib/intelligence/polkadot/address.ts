/*
 * Foundation-only Polkadot address contract.
 *
 * Full SS58 checksum verification is implemented
 * in the next provider/core wave.
 *
 * This function intentionally fails closed and
 * accepts only canonical-looking Polkadot
 * network addresses with prefix 1.
 */
export function normalizePolkadotAddress(
  value:
    string
): string | null {
  const normalized =
    value.trim();

  if (
    !/^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(
      normalized
    )
  ) {
    return null;
  }

  /*
   * Polkadot account addresses commonly start
   * with "1". Until full SS58 checksum validation
   * lands, reject every other Base58 family.
   */
  if (
    !normalized.startsWith(
      "1"
    )
  ) {
    return null;
  }

  return normalized;
}
