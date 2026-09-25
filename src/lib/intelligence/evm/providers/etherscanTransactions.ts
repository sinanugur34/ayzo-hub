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
      performance.now() -
        startedAt
    )
  );
}

function parsePageIndex(
  cursor?:
    string | null
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
    Number.isSafeInteger(
      parsed
    ) &&
    parsed >= 0
  )
    ? parsed
    : null;
}

function parseAddress(
  value: unknown
): string | null {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  if (!normalized) {
    return null;
  }

  return EVM_ADDRESS.test(
    normalized
  )
    ? normalized
    : null;
}

function parseHash(
  value: unknown
): string | null {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  return TX_HASH.test(
    normalized
  )
    ? normalized
    : null;
}

function parseInteger(
  value: unknown
): number | null {
  if (
    typeof value ===
      "number" &&
    Number.isSafeInteger(
      value
    ) &&
    value >= 0
  ) {
    return value;
  }

  if (
    typeof value !==
      "string" ||
    !/^\d+$/.test(
      value.trim()
    )
  ) {
    return null;
  }

  const parsed =
    Number(
      value.trim()
    );

  return (
    Number.isSafeInteger(
      parsed
    ) &&
    parsed >= 0
  )
    ? parsed
    : null;
}

function parseTimestamp(
  value: unknown
): string | null {
  const seconds =
    parseInteger(
      value
    );

  if (
    seconds === null
  ) {
    return null;
  }

  const date =
    new Date(
      seconds * 1000
    );

  return Number.isFinite(
    date.getTime()
  )
    ? date.toISOString()
    : null;
}

function normalizeValue(
  value: unknown,
  failed:
    boolean
): string | null {
  if (failed) {
    return null;
  }

  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  if (
    !/^\d+$/.test(
      normalized
    )
  ) {
    return null;
  }

  try {
    return BigInt(
      normalized
    ).toString();
  } catch {
    return null;
  }
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
    parseHash(
      item.hash
    );

  const blockNumber =
    parseInteger(
      item.blockNumber
    );

  const from =
    parseAddress(
      item.from
    );

  const rawTo =
    typeof item.to ===
      "string"
      ? item.to.trim()
      : "";

  const to =
    rawTo
      ? parseAddress(
          rawTo
        )
      : null;

  if (
    !hash ||
    blockNumber === null ||
    !from ||
    (
      rawTo &&
      !to
    )
  ) {
    return null;
  }

  const failed =
    item.isError ===
      "1";

  return {
    hash,

    blockNumber,

    timestamp:
      parseTimestamp(
        item.timeStamp
      ),

    from,

    to,

    value:
      normalizeValue(
        item.value,
        failed
      ),
  };
}

function errorText(
  payload: unknown,
  fallback:
    string
) {
  const root =
    asObject(
      payload
    );

  if (!root) {
    return fallback;
  }

  if (
    typeof root.result ===
      "string" &&
    root.result.trim()
  ) {
    return root.result.trim();
  }

  if (
    typeof root.message ===
      "string" &&
    root.message.trim()
  ) {
    return root.message.trim();
  }

  return fallback;
}

function classifyError(
  message:
    string
): EvmProviderErrorCode {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "rate limit"
    ) ||
    normalized.includes(
      "max rate limit"
    ) ||
    normalized.includes(
      "too many requests"
    )
  ) {
    return "RATE_LIMITED";
  }

  return "UPSTREAM_ERROR";
}

