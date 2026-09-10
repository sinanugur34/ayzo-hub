import type {
  ProviderCapability,
} from "@/lib/providers/types";

import {
  isTronAddress,
} from "../address";

import type {
  TronAddressTransactionsProvider,
  TronPaginatedAddressRequest,
} from "../provider";

import type {
  TronAddressHistoryPage,
  TronAddressTransaction,
  TronProviderErrorCode,
  TronProviderResult,
} from "../types";

const CAPABILITIES = [
  "transactions",
] as const satisfies readonly ProviderCapability[];

const TRONGRID_MAINNET_BASE_URL =
  "https://api.trongrid.io";

const REQUEST_TIMEOUT_MS =
  7_000;

const TX_HASH =
  /^[0-9a-fA-F]{64}$/;

const MAX_CURSOR_LENGTH =
  4_096;

type JsonObject =
  Record<string, unknown>;

function asObject(
  value: unknown
): JsonObject | null {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
    ? value as JsonObject
    : null;
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

function parseNonNegativeInteger(
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

function parseTimestampMilliseconds(
  value: unknown
): string | null {
  const milliseconds =
    parseNonNegativeInteger(
      value
    );

  if (milliseconds === null) {
    return null;
  }

  const date =
    new Date(
      milliseconds
    );

  return Number.isFinite(
    date.getTime()
  )
    ? date.toISOString()
    : null;
}

function parseLimit(
  value?: number
): number | null {
  if (value === undefined) {
    return 5;
  }

  return (
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= 25
  )
    ? value
    : null;
}

type ParsedCursor =
  | {
      ok: true;
      value: string | null;
    }
  | {
      ok: false;
    };

function parseCursor(
  value?:
    string | null
): ParsedCursor {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return {
      ok: true,
      value: null,
    };
  }

  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized.length >
      MAX_CURSOR_LENGTH
  ) {
    return {
      ok: false,
    };
  }

  return {
    ok: true,
    value: normalized,
  };
}

function parseResponseCursor(
  value: unknown
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return (
    normalized &&
    normalized.length <=
      MAX_CURSOR_LENGTH
  )
    ? normalized
    : null;
}

