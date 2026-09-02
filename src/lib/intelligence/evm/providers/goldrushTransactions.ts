import type {
  ProviderCapability,
} from "@/lib/providers/types";

import type {
  EvmPaginatedAddressRequest,
  EvmTransactionsProvider,
} from "../provider";

import type {
  EvmNetworkContext,
  EvmProviderErrorCode,
  EvmProviderResult,
  EvmTransaction,
  EvmTransactionsPage,
} from "../types";

import {
  getGoldRushEvmNetwork,
} from "./goldrushNetworks";

const CAPABILITIES = [
  "transactions",
] as const satisfies readonly ProviderCapability[];

const REQUEST_TIMEOUT_MS =
  8_000;

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

const TX_HASH =
  /^0x[0-9a-fA-F]{64}$/;

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
) {
  return Math.max(
    0,
    Math.round(
      performance.now() - startedAt
    )
  );
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

  if (
    !Number.isSafeInteger(page) ||
    page < 0
  ) {
    return null;
  }

  return page;
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

function parseAddress(
  value: unknown
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const address =
    value.trim();

  return EVM_ADDRESS.test(
    address
  )
    ? address
    : null;
}

function parseString(
  value: unknown
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function normalizeTransaction(
  value: unknown
): EvmTransaction | null {
  const item =
    asObject(value);

  if (!item) {
    return null;
  }

  const hash =
    parseString(
      item.tx_hash
    );

  if (
    !hash ||
    !TX_HASH.test(hash)
  ) {
    return null;
  }

  return {
    hash,

    blockNumber:
      parseInteger(
        item.block_height
      ),

    timestamp:
      parseString(
        item.block_signed_at
      ),

    from:
      parseAddress(
        item.from_address
      ),

    to:
      parseAddress(
        item.to_address
      ),

    value:
      parseString(
        item.value
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

  const data =
    asObject(root.data);

  return data ?? root;
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

  const candidates = [
    root.error_message,
    root.message,
    asObject(root.data)
      ?.error_message,
    asObject(root.data)
      ?.message,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      candidate.trim()
    ) {
      return candidate.trim();
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

export class GoldRushTransactionsProvider
  implements EvmTransactionsProvider
{
  readonly id =
    "goldrush" as const;

  readonly capabilities =
    CAPABILITIES;

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

  async getTransactions(
    request:
      EvmPaginatedAddressRequest
  ): Promise<
    EvmProviderResult<
      EvmTransactionsPage
    >
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

    const page =
      parsePage(
        request.cursor
      );

    if (page === null) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code: "UPSTREAM_ERROR",
        error:
          "Invalid transaction pagination cursor.",
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
        code: "UPSTREAM_ERROR",
        error:
          "GOLDRUSH_API_KEY is not configured.",
      };
    }

    const url =
      new URL(
        `https://api.covalenthq.com/v1/${config.chainName}/address/${request.address}/transactions_v3/page/${page}/`
      );

    // For this normalized transaction layer
    // decoded logs are intentionally omitted.
    // Token movement evidence is handled by
    // the dedicated transfers provider.
    url.searchParams.set(
      "no-logs",
      "true"
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
          code: "UPSTREAM_ERROR",
          error:
            "GoldRush transaction response did not contain an items array.",
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
              EvmTransaction =>
              transaction !== null
          );

      const links =
        asObject(
          data.links
        );

      const currentPage =
        parseInteger(
          data.current_page
        ) ?? page;

      const hasNext =
        typeof links?.next ===
          "string" &&
        links.next.trim()
          .length > 0;

      return {
        ok: true,
        providerId: this.id,
        latencyMs,

        data: {
          transactions,

          nextCursor:
            hasNext
              ? String(
                  currentPage + 1
                )
              : null,
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
            "GoldRush transaction request timed out or was aborted.",
        };
      }

      return {
        ok: false,
        providerId: this.id,
        latencyMs,
        code: "UPSTREAM_ERROR",
        error:
          "GoldRush transaction request failed.",
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

export const goldRushTransactionsProvider =
  new GoldRushTransactionsProvider();
