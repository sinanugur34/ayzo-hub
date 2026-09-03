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
  BitcoinAddressTransaction,
  BitcoinProviderErrorCode,
  BitcoinProviderResult,
  BitcoinAddressHistoryPage,
} from "../types";

const GOLDRUSH_CAPABILITIES = [
  "transactions",
] as const satisfies readonly ProviderCapability[];

const REQUEST_TIMEOUT_MS = 8_000;

const MAX_ATTEMPTS = 2;

const RETRY_DELAY_MS = 250;

const sleep = (ms: number) =>
  new Promise<void>((resolve) =>
    setTimeout(resolve, ms)
  );

const TX_HASH =
  /^[0-9a-fA-F]{64}$/;

type JsonObject =
  Record<string, unknown>;

function elapsedMs(
  startedAt: number
) {
  return Math.max(
    0,
    Math.round(
      performance.now() -
        startedAt
    )
  );
}

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

function unwrapData(
  payload: unknown
): JsonObject | null {
  const root =
    asObject(payload);

  if (!root) {
    return null;
  }

  return (
    asObject(root.data) ??
    root
  );
}

function errorMessage(
  payload: unknown,
  fallback: string
): string {
  const root =
    asObject(payload);

  if (!root) {
    return fallback;
  }

  for (const key of [
    "error_message",
    "message",
  ]) {
    const value =
      root[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  const data =
    asObject(root.data);

  if (data) {
    for (const key of [
      "error_message",
      "message",
    ]) {
      const value =
        data[key];

      if (
        typeof value === "string" &&
        value.trim()
      ) {
        return value.trim();
      }
    }
  }

  return fallback;
}

function classifyError(
  message: string
): BitcoinProviderErrorCode {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "rate limit"
    ) ||
    normalized.includes(
      "too many requests"
    ) ||
    normalized.includes(
      "requests per second"
    )
  ) {
    return "RATE_LIMITED";
  }

  return "UPSTREAM_ERROR";
}

function parsePage(
  cursor?: string | null
): number | null {
  if (
    cursor === undefined ||
    cursor === null ||
    cursor === ""
  ) {
    return 0;
  }

  if (!/^\d+$/.test(cursor)) {
    return null;
  }

  const page =
    Number(cursor);

  return (
    Number.isSafeInteger(page) &&
    page >= 0
  )
    ? page
    : null;
}

function parseLimit(
  limit?: number
): number | null {
  if (limit === undefined) {
    return 25;
  }

  return (
    Number.isSafeInteger(limit) &&
    limit >= 1 &&
    limit <= 100
  )
    ? limit
    : null;
}

function parseNonNegativeInteger(
  value: unknown
): number | null {
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    /^\d+$/.test(value)
  ) {
    const parsed =
      Number(value);

    if (
      Number.isSafeInteger(parsed) &&
      parsed >= 0
    ) {
      return parsed;
    }
  }

  return null;
}

