import {
  isDogecoinMainnetAddress,
} from "../address";

import type {
  ProviderCapability,
} from "@/lib/providers/types";

import type {
  DogecoinAddressTransactionsProvider,
  DogecoinPaginatedAddressRequest,
} from "../provider";

import type {
  DogecoinAddressHistoryPage,
  DogecoinProviderErrorCode,
  DogecoinProviderResult,
} from "../types";

const CAPABILITIES = [
  "transactions",
] as const satisfies readonly ProviderCapability[];

const REQUEST_TIMEOUT_MS = 6_000;

const TX_HASH =
  /^[0-9a-fA-F]{64}$/;

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
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim().toLowerCase();

  return TX_HASH.test(normalized)
    ? normalized
    : null;
}

function parseOffset(
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

  const parsed =
    Number(cursor);

  return (
    Number.isSafeInteger(parsed) &&
    parsed >= 0
  )
    ? parsed
    : null;
}

function parseLimit(
  limit?: number
): number | null {
  if (limit === undefined) {
    return 5;
  }

  return (
    Number.isSafeInteger(limit) &&
    limit >= 1 &&
    limit <= 25
  )
    ? limit
    : null;
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
): DogecoinProviderErrorCode {
  return status === 429
    ? "RATE_LIMITED"
    : "UPSTREAM_ERROR";
}

export class BlockchairDogecoinProvider
  implements DogecoinAddressTransactionsProvider
{
  readonly id =
    "blockchair" as const;

  readonly capabilities =
    CAPABILITIES;

  supportsNetwork(
    network:
      DogecoinPaginatedAddressRequest[
        "network"
      ]
  ): boolean {
    return (
      network.networkId === "dogecoin" &&
      network.nativeCurrency === "DOGE"
    );
  }

  supportsCapability(
    capability: ProviderCapability
  ): boolean {
    return (
      this.capabilities as
        readonly ProviderCapability[]
    ).includes(capability);
  }

  async getAddressTransactions(
    request:
      DogecoinPaginatedAddressRequest
  ): Promise<
    DogecoinProviderResult<
      DogecoinAddressHistoryPage
    >
  > {
    const address =
      request.address.trim();

    if (
      !isDogecoinMainnetAddress(
        address
      )
    ) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code: "INVALID_ADDRESS",
        error:
          "Invalid Dogecoin mainnet address.",
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
        code: "UNSUPPORTED_NETWORK",
        error:
          "Blockchair Dogecoin history is not enabled for this network.",
      };
    }

    const offset =
      parseOffset(
        request.cursor
      );

    if (offset === null) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code: "INVALID_CURSOR",
        error:
          "Dogecoin history cursor must be a non-negative offset.",
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
          "Dogecoin history limit must be between 1 and 25.",
      };
    }

    const url =
      new URL(
        `https://api.blockchair.com/dogecoin/dashboards/address/${encodeURIComponent(address)}`
      );

    url.searchParams.set(
      "limit",
      `${limit},${offset}`
    );

    url.searchParams.set(
      "state",
      "latest"
    );

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
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
                "AYZO/1.0",
            },
            cache: "no-store",
            signal:
              controller.signal,
          }
        );

      const latencyMs =
        elapsedMs(startedAt);

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
          providerId: this.id,
          latencyMs,
          code:
            classifyStatus(
              response.status
            ),
          error:
            `Blockchair Dogecoin API returned HTTP ${response.status}.`,
        };
      }

      const root =
        asObject(payload);

      const data =
        asObject(
          root?.data
        );

      const addressData =
        asObject(
          data?.[address]
        );

      const rawTransactions =
        addressData
          ?.transactions;

      if (
        !Array.isArray(
          rawTransactions
        )
      ) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            "Blockchair Dogecoin response did not contain a transaction list.",
        };
      }

      const hashes =
        rawTransactions.map(
          parseHash
        );

      if (
        hashes.some(
          hash =>
            hash === null
        )
      ) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            "Blockchair Dogecoin response contained an invalid transaction hash.",
        };
      }

      const transactions =
        (
          hashes as string[]
        ).map(
          transactionHash => ({
            transactionHash,
            blockHeight: null,
            timestamp: null,
          })
        );

      return {
        ok: true,
        providerId: this.id,
        latencyMs,
        data: {
          transactions,
          nextCursor:
            transactions.length ===
              limit
              ? String(
                  offset +
                    limit
                )
              : null,
        },
      };
    } catch {
      const latencyMs =
        elapsedMs(startedAt);

      return {
        ok: false,
        providerId: this.id,
        latencyMs,
        code:
          controller.signal.aborted
            ? "TIMEOUT"
            : "UPSTREAM_ERROR",
        error:
          controller.signal.aborted
            ? "Blockchair Dogecoin request timed out or was aborted."
            : "Blockchair Dogecoin request failed.",
      };
    } finally {
      clearTimeout(timeout);

      request.signal
        ?.removeEventListener(
          "abort",
          abortFromCaller
        );
    }
  }
}

export const blockchairDogecoinProvider =
  new BlockchairDogecoinProvider();
