import type {
  NetworkId,
} from "@/lib/networks/registry";

import type {
  EvmPaginatedAddressRequest,
  EvmTokenHoldersProvider,
} from "../provider";
import type {
  EvmProviderErrorCode,
  EvmProviderResult,
  EvmTokenHolders,
} from "../types";

import {
  ankrHoldersProvider,
} from "./ankrHolders";
import {
  goldRushEvmProvider,
} from "./goldrush";

const ANKR_NETWORKS =
  new Set<NetworkId>([
    "base",
    "bnb",
    "arbitrum",
    "polygon",
    "avalanche",
    "linea",
  ]);

const FALLBACK_CODES =
  new Set<
    EvmProviderErrorCode
  >([
    "RATE_LIMITED",
    "TIMEOUT",
    "UPSTREAM_ERROR",
  ]);

export type PreferredHoldersDependencies = {
  ankr:
    EvmTokenHoldersProvider;

  goldrush:
    EvmTokenHoldersProvider;
};

const DEFAULT_DEPENDENCIES:
  PreferredHoldersDependencies = {
    ankr:
      ankrHoldersProvider,

    goldrush:
      goldRushEvmProvider,
  };

function isAnkrCursor(
  cursor?: string | null
): boolean {
  return (
    typeof cursor ===
      "string" &&
    cursor.startsWith(
      "ankr:"
    )
  );
}

function isGoldRushCursor(
  cursor?: string | null
): boolean {
  return (
    typeof cursor ===
      "string" &&
    /^\d+$/.test(cursor)
  );
}

export function getPreferredEvmHolderProviderId(
  networkId: NetworkId
): "ankr" | "goldrush" {
  return ANKR_NETWORKS.has(
    networkId
  )
    ? "ankr"
    : "goldrush";
}

export async function getPreferredEvmTokenHolders(
  request:
    EvmPaginatedAddressRequest,

  dependencies:
    PreferredHoldersDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  EvmProviderResult<
    EvmTokenHolders
  >
> {
  /*
   * Never translate provider cursors.
   */
  if (
    isAnkrCursor(
      request.cursor
    )
  ) {
    return dependencies
      .ankr
      .getTokenHolders(
        request
      );
  }

  if (
    isGoldRushCursor(
      request.cursor
    )
  ) {
    return dependencies
      .goldrush
      .getTokenHolders(
        request
      );
  }

  if (
    getPreferredEvmHolderProviderId(
      request.network.networkId
    ) === "goldrush"
  ) {
    return dependencies
      .goldrush
      .getTokenHolders(
        request
      );
  }

  const primary =
    await dependencies
      .ankr
      .getTokenHolders(
        request
      );

  if (primary.ok) {
    return primary;
  }

  /*
   * Provider fallback is allowed
   * only from the first page.
   */
  if (
    request.cursor !==
      undefined &&
    request.cursor !==
      null &&
    request.cursor !==
      ""
  ) {
    return primary;
  }

  if (
    !FALLBACK_CODES.has(
      primary.code
    )
  ) {
    return primary;
  }

  if (
    !dependencies
      .goldrush
      .supportsNetwork(
        request.network
      ) ||
    !dependencies
      .goldrush
      .supportsCapability(
        "tokenHolders"
      )
  ) {
    return primary;
  }

  const fallback =
    await dependencies
      .goldrush
      .getTokenHolders({
        ...request,
        cursor: null,
      });

  if (fallback.ok) {
    return fallback;
  }

  return {
    ...fallback,

    error:
      `Primary Ankr holder provider unavailable (${primary.code}); GoldRush holder fallback unavailable (${fallback.code}).`,
  };
}