function parseTransaction(
  value: unknown
): TronAddressTransaction | null {
  const transaction =
    asObject(value);

  if (!transaction) {
    return null;
  }

  const transactionHash =
    parseHash(
      transaction.txID ??
        transaction.txid
    );

  if (!transactionHash) {
    return null;
  }

  const blockHeight =
    parseNonNegativeInteger(
      transaction.blockNumber ??
        transaction.block_number
    );

  const timestamp =
    parseTimestampMilliseconds(
      transaction.block_timestamp ??
        transaction.blockTimestamp
    );

  return {
    transactionHash,
    blockHeight,
    timestamp,
    confirmed: true,
  };
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

function classifyStatus(
  status: number
): TronProviderErrorCode {
  return status === 429
    ? "RATE_LIMITED"
    : "UPSTREAM_ERROR";
}

export class TronGridProvider
  implements TronAddressTransactionsProvider
{
  readonly id =
    "trongrid" as const;

  readonly capabilities =
    CAPABILITIES;

  supportsNetwork(
    network:
      TronPaginatedAddressRequest[
        "network"
      ]
  ): boolean {
    return (
      network.networkId ===
        "tron" &&
      network.nativeCurrency ===
        "TRX"
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
      TronPaginatedAddressRequest
  ): Promise<
    TronProviderResult<
      TronAddressHistoryPage
    >
  > {
    const address =
      request.address.trim();

    if (
      !isTronAddress(
        address
      )
    ) {
      return {
        ok: false,
        providerId:
          this.id,
        latencyMs:
          null,
        code:
          "INVALID_ADDRESS",
        error:
          "Invalid TRON address.",
      };
    }

    if (
      !this.supportsNetwork(
        request.network
      )
    ) {
      return {
        ok: false,
        providerId:
          this.id,
        latencyMs:
          null,
        code:
          "UNSUPPORTED_NETWORK",
        error:
          "TronGrid history is not enabled for this network.",
      };
    }

    const limit =
      parseLimit(
        request.limit
      );

    if (limit === null) {
      return {
        ok: false,
        providerId:
          this.id,
        latencyMs:
          null,
        code:
          "INVALID_LIMIT",
        error:
          "TRON history limit must be between 1 and 25.",
      };
    }

    const cursor =
      parseCursor(
        request.cursor
      );

    if (!cursor.ok) {
      return {
        ok: false,
        providerId:
          this.id,
        latencyMs:
          null,
        code:
          "INVALID_CURSOR",
        error:
          "Invalid TRON history cursor.",
      };
    }

    const apiKey =
      process.env
        .TRONGRID_API_KEY
        ?.trim();

    if (!apiKey) {
      return {
        ok: false,
        providerId:
          this.id,
        latencyMs:
          null,
        code:
          "UPSTREAM_ERROR",
        error:
          "TRONGRID_API_KEY is not configured.",
      };
    }

    const url =
      new URL(
        `/v1/accounts/${encodeURIComponent(
          address
        )}/transactions`,
        TRONGRID_MAINNET_BASE_URL
      );

    url.searchParams.set(
      "limit",
      String(limit)
    );

    url.searchParams.set(
      "only_confirmed",
      "true"
    );

    url.searchParams.set(
      "order_by",
      "block_timestamp,desc"
    );

    if (cursor.value) {
      url.searchParams.set(
        "fingerprint",
        cursor.value
      );
    }

    const controller =
      new AbortController();

    let timedOut =
      false;

    const timeout =
      setTimeout(
        () => {
          timedOut = true;
          controller.abort();
        },
        REQUEST_TIMEOUT_MS
      );

    const abortFromCaller =
      () =>
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
            {
              once: true,
            }
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
            method:
              "GET",

            headers: {
              Accept:
                "application/json",

              "User-Agent":
                "AYZO/1.0",

              "TRON-PRO-API-KEY":
                apiKey,
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

      if (!response.ok) {
        return {
          ok: false,
          providerId:
            this.id,
          latencyMs,
          code:
            classifyStatus(
              response.status
            ),
          error:
            response.status ===
              429
              ? "TronGrid rate limit reached."
              : "TronGrid history request failed.",
        };
      }

      const object =
        asObject(
          payload
        );

      if (
        !object ||
        object.success ===
          false ||
        !Array.isArray(
          object.data
        )
      ) {
        return {
          ok: false,
          providerId:
            this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            "TronGrid returned an invalid history response.",
        };
      }

      const transactions =
        object.data
          .map(
            parseTransaction
          )
          .filter(
            (
              transaction
            ): transaction is
              TronAddressTransaction =>
              transaction !==
              null
          );

      if (
        object.data.length >
          0 &&
        transactions.length ===
          0
      ) {
        return {
          ok: false,
          providerId:
            this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            "TronGrid history contained no usable transaction identifiers.",
        };
      }

      const meta =
        asObject(
          object.meta
        );

      return {
        ok: true,
        providerId:
          this.id,
        latencyMs,
        data: {
          transactions,
          nextCursor:
            parseResponseCursor(
              meta?.fingerprint
            ),
        },
      };
    } catch {
      const latencyMs =
        elapsedMs(
          startedAt
        );

      return {
        ok: false,
        providerId:
          this.id,
        latencyMs,
        code:
          controller.signal
            .aborted
            ? "TIMEOUT"
            : "UPSTREAM_ERROR",
        error:
          timedOut
            ? "TronGrid history request timed out."
            : controller.signal
                .aborted
              ? "TronGrid history request was aborted."
              : "Unable to reach TronGrid.",
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

export const tronGridProvider =
  new TronGridProvider();
