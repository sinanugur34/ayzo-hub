import { isGoldRushExitCanaryActive } from "@/lib/goldRushExitCanary";
import { runWithProviderUsageHintsCore } from "@/lib/providerUsageScopeCore";
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

/**
 * Mempool history pages accept at most 25 items, while the Advanced
 * investigation policy requests 30. Compose bounded continuation pages
 * rather than reporting a valid address as INVALID_ADDRESS via INVALID_LIMIT.
 * No more than three pages or 30 transactions. All results are untrusted.
 */
async function getPagedPrimaryBitcoinHistory(
  request: BitcoinPaginatedAddressRequest,
  primary: BitcoinHistoryProvider
): Promise<BitcoinProviderResult<BitcoinAddressHistoryPage>> {
  const requested = request.limit;
  if (
    typeof requested !== "number" ||
    !Number.isSafeInteger(requested) ||
    requested <= 25 ||
    requested > 30
  ) {
    return primary.getAddressTransactions(request);
  }

  const transactions: BitcoinAddressHistoryPage["transactions"][number][] = [];
  const seenHashes = new Set<string>();
  const seenCursors = new Set<string>();
  let cursor = request.cursor ?? null;
  let providerId: BitcoinProviderResult<BitcoinAddressHistoryPage>["providerId"] | null = null;
  let latencyMs = 0;
  let lastResult: BitcoinProviderResult<BitcoinAddressHistoryPage> | null = null;

  for (let page = 0; page < 3 && transactions.length < requested; page += 1) {
    const remaining = requested - transactions.length;
    const pageLimit = Math.min(25, remaining);
    const result = await primary.getAddressTransactions({
      ...request,
      limit: pageLimit,
      cursor,
    });
    if (!result.ok) return result;
    lastResult = result;

    if (providerId !== null && result.providerId !== providerId) {
      return {
        ok: false,
        providerId: result.providerId,
        latencyMs: result.latencyMs,
        code: "UPSTREAM_ERROR",
        error: "Bitcoin history provider changed during pagination.",
      };
    }
    providerId = result.providerId;
    latencyMs += result.latencyMs;
    if (result.data.transactions.length > pageLimit) {
      return {
        ok: false,
        providerId: result.providerId,
        latencyMs,
        code: "UPSTREAM_ERROR",
        error: "Bitcoin history page exceeded the requested limit.",
      };
    }
    for (const item of result.data.transactions) {
      const hash = item.transactionHash.toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(hash) || seenHashes.has(hash)) {
        return {
          ok: false,
          providerId: result.providerId,
          latencyMs,
          code: "UPSTREAM_ERROR",
          error: "Bitcoin history pagination contained invalid or duplicate evidence.",
        };
      }
      seenHashes.add(hash);
      transactions.push(item);
    }
    const next = result.data.nextCursor;
    if (next !== null && next !== undefined) {
      if (
        !/^[0-9a-fA-F]{64}$/.test(next) ||
        seenCursors.has(next.toLowerCase()) ||
        (result.data.transactions.length > 0 &&
          next.toLowerCase() !== result.data.transactions.at(-1)!.transactionHash.toLowerCase())
      ) {
        return {
          ok: false,
          providerId: result.providerId,
          latencyMs,
          code: "UPSTREAM_ERROR",
          error: "Bitcoin history continuation cursor is inconsistent.",
        };
      }
      seenCursors.add(next.toLowerCase());
    }
    cursor = next ?? null;
    if (!cursor) break;
    if (result.data.transactions.length === 0) {
      return {
        ok: false,
        providerId: result.providerId,
        latencyMs,
        code: "UPSTREAM_ERROR",
        error: "Bitcoin history returned an empty page with a continuation.",
      };
    }
  }
  if (!lastResult || (transactions.length < requested && cursor)) {
    return {
      ok: false,
      providerId: providerId ?? "mempool",
      latencyMs,
      code: "UPSTREAM_ERROR",
      error: "Bitcoin history continuation was not fully resolved within bounds.",
    };
  }
  return {
    ok: true,
    providerId: lastResult.providerId,
    latencyMs,
    data: {
      transactions,
      nextCursor: cursor,
    },
  };
}

export async function getBitcoinAddressHistoryWithFallback(
  request: BitcoinPaginatedAddressRequest,
  primary: BitcoinHistoryProvider =
    mempoolBitcoinProvider,
  fallback: BitcoinHistoryProvider =
    goldRushBitcoinProvider
): Promise<
  BitcoinProviderResult<
    BitcoinAddressHistoryPage
  >
> {
  const primaryResult =
    await getPagedPrimaryBitcoinHistory(
      request,
      primary
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

  if (isGoldRushExitCanaryActive()) {
    return primaryResult;
  }

  return runWithProviderUsageHintsCore(
    {
      fallbackUsed:
        true,
    },

    () =>
      fallback
        .getAddressTransactions(
          request
        )
  );
}