function parseHash(
  value: unknown
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim().toLowerCase();

  return TX_HASH.test(
    normalized
  )
    ? normalized
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
    new Date(
      value.trim()
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
  const item =
    asObject(value);

  if (!item) {
    return null;
  }

  const transactionHash =
    parseHash(
      item.tx_hash ??
        item.transaction_hash ??
        item.txid ??
        item.hash
    );

  if (!transactionHash) {
    return null;
  }

  const blockHeight =
    parseNonNegativeInteger(
      item.block_height ??
        item.blockHeight ??
        item.height
    );

  const timestamp =
    parseTimestamp(
      item.block_signed_at ??
        item.signed_at ??
        item.timestamp
    );

  return {
    transactionHash,
    blockHeight,
    timestamp,
  };
}

function nextCursor(
  data: JsonObject,
  page: number
): string | null {
  const pagination =
    asObject(
      data.pagination
    );

  if (!pagination) {
    return null;
  }

  const hasMore =
    pagination.has_more === true ||
    pagination.hasMore === true;

  if (!hasMore) {
    return null;
  }

  const currentPage =
    parseNonNegativeInteger(
      pagination.page_number ??
        pagination.current_page
    ) ?? page;

  return String(
    currentPage + 1
  );
}

export class GoldRushBitcoinProvider
  implements
    BitcoinAddressTransactionsProvider
{
  readonly id =
    "goldrush" as const;

  readonly capabilities =
    GOLDRUSH_CAPABILITIES;

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
    for (
      let attempt = 1;
      attempt <= MAX_ATTEMPTS;
      attempt += 1
    ) {
      const result =
        await this
          .getAddressTransactionsOnce(
            request
          );

      if (result.ok) {
        return result;
      }

      const retryable =
        result.code === "TIMEOUT" ||
        result.code === "UPSTREAM_ERROR";

      if (
        !retryable ||
        request.signal?.aborted ||
        attempt === MAX_ATTEMPTS
      ) {
        return result;
      }

      await sleep(
        RETRY_DELAY_MS
      );
    }

    throw new Error(
      "Unreachable GoldRush retry state."
    );
  }

  private async getAddressTransactionsOnce(
    request:
      BitcoinPaginatedAddressRequest
  ): Promise<
    BitcoinProviderResult<
      BitcoinAddressHistoryPage
    >
  > {
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
          "Invalid Bitcoin mainnet address.",
      };
    }

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
          "GoldRush Bitcoin history is not enabled for this network.",
      };
    }

    const page =
      parsePage(
        request.cursor
      );

    if (page === null) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code:
          "INVALID_CURSOR",
        error:
          "Bitcoin history cursor must be a non-negative page number.",
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
          "Bitcoin history limit must be between 1 and 100.",
      };
    }

    const apiKey =
      process.env
        .GOLDRUSH_API_KEY
        ?.trim();

    if (!apiKey) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code:
          "UPSTREAM_ERROR",
        error:
          "GOLDRUSH_API_KEY is not configured.",
      };
    }

    const url =
      new URL(
        "https://api.covalenthq.com/v1/cq/covalent/app/bitcoin/transactions/"
      );

    url.searchParams.set(
      "address",
      address
    );

    url.searchParams.set(
      "page-size",
      String(limit)
    );

    url.searchParams.set(
      "page-number",
      String(page)
    );

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
              Authorization:
                `Bearer ${apiKey}`,

              Accept:
                "application/json",
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
            errorMessage(
              payload,
              "GoldRush rate limit reached."
            ),
        };
      }

      if (!response.ok) {
        const message =
          errorMessage(
            payload,
            `GoldRush Bitcoin history returned HTTP ${response.status}.`
          );

        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code:
            classifyError(
              message
            ),
          error:
            message,
        };
      }

      const root =
        asObject(payload);

      if (
        root?.error === true
      ) {
        const message =
          errorMessage(
            payload,
            "GoldRush Bitcoin history API error."
          );

        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code:
            classifyError(
              message
            ),
          error:
            message,
        };
      }

      const data =
        unwrapData(
          payload
        );

      if (
        !data ||
        !Array.isArray(
          data.items
        )
      ) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            "GoldRush Bitcoin history response did not contain an items array.",
        };
      }

      const transactions =
        data.items
          .map(
            normalizeTransaction
          )
          .filter(
            (
              transaction
            ): transaction is
              BitcoinAddressTransaction =>
              transaction !== null
          );

      if (
        data.items.length > 0 &&
        transactions.length === 0
      ) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            "GoldRush Bitcoin history items did not contain canonical transaction hashes.",
        };
      }

      return {
        ok: true,
        providerId: this.id,
        latencyMs,

        data: {
          transactions,

          nextCursor:
            nextCursor(
              data,
              page
            ),
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
            "GoldRush Bitcoin history request timed out or was aborted.",
        };
      }

      return {
        ok: false,
        providerId: this.id,
        latencyMs,
        code:
          "UPSTREAM_ERROR",
        error:
          "GoldRush Bitcoin history request failed.",
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

export const goldRushBitcoinProvider =
  new GoldRushBitcoinProvider();
