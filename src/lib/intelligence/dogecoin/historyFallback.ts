import type {
  DogecoinAddressTransactionsProvider,
  DogecoinPaginatedAddressRequest,
} from "./provider";

import type {
  DogecoinAddressHistoryPage,
  DogecoinProviderErrorCode,
  DogecoinProviderResult,
} from "./types";

import {
  blockchairDogecoinProvider,
} from "./providers/blockchair";

import {
  blockCypherDogecoinProvider,
} from "./providers/blockcypher";

type DogecoinHistoryProvider =
  Pick<
    DogecoinAddressTransactionsProvider,
    "getAddressTransactions"
  >;

function shouldUseFallback(
  code: DogecoinProviderErrorCode
): boolean {
  return (
    code === "RATE_LIMITED" ||
    code === "TIMEOUT" ||
    code === "UPSTREAM_ERROR"
  );
}

export async function getDogecoinAddressHistoryWithFallback(
  request: DogecoinPaginatedAddressRequest,
  primary: DogecoinHistoryProvider =
    blockchairDogecoinProvider,
  fallback: DogecoinHistoryProvider =
    blockCypherDogecoinProvider
): Promise<
  DogecoinProviderResult<
    DogecoinAddressHistoryPage
  >
> {
  const primaryResult =
    await primary.getAddressTransactions(
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

  return fallback.getAddressTransactions(
    request
  );
}
