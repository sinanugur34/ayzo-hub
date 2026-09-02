import type {
  ProviderCapability,
} from "@/lib/providers/types";

import type {
  EvmPaginatedAddressRequest,
  EvmTokenHoldersProvider,
} from "../provider";

import type {
  EvmNetworkContext,
  EvmProviderErrorCode,
  EvmProviderResult,
  EvmTokenHolder,
  EvmTokenHolders,
} from "../types";

import {
  getGoldRushEvmNetwork,
} from "./goldrushNetworks";

const GOLDRUSH_CAPABILITIES = [
  "tokenHolders",
] as const satisfies readonly ProviderCapability[];

const REQUEST_TIMEOUT_MS = 8_000;

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

type JsonObject =
  Record<string, unknown>;

function elapsedMs(
  startedAt: number
) {
  return Math.max(
    0,
    Math.round(
      performance.now() - startedAt
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

function errorMessage(
  payload: unknown,
  fallback: string
): string {
  const root = asObject(payload);

  if (!root) {
    return fallback;
  }

  for (const field of [
    "error_message",
    "message",
  ]) {
    const value = root[field];

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
    for (const field of [
      "error_message",
      "message",
    ]) {
      const value = data[field];

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
): EvmProviderErrorCode {
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

function parsePageNumber(
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

  const value =
    Number(cursor);

  if (
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    return null;
  }

  return value;
}

function parseInteger(
  value: unknown
): number | null {
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  ) {
    return value;
  }

  return null;
}

function isUnsignedIntegerString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    /^\d+$/.test(value)
  );
}

function holderPercentage(
  balance: string,
  totalSupply: string | null
): number | null {
  if (!totalSupply) {
    return null;
  }

  try {
    const balanceValue =
      BigInt(balance);

    const supplyValue =
      BigInt(totalSupply);

    if (supplyValue <= 0n) {
      return null;
    }

    // Percentage with four
    // decimal places of precision.
    const scaled =
      (balanceValue * 1_000_000n) /
      supplyValue;

    return (
      Number(scaled) / 10_000
    );
  } catch {
    return null;
  }
}

function normalizeHolder(
  value: unknown,
  fallbackSupply: string | null
): EvmTokenHolder | null {
  const item =
    asObject(value);

  if (!item) {
    return null;
  }

  const address =
    typeof item.address === "string"
      ? item.address.trim()
      : "";

  const balance =
    item.balance;

  if (
    !EVM_ADDRESS.test(address) ||
    !isUnsignedIntegerString(
      balance
    )
  ) {
    return null;
  }

  const itemSupply =
    isUnsignedIntegerString(
      item.total_supply
    )
      ? item.total_supply
      : fallbackSupply;

  return {
    address,
    balance,
    percentage:
      holderPercentage(
        balance,
        itemSupply
      ),
  };
}

function unwrapData(
  payload: unknown
): JsonObject | null {
  const root =
    asObject(payload);

  if (!root) {
    return null;
  }

  const wrapped =
    asObject(root.data);

  return wrapped ?? root;
}

export class GoldRushEvmProvider
  implements EvmTokenHoldersProvider
{
  readonly id =
    "goldrush" as const;

  readonly capabilities =
    GOLDRUSH_CAPABILITIES;

  supportsNetwork(
    network: EvmNetworkContext
  ): boolean {
    const config =
      getGoldRushEvmNetwork(
        network.networkId
      );

    return (
      config !== null &&
      config.chainId ===
        network.chainId
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

  async getTokenHolders(
    request:
      EvmPaginatedAddressRequest
  ): Promise<
    EvmProviderResult<EvmTokenHolders>
  > {
    if (
      !EVM_ADDRESS.test(
        request.address
      )
    ) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code: "INVALID_ADDRESS",
        error:
          "Invalid EVM address.",
      };
    }

    const config =
      getGoldRushEvmNetwork(
        request.network.networkId
      );

    if (
      !config ||
      config.chainId !==
        request.network.chainId
    ) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code:
          "UNSUPPORTED_NETWORK",
        error:
          `GoldRush is not enabled for ${request.network.name}.`,
      };
    }

    const pageNumber =
      parsePageNumber(
        request.cursor
      );

    if (pageNumber === null) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code: "UPSTREAM_ERROR",
        error:
          "Invalid holder pagination cursor.",
      };
    }

    // GoldRush token_holders_v2
    // returns a fixed page size of 100.
    const pageSize = 100;

    const apiKey =
      process.env
        .GOLDRUSH_API_KEY
        ?.trim();

    if (!apiKey) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code: "UPSTREAM_ERROR",
        error:
          "GOLDRUSH_API_KEY is not configured.",
      };
    }

    const url =
      new URL(
        `https://api.covalenthq.com/v1/${config.chainName}/tokens/${request.address}/token_holders_v2/`
      );

    url.searchParams.set(
      "page-number",
      String(pageNumber)
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
        // Handled below.
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
            `GoldRush returned HTTP ${response.status}.`
          );

        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code:
            classifyError(
              message
            ),
          error: message,
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
            "GoldRush API error."
          );

        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code:
            classifyError(
              message
            ),
          error: message,
        };
      }

      const data =
        unwrapData(payload);

      if (!data) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code: "UPSTREAM_ERROR",
          error:
            "GoldRush returned an invalid holder response.",
        };
      }

      if (
        !Array.isArray(
          data.items
        )
      ) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code: "UPSTREAM_ERROR",
          error:
            "GoldRush holder response did not contain an items array.",
        };
      }

      const firstSupply =
        data.items
          .map(asObject)
          .find(
            (item) =>
              item &&
              isUnsignedIntegerString(
                item.total_supply
              )
          )?.total_supply;

      const totalSupply =
        isUnsignedIntegerString(
          firstSupply
        )
          ? firstSupply
          : null;

      const holders =
        data.items
          .map(
            (item) =>
              normalizeHolder(
                item,
                totalSupply
              )
          )
          .filter(
            (
              holder
            ): holder is
              EvmTokenHolder =>
              holder !== null
          );

      const pagination =
        asObject(
          data.pagination
        );

      const apiPageNumber =
        parseInteger(
          pagination
            ?.page_number
        ) ?? pageNumber;

      const apiPageSize =
        parseInteger(
          pagination
            ?.page_size
        ) ?? pageSize;

      const totalCount =
        parseInteger(
          pagination
            ?.total_count
        );

      const hasMore =
        pagination
          ?.has_more === true ||
        (
          totalCount !== null &&
          (
            apiPageNumber + 1
          ) *
            apiPageSize <
            totalCount
        );

      const nextCursor =
        hasMore
          ? String(
              apiPageNumber + 1
            )
          : null;

      return {
        ok: true,
        providerId: this.id,
        latencyMs,
        data: {
          holders,
          totalSupply,
          totalCount,
          nextCursor,
        },
      };
    } catch {
      const latencyMs =
        elapsedMs(startedAt);

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
            "GoldRush request timed out or was aborted.",
        };
      }

      return {
        ok: false,
        providerId: this.id,
        latencyMs,
        code: "UPSTREAM_ERROR",
        error:
          "GoldRush holder request failed.",
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

export const goldRushEvmProvider =
  new GoldRushEvmProvider();
