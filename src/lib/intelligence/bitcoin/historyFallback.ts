import type {
  BitcoinAddressTransactionsProvider,
  BitcoinPaginatedAddressRequest,
} from "./provider";

import type {
  BitcoinAddressHistoryPage,
  BitcoinProviderErrorCode,
  BitcoinProviderResult,
} from "./types";

import {
  goldRushBitcoinProvider,
} from "./providers/goldrush";

import {
  mempoolBitcoinProvider,
} from "./providers/mempool";

type BitcoinHistoryProvider =
  Pick<
    BitcoinAddressTransactionsProvider,
    "getAddressTransactions"
  >;

function shouldUseFallback(
  code: BitcoinProviderErrorCode
): boolean {
  switch (code) {
    case "RATE_LIMITED":
    case "TIMEOUT":
    case "UPSTREAM_ERROR":
      return true;

    default:
      return false;
  }
}

export async function getBitcoinAddressHistoryWithFallback(
  request: BitcoinPaginatedAddressRequest,
  primary: BitcoinHistoryProvider =
    goldRushBitcoinProvider,
  fallback: BitcoinHistoryProvider =
    mempoolBitcoinProvider
): Promise<
  BitcoinProviderResult<
    BitcoinAddressHistoryPage
  >
> {
  const primaryResult =
    await primary
      .getAddressTransactions(
        request
      );

  if (primaryResult.ok) {
    return primaryResult;
  }

  if (
    !shouldUseFallback(
      primaryResult.code
    ) ||
    request.signal?.aborted
  ) {
    return primaryResult;
  }

  return fallback
    .getAddressTransactions(
      request
    );
}
