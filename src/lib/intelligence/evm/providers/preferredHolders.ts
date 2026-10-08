import { isGoldRushExitCanaryActive } from "@/lib/goldRushExitCanary";

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
import {
  isIndexedHolderCanaryAllowed,
} from "./indexedHolderCanary";
import {
  routescanHoldersProvider,
  blockscoutHoldersProvider,
} from "./indexedHolderAdapters";

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
  const goldRushExit = isGoldRushExitCanaryActive();
  const blockedGoldRush = (): EvmProviderResult<EvmTokenHolders> => ({
    ok: false, providerId: "goldrush", code: "UPSTREAM_ERROR", latencyMs: null,
    error: "GoldRush holder path disabled in Preview; no verified alternative result.",
  });

  // All indexed access, including continuation requests, shares one gate.
  // NODE_ENV=production on Vercel Preview; VERCEL_ENV distinguishes it.
  const indexedCanaryAllowed = isIndexedHolderCanaryAllowed({
    flag: process.env.AYZO_INDEXED_HOLDER_CANARY,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  }) || goldRushExit;

  // Never reroute a provider-owned cursor to Ankr or GoldRush.
  // In production or with the flag off, reject it without provider I/O.
  const indexedCursorProvider = request.cursor?.startsWith("routescan:")
    ? routescanHoldersProvider
    : request.cursor?.startsWith("blockscout:")
      ? blockscoutHoldersProvider
      : null;

  if (indexedCursorProvider) {
    if (!indexedCanaryAllowed) {
      return {
        ok: false,
        providerId: indexedCursorProvider.id,
        code: "UPSTREAM_ERROR",
        latencyMs: null,
        error: "Indexed holder continuation is disabled in this environment.",
      };
    }
    return indexedCursorProvider.getTokenHolders(request);
  }

  // Preview-only canary; the legacy first-page behavior remains unchanged.
  if (indexedCanaryAllowed && !request.cursor) {
    const candidate = routescanHoldersProvider.supportsNetwork(request.network)
      ? routescanHoldersProvider
      : blockscoutHoldersProvider.supportsNetwork(request.network)
        ? blockscoutHoldersProvider
        : null;
    if (candidate) {
      const indexedResult = await candidate.getTokenHolders(request);
      if (indexedResult.ok) return indexedResult;
    }
  }

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
    if (goldRushExit) return blockedGoldRush();
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
    if (goldRushExit) return blockedGoldRush();
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

  if (goldRushExit) return primary;

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
