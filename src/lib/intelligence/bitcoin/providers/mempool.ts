import {
  isBitcoinMainnetAddress,
} from "../address";

import type {
  ProviderCapability,
} from "@/lib/providers/types";

import type {
  BitcoinAddressTransactionsProvider,
  BitcoinPaginatedAddressRequest,
} from "../provider";

import type {
  BitcoinAddressHistoryPage,
  BitcoinAddressTransaction,
  BitcoinProviderResult,
} from "../types";

const MEMPOOL_CAPABILITIES = [
  "transactions",
] as const satisfies readonly ProviderCapability[];

const REQUEST_TIMEOUT_MS = 8_000;

const MAX_PAGE_SIZE = 25;

const DEFAULT_LIMIT = 5;

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
      performance.now() -
        startedAt
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
    value > MAX_PAGE_SIZE
  ) {
    return null;
  }

  return value;
}

function parseCursor(
  value: unknown
):
  | string
  | null
  | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  return TX_HASH.test(
    normalized
  )
    ? normalized
    : undefined;
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
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  const date =
    new Date(
      value * 1_000
    );

  return Number.isFinite(
    date.getTime()
  )
    ? date.toISOString()
    : null;
}

function normalizeTransaction(
  value: unknown
): BitcoinAddressTransaction | null {
  const transaction =
    asObject(value);

  if (!transaction) {
    return null;
  }

  const txid =
    transaction.txid;

  if (
    typeof txid !== "string" ||
    !TX_HASH.test(
      txid.trim()
    )
  ) {
    return null;
  }

  const status =
    asObject(
      transaction.status
    );

  return {
    transactionHash:
      txid.trim(),

    blockHeight:
      status
        ? parseBlockHeight(
            status.block_height
          )
        : null,

    timestamp:
      status
        ? parseTimestamp(
            status.block_time
          )
        : null,
  };
}

export class MempoolBitcoinProvider
  implements
    BitcoinAddressTransactionsProvider
{
  readonly id =
    "mempool" as const;

  readonly capabilities =
    MEMPOOL_CAPABILITIES;

  supportsNetwork(
    network:
      BitcoinPaginatedAddressRequest[
        "network"
      ]
  ): boolean {
    return (
      network.networkId ===
        "bitcoin" &&
      network.nativeCurrency ===
        "BTC"
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
      BitcoinPaginatedAddressRequest
  ): Promise<
    BitcoinProviderResult<
      BitcoinAddressHistoryPage
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
        code:
          "UNSUPPORTED_NETWORK",
        error:
          "Mempool.space does not support the requested Bitcoin network.",
      };
    }

    const address =
      request.address.trim();

    if (
      !isBitcoinMainnetAddress(
        address
      )
    ) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code:
          "INVALID_ADDRESS",
        error:
          "Invalid Bitcoin address.",
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
        code:
          "INVALID_LIMIT",
        error:
          "Mempool.space history limit must be between 1 and 25.",
      };
    }

    const cursor =
      parseCursor(
        request.cursor
      );

    if (
      cursor === undefined
    ) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code:
          "INVALID_CURSOR",
        error:
          "Mempool.space history cursor must be a canonical transaction hash.",
      };
    }

    let url =
      "https://mempool.space/api/address/" +
      encodeURIComponent(
        address
      ) +
      "/txs/chain";

    if (cursor) {
      url +=
        "/" +
        encodeURIComponent(
          cursor
        );
    }

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
        await fetch(
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
        );

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
          code:
            "RATE_LIMITED",
          error:
            "Mempool.space rate limit reached.",
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            `Mempool.space Bitcoin history returned HTTP ${response.status}.`,
        };
      }

      if (
        !Array.isArray(
          payload
        )
      ) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            "Mempool.space Bitcoin history response was not an array.",
        };
      }

      const normalized =
        payload
          .map(
            normalizeTransaction
          );

      if (
        normalized.some(
          (
            transaction
          ) =>
            transaction === null
        )
      ) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            "Mempool.space Bitcoin history contained malformed transaction evidence.",
        };
      }

      const allTransactions =
        normalized as
          BitcoinAddressTransaction[];

      const transactions =
        allTransactions.slice(
          0,
          limit
        );

      const nextCursor =
        transactions.length > 0 &&
        (
          allTransactions.length >
            limit ||
          allTransactions.length ===
            MAX_PAGE_SIZE
        )
          ? transactions[
              transactions.length - 1
            ]!.transactionHash
          : null;

      return {
        ok: true,
        providerId: this.id,
        latencyMs,

        data: {
          transactions,
          nextCursor,
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
          code:
            "TIMEOUT",
          error:
            "Mempool.space Bitcoin history request timed out or was aborted.",
        };
      }

      return {
        ok: false,
        providerId: this.id,
        latencyMs,
        code:
          "UPSTREAM_ERROR",
        error:
          "Mempool.space Bitcoin history request failed.",
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

export const mempoolBitcoinProvider =
  new MempoolBitcoinProvider();
