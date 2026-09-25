import type {
  EvmPaginatedAddressRequest,
  EvmTransactionsProvider,
} from "../provider";

import type {
  EvmProviderErrorCode,
  EvmProviderResult,
  EvmTransactionsPage,
} from "../types";

import {
  alchemyTransactionsProvider,
} from "./alchemyTransactions";

import {
  goldRushTransactionsProvider,
} from "./goldrushTransactions";

export type EvmTransactionFallbackDependencies = {
  primary:
    EvmTransactionsProvider;

  fallback:
    EvmTransactionsProvider;
};

const DEFAULT_DEPENDENCIES:
  EvmTransactionFallbackDependencies = {
  primary:
    goldRushTransactionsProvider,

  fallback:
    alchemyTransactionsProvider,
};

const FALLBACK_CODES =
  new Set<
    EvmProviderErrorCode
  >([
    "RATE_LIMITED",
    "TIMEOUT",
    "UPSTREAM_ERROR",
  ]);

export async function getEvmTransactionsWithFallback(
  request:
    EvmPaginatedAddressRequest,
  dependencies:
    EvmTransactionFallbackDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  EvmProviderResult<
    EvmTransactionsPage
  >
> {
  const primaryResult =
    await dependencies
      .primary
      .getTransactions(
        request
      );

  if (
    primaryResult.ok
  ) {
    return primaryResult;
  }

  /*
   * Do not translate a provider's later-page
   * cursor into another provider's cursor.
   *
   * Fallback starts only at the root page.
   */
  if (
    request.cursor !==
      undefined &&
    request.cursor !==
      null &&
    request.cursor !==
      ""
  ) {
    return primaryResult;
  }

  if (
    !FALLBACK_CODES.has(
      primaryResult.code
    )
  ) {
    return primaryResult;
  }

  if (
    !dependencies
      .fallback
      .supportsNetwork(
        request.network
      ) ||
    !dependencies
      .fallback
      .supportsCapability(
        "transactions"
      )
  ) {
    return primaryResult;
  }

  const fallbackResult =
    await dependencies
      .fallback
      .getTransactions({
        ...request,
        cursor:
          null,
      });

  if (
    fallbackResult.ok
  ) {
    return fallbackResult;
  }

  return {
    ...fallbackResult,

    error:
      `Primary transaction provider unavailable (${primaryResult.code}); fallback transaction provider unavailable (${fallbackResult.code}).`,
  };
}
