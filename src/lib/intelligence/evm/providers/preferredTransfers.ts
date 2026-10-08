import { isGoldRushExitCanaryActive } from "@/lib/goldRushExitCanary";

import {
  runWithProviderUsageHintsCore,
} from "@/lib/providerUsageScopeCore";

import type {
  EvmTokenTransfersRequest,
  EvmTransfersProvider,
} from "../provider";

import type {
  EvmProviderErrorCode,
  EvmProviderResult,
  EvmTransfersPage,
} from "../types";

import {
  alchemyTransfersProvider,
} from "./alchemyTransfers";

import {
  goldRushTransfersProvider,
} from "./goldrushTransfers";

export type PreferredTransferDependencies = {
  alchemy?:
    EvmTransfersProvider;

  goldrush?:
    EvmTransfersProvider;
};

const FALLBACK_CODES =
  new Set<
    EvmProviderErrorCode
  >([
    "RATE_LIMITED",
    "TIMEOUT",
    "UPSTREAM_ERROR",
  ]);

type CursorOwner =
  | "alchemy"
  | "goldrush"
  | null;

function cursorOwner(
  cursor:
    string |
    null |
    undefined
): CursorOwner {
  if (!cursor) {
    return null;
  }

  if (
    cursor.startsWith(
      "alchemy-transfer:"
    )
  ) {
    return "alchemy";
  }

  if (
    /^\d+$/.test(
      cursor
    ) ||
    /^wallet:\d+:\d+$/.test(
      cursor
    ) ||
    /^events:\d+:\d+$/.test(
      cursor
    )
  ) {
    return "goldrush";
  }

  return null;
}

export async function getPreferredEvmTokenTransfers(
  request:
    EvmTokenTransfersRequest,

  dependencies:
    PreferredTransferDependencies =
      {}
): Promise<
  EvmProviderResult<
    EvmTransfersPage
  >
> {
  const alchemy =
    dependencies.alchemy ??
    alchemyTransfersProvider;

  const goldrush =
    dependencies.goldrush ??
    goldRushTransfersProvider;

  const owner =
    cursorOwner(
      request.cursor
    );

  const goldRushExit = isGoldRushExitCanaryActive();

  if (
    owner ===
      "alchemy"
  ) {
    return alchemy
      .getTokenTransfers(
        request
      );
  }

  if (
    owner ===
      "goldrush"
  ) {
    if (goldRushExit) {
      return { ok: false, providerId: "goldrush", latencyMs: null,
        code: "UPSTREAM_ERROR",
        error: "GoldRush-owned transfer continuation disabled by Preview exit canary." };
    }
    return goldrush
      .getTokenTransfers(
        request
      );
  }

  if (
    alchemy
      .supportsNetwork(
        request.network
      ) &&
    alchemy
      .supportsCapability(
        "tokenTransfers"
      )
  ) {
    const primary =
      await alchemy
        .getTokenTransfers(
          request
        );

    if (
      primary.ok
    ) {
      return primary;
    }

    if (
      goldRushExit ||
      !FALLBACK_CODES.has(
        primary.code
      ) ||
      request.signal
        ?.aborted ||
      !goldrush
        .supportsNetwork(
          request.network
        ) ||
      !goldrush
        .supportsCapability(
          "tokenTransfers"
        )
    ) {
      return primary;
    }

    return runWithProviderUsageHintsCore(
      {
        fallbackUsed:
          true,
      },

      () =>
        goldrush
          .getTokenTransfers({
            ...request,

            cursor:
              null,
          })
    );
  }

  if (goldRushExit) {
    return { ok: false, providerId: "goldrush", latencyMs: null,
      code: "UPSTREAM_ERROR",
      error: "No non-GoldRush token transfer provider supports this network in Preview." };
  }

  return goldrush
    .getTokenTransfers(
      request
    );
}
