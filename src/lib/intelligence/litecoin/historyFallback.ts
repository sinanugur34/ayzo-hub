import { runWithProviderUsageHintsCore } from "@/lib/providerUsageScopeCore";
import type {
  LitecoinAddressTransactionsProvider,
  LitecoinPaginatedAddressRequest,
} from "./provider";

import type {
  LitecoinAddressHistoryPage,
  LitecoinProviderErrorCode,
  LitecoinProviderResult,
} from "./types";

import {
  blockchairLitecoinProvider,
} from "./providers/blockchair";

import {
  blockCypherLitecoinProvider,
} from "./providers/blockcypher";

type LitecoinHistoryProvider =
  Pick<
    LitecoinAddressTransactionsProvider,
    "getAddressTransactions"
  >;

function shouldUseFallback(
  code: LitecoinProviderErrorCode
): boolean {
  return (
    code === "RATE_LIMITED" ||
    code === "TIMEOUT" ||
    code === "UPSTREAM_ERROR"
  );
}

export async function getLitecoinAddressHistoryWithFallback(
  request: LitecoinPaginatedAddressRequest,
  primary: LitecoinHistoryProvider =
    blockchairLitecoinProvider,
  fallback: LitecoinHistoryProvider =
    blockCypherLitecoinProvider
): Promise<
  LitecoinProviderResult<
    LitecoinAddressHistoryPage
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

  return runWithProviderUsageHintsCore(
    {
      fallbackUsed:
        true,
    },

    () =>
      fallback.getAddressTransactions(
        request
      )
  );
}
