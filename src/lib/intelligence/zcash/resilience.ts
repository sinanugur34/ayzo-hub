import {
  getZcashNownodesEvidence,
} from "./nownodes";

import {
  getZcashBlockchairEvidence,
} from "./provider";

import type {
  ZcashEvidence,
  ZcashProviderResult,
} from "./types";

type Loader =
  (
    input:
      Parameters<
        typeof getZcashBlockchairEvidence
      >[0]
  ) => Promise<
    ZcashProviderResult<
      ZcashEvidence
    >
  >;

export async function getZcashResilientEvidence(
  input:
    Parameters<
      typeof getZcashBlockchairEvidence
    >[0],
  deps: {
    primary?:
      Loader;

    fallback?:
      Loader;
  } = {}
): Promise<
  ZcashProviderResult<
    ZcashEvidence
  >
> {
  const primary =
    await (
      deps.primary ??
      getZcashBlockchairEvidence
    )(
      input
    );

  if (
    primary.ok
  ) {
    return primary;
  }

  /*
   * Validation and canonical absence are not
   * transport failures and must not silently
   * switch providers.
   */
  if (
    primary.code ===
      "INVALID_ADDRESS" ||
    primary.code ===
      "INVALID_TRANSACTION_HASH" ||
    primary.code ===
      "NOT_FOUND"
  ) {
    return primary;
  }

  const fallback =
    await (
      deps.fallback ??
      getZcashNownodesEvidence
    )(
      input
    );

  return fallback.ok
    ? fallback
    : primary;
}