export class EtherscanTransactionsProvider
  implements EvmTransactionsProvider
{
  readonly id =
    "etherscan" as const;

  readonly capabilities =
    CAPABILITIES;

  supportsNetwork(
    network:
      EvmNetworkContext
  ): boolean {
    return (
      Number.isSafeInteger(
        network.chainId
      ) &&
      network.chainId >
        0
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

  async getTransactions(
    request:
      EvmPaginatedAddressRequest
  ): Promise<
    EvmProviderResult<
      EvmTransactionsPage
    >
  > {
    const address =
      request.address
        .trim()
        .toLowerCase();

    if (
      !EVM_ADDRESS.test(
        address
      )
    ) {
      return {
        ok:
          false,
        providerId:
          this.id,
        latencyMs:
          null,
        code:
          "INVALID_ADDRESS",
        error:
          "Invalid EVM address.",
      };
    }

    const pageIndex =
      parsePageIndex(
        request.cursor
      );

    if (
      pageIndex ===
        null
    ) {
      return {
        ok:
          false,
        providerId:
          this.id,
        latencyMs:
          null,
        code:
          "UPSTREAM_ERROR",
        error:
          "Invalid Etherscan transaction cursor.",
      };
    }

    const apiKey =
      process.env
        .ETHERSCAN_API_KEY
        ?.trim();

    if (!apiKey) {
      return {
        ok:
          false,
        providerId:
          this.id,
        latencyMs:
          null,
        code:
          "UPSTREAM_ERROR",
        error:
          "ETHERSCAN_API_KEY is not configured.",
      };
    }

    const offset =
      Math.min(
        100,
        Math.max(
          1,
          request.limit ??
            100
        )
      );

    const url =
      new URL(
        "https://api.etherscan.io/v2/api"
      );

    url.searchParams.set(
      "chainid",
      String(
        request.network
          .chainId
      )
    );

    url.searchParams.set(
      "module",
      "account"
    );

    url.searchParams.set(
      "action",
      "txlist"
    );

    url.searchParams.set(
      "address",
      address
    );

    url.searchParams.set(
      "startblock",
      "0"
    );

    url.searchParams.set(
      "page",
      String(
        pageIndex +
          1
      )
    );

    url.searchParams.set(
      "offset",
      String(
        offset
      )
    );

    url.searchParams.set(
      "sort",
      "desc"
    );

    url.searchParams.set(
      "apikey",
      apiKey
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
        request.signal
          .aborted
      ) {
        controller.abort();
      } else {
        request.signal
          .addEventListener(
            "abort",
            abortFromCaller,
            {
              once:
                true,
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
        response.status ===
          429
      ) {
        return {
          ok:
            false,
          providerId:
            this.id,
          latencyMs,
          code:
            "RATE_LIMITED",
          error:
            errorText(
              payload,
              "Etherscan rate limit reached."
            ),
        };
      }

      if (
        !response.ok
      ) {
        const message =
          errorText(
            payload,
            `Etherscan returned HTTP ${response.status}.`
          );

        return {
          ok:
            false,
          providerId:
            this.id,
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
        asObject(
          payload
        );

      if (!root) {
        return {
          ok:
            false,
          providerId:
            this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            "Etherscan returned an invalid response.",
        };
      }

      const status =
        typeof root.status ===
          "string"
          ? root.status
          : "";

      const result =
        root.result;

      const noTransactions =
        status ===
          "0" &&
        typeof result ===
          "string" &&
        result
          .toLowerCase()
          .includes(
            "no transactions"
          );

      if (
        noTransactions
      ) {
        return {
          ok:
            true,
          providerId:
            this.id,
          latencyMs,
          data: {
            transactions:
              [],
            nextCursor:
              null,
          },
        };
      }

      if (
        status !==
          "1" ||
        !Array.isArray(
          result
        )
      ) {
        const message =
          errorText(
            payload,
            "Etherscan transaction API error."
          );

        return {
          ok:
            false,
          providerId:
            this.id,
          latencyMs,
          code:
            classifyError(
              message
            ),
          error:
            message,
        };
      }

      const transactions =
        result
          .map(
            normalizeTransaction
          )
          .filter(
            (
              transaction
            ): transaction is EvmTransaction =>
              transaction !==
              null
          );

      return {
        ok:
          true,
        providerId:
          this.id,
        latencyMs,
        data: {
          transactions,

          nextCursor:
            result.length >=
              offset
              ? String(
                  pageIndex +
                    1
                )
              : null,
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
          ok:
            false,
          providerId:
            this.id,
          latencyMs,
          code:
            "TIMEOUT",
          error:
            "Etherscan transaction request timed out or was aborted.",
        };
      }

      return {
        ok:
          false,
        providerId:
          this.id,
        latencyMs,
        code:
          "UPSTREAM_ERROR",
        error:
          "Etherscan transaction request failed.",
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

export const etherscanTransactionsProvider =
  new EtherscanTransactionsProvider();
