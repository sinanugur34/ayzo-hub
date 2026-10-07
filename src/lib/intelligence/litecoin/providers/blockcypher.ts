import { providerUsageFetch } from "@/lib/providerUsageHttpCore";
import {
  isLitecoinMainnetAddress,
} from "../address";

import type {
  ProviderCapability,
} from "@/lib/providers/types";

import type {
  LitecoinAddressTransactionsProvider,
  LitecoinPaginatedAddressRequest,
} from "../provider";

import type {
  LitecoinAddressHistoryPage,
  LitecoinAddressTransaction,
  LitecoinProviderResult,
} from "../types";

const BLOCKCYPHER_CAPABILITIES = [
  "transactions",
] as const satisfies readonly ProviderCapability[];

const REQUEST_TIMEOUT_MS = 8_000;

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 50;

const TX_HASH =
  /^[0-9a-fA-F]{64}$/;

type JsonObject =
  Record<string, unknown>;

function asObject(
  value: unknown
): JsonObject | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as JsonObject;
}

function elapsedMs(
  startedAt: number
): number {
  return Math.max(
    0,
    Math.round(
      performance.now() - startedAt
    )
  );
}

function parseLimit(
  value: unknown
): number | null {
  if (
    value === undefined ||
    value === null
  ) {
    return DEFAULT_LIMIT;
  }

  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_LIMIT
  ) {
    return null;
  }

  return value;
}

function parseBlockHeight(
  value: unknown
): number | null {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  )
    ? value
    : null;
}

function parseTimestamp(
  value: unknown
): string | null {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const date =
    new Date(value.trim());

  return Number.isFinite(
    date.getTime()
  )
    ? date.toISOString()
    : null;
}

function normalizeTransaction(
  value: unknown
): LitecoinAddressTransaction | null {
  const item =
    asObject(value);

  if (!item) {
    return null;
  }

  const hash =
    item.tx_hash;

  if (
    typeof hash !== "string" ||
    !TX_HASH.test(
      hash.trim()
    )
  ) {
    return null;
  }

  return {
    transactionHash:
      hash.trim(),

    blockHeight:
      parseBlockHeight(
        item.block_height
      ),

    timestamp:
      parseTimestamp(
        item.confirmed
      ),
  };
}

export class BlockCypherLitecoinProvider
  implements
    LitecoinAddressTransactionsProvider
{
  readonly id =
    "blockcypher" as const;

  readonly capabilities =
    BLOCKCYPHER_CAPABILITIES;

  supportsNetwork(
    network:
      LitecoinPaginatedAddressRequest[
        "network"
      ]
  ): boolean {
    return (
      network.networkId ===
        "litecoin" &&
      network.nativeCurrency ===
        "LTC"
    );
  }

  supportsCapability(
    capability:
      ProviderCapability
  ): boolean {
    return (
      this.capabilities as
        readonly ProviderCapability[]
    ).includes(
      capability
    );
  }

  async getAddressTransactions(
    request:
      LitecoinPaginatedAddressRequest
  ): Promise<
    LitecoinProviderResult<
      LitecoinAddressHistoryPage
    >
  > {
    if (
      !this.supportsNetwork(
        request.network
      )
    ) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code: "UNSUPPORTED_NETWORK",
        error:
          "BlockCypher does not support the requested Litecoin network.",
      };
    }

    const address =
      request.address.trim();

    if (
      !isLitecoinMainnetAddress(
        address
      )
    ) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code: "INVALID_ADDRESS",
        error:
          "Invalid Litecoin address.",
      };
    }

    const limit =
      parseLimit(
        request.limit
      );

    if (limit === null) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code: "INVALID_LIMIT",
        error:
          "BlockCypher history limit must be between 1 and 50.",
      };
    }

    if (
      request.cursor !== undefined &&
      request.cursor !== null &&
      request.cursor !== ""
    ) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code: "INVALID_CURSOR",
        error:
          "BlockCypher fallback does not accept a history cursor.",
      };
    }

    const url =
      "https://api.blockcypher.com/v1/ltc/main/addrs/" +
      encodeURIComponent(
        address
      ) +
      "?" +
      new URLSearchParams({
        limit:
          String(limit),
      });

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        REQUEST_TIMEOUT_MS
      );

    const abortFromCaller = () =>
      controller.abort();

    if (request.signal) {
      if (
        request.signal.aborted
      ) {
        controller.abort();
      } else {
        request.signal
          .addEventListener(
            "abort",
            abortFromCaller,
            { once: true }
          );
      }
    }

    const startedAt =
      performance.now();

    try {
      const response =
        await providerUsageFetch({ provider: "blockcypher", operation: "litecoin.history" }, url, () => fetch(
          url,
          {
            method: "GET",

            headers: {
              Accept:
                "application/json",

              "User-Agent":
                "AYZO/1.0 (+https://ayzo.io)",
            },

            cache:
              "no-store",

            signal:
              controller.signal,
          }
        ));

      const latencyMs =
        elapsedMs(
          startedAt
        );

      let payload:
        unknown = null;

      try {
        payload =
          await response.json();
      } catch {
        // Validated below.
      }

      if (
        response.status === 429
      ) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code: "RATE_LIMITED",
          error:
            "BlockCypher rate limit reached.",
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code: "UPSTREAM_ERROR",
          error:
            `BlockCypher Litecoin history returned HTTP ${response.status}.`,
        };
      }

      const root =
        asObject(payload);

      if (!root) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code: "UPSTREAM_ERROR",
          error:
            "BlockCypher Litecoin history response was malformed.",
        };
      }

      const txrefs =
        Array.isArray(
          root.txrefs
        )
          ? root.txrefs
          : [];

      const normalized =
        txrefs.map(
          normalizeTransaction
        );

      if (
        normalized.some(
          transaction =>
            transaction === null
        )
      ) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code: "UPSTREAM_ERROR",
          error:
            "BlockCypher Litecoin history contained malformed transaction evidence.",
        };
      }

      return {
        ok: true,
        providerId: this.id,
        latencyMs,

        data: {
          transactions:
            normalized as
              LitecoinAddressTransaction[],

          nextCursor:
            null,
        },
      };
    } catch {
      const latencyMs =
        elapsedMs(
          startedAt
        );

      if (
        controller.signal
          .aborted
      ) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code: "TIMEOUT",
          error:
            "BlockCypher Litecoin history request timed out or was aborted.",
        };
      }

      return {
        ok: false,
        providerId: this.id,
        latencyMs,
        code: "UPSTREAM_ERROR",
        error:
          "BlockCypher Litecoin history request failed.",
      };
    } finally {
      clearTimeout(
        timeout
      );

      request.signal
        ?.removeEventListener(
          "abort",
          abortFromCaller
        );
    }
  }
}

export const blockCypherLitecoinProvider =
  new BlockCypherLitecoinProvider();
