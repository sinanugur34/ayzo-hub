import {
  providerUsageFetch,
} from "@/lib/providerUsageHttpCore";
import type {
  NetworkId,
} from "@/lib/networks/registry";
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

const CAPABILITIES = [
  "tokenHolders",
] as const satisfies readonly ProviderCapability[];

const REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 1_000;
const CURSOR_PREFIX = "ankr:";
const TOTAL_SUPPLY_SELECTOR = "0x18160ddd";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

type JsonObject =
  Record<string, unknown>;

type AnkrNetworkConfig = {
  networkId: NetworkId;
  chainId: number;
  advancedChain: string;
  rpcChain: string;
};

const NETWORKS:
  Partial<
    Record<
      NetworkId,
      AnkrNetworkConfig
    >
  > = {
    base: {
      networkId: "base",
      chainId: 8453,
      advancedChain: "base",
      rpcChain: "base",
    },
    bnb: {
      networkId: "bnb",
      chainId: 56,
      advancedChain: "bsc",
      rpcChain: "bsc",
    },
    arbitrum: {
      networkId: "arbitrum",
      chainId: 42161,
      advancedChain: "arbitrum",
      rpcChain: "arbitrum",
    },
    polygon: {
      networkId: "polygon",
      chainId: 137,
      advancedChain: "polygon",
      rpcChain: "polygon",
    },
    avalanche: {
      networkId: "avalanche",
      chainId: 43114,
      advancedChain: "avalanche",
      rpcChain: "avalanche",
    },
    linea: {
      networkId: "linea",
      chainId: 59144,
      advancedChain: "linea",
      rpcChain: "linea",
    },
  };

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

function getConfig(
  network: EvmNetworkContext
): AnkrNetworkConfig | null {
  const config =
    NETWORKS[network.networkId];

  if (
    !config ||
    config.chainId !==
      network.chainId
  ) {
    return null;
  }

  return config;
}

function failure(
  code: EvmProviderErrorCode,
  error: string,
  latencyMs: number | null
): EvmProviderResult<never> {
  return {
    ok: false,
    providerId: "ankr",
    latencyMs,
    code,
    error,
  };
}

function normalizeLimit(
  value: number | undefined
): number | null {
  if (value === undefined) {
    return DEFAULT_PAGE_SIZE;
  }

  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > MAX_PAGE_SIZE
  ) {
    return null;
  }

  return value;
}

function parseCount(
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

    return Number.isSafeInteger(
      parsed
    )
      ? parsed
      : null;
  }

  return null;
}

function isUnsignedInteger(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    /^\d+$/.test(value)
  );
}

function parseTotalSupply(
  value: unknown
): string | null {
  if (
    typeof value !== "string" ||
    !/^0x[0-9a-fA-F]+$/.test(
      value
    )
  ) {
    return null;
  }

  try {
    const parsed =
      BigInt(value);

    return parsed > 0n
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function calculatePercentage(
  balance: string,
  totalSupply: string
): number | null {
  try {
    const balanceValue =
      BigInt(balance);

    const supplyValue =
      BigInt(totalSupply);

    if (
      balanceValue < 0n ||
      supplyValue <= 0n
    ) {
      return null;
    }

    /*
     * Six decimal places of
     * percentage precision.
     */
    const scaled =
      (
        balanceValue *
        100_000_000n
      ) /
      supplyValue;

    return (
      Number(scaled) /
      1_000_000
    );
  } catch {
    return null;
  }
}

function normalizeHolder(
  value: unknown,
  totalSupply: string
): EvmTokenHolder | null {
  const item =
    asObject(value);

  if (!item) {
    return null;
  }

  const address =
    typeof item.holderAddress ===
      "string"
      ? item.holderAddress.trim()
      : "";

  const balance =
    item.balanceRawInteger;

  if (
    !EVM_ADDRESS.test(address) ||
    !isUnsignedInteger(balance)
  ) {
    return null;
  }

  return {
    address:
      address.toLowerCase(),

    balance,

    percentage:
      calculatePercentage(
        balance,
        totalSupply
      ),
  };
}

function sortHolders(
  holders:
    readonly EvmTokenHolder[]
): EvmTokenHolder[] {
  return [...holders].sort(
    (
      left,
      right
    ) => {
      const a =
        BigInt(left.balance);

      const b =
        BigInt(right.balance);

      if (a === b) {
        return left.address
          .localeCompare(
            right.address
          );
      }

      return a > b
        ? -1
        : 1;
    }
  );
}

function encodeCursor(
  value: unknown
): string | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 4096
  ) {
    return null;
  }

  return (
    CURSOR_PREFIX +
    encodeURIComponent(value)
  );
}

function decodeCursor(
  cursor?: string | null
): string | null | undefined {
  if (
    cursor === undefined ||
    cursor === null ||
    cursor === ""
  ) {
    return null;
  }

  if (
    !cursor.startsWith(
      CURSOR_PREFIX
    )
  ) {
    return undefined;
  }

  const encoded =
    cursor.slice(
      CURSOR_PREFIX.length
    );

  if (
    !encoded ||
    encoded.length > 12000
  ) {
    return undefined;
  }

  try {
    const decoded =
      decodeURIComponent(
        encoded
      );

    return decoded ||
      undefined;
  } catch {
    return undefined;
  }
}

function errorMessage(
  payload: unknown,
  fallback: string
): string {
  const root =
    asObject(payload);

  const error =
    asObject(root?.error);

  for (
    const candidate of [
      error?.message,
      root?.message,
    ]
  ) {
    if (
      typeof candidate ===
        "string" &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  return fallback;
}

type HolderRpcProvider = "ankr" | "alchemy";

async function rpcRequest(
  provider: HolderRpcProvider,
  url: URL,
  operation: string,
  body: unknown,
  callerSignal?: AbortSignal
): Promise<{
  response: Response;
  payload: unknown;
}> {
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

  if (callerSignal) {
    if (
      callerSignal.aborted
    ) {
      controller.abort();
    } else {
      callerSignal
        .addEventListener(
          "abort",
          abortFromCaller,
          {
            once: true,
          }
        );
    }
  }

  try {
    const response =
      await providerUsageFetch(
        {
          provider,
          operation,
        },
        url,
        () =>
          fetch(
            url,
            {
              method: "POST",

              headers: {
                Accept:
                  "application/json",

                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  body
                ),

              cache:
                "no-store",

              signal:
                controller.signal,
            }
          )
      );

    let payload:
      unknown = null;

    try {
      payload =
        await response.json();
    } catch {
      // Caller validates payload.
    }

    return {
      response,
      payload,
    };
  } finally {
    clearTimeout(timeout);

    callerSignal
      ?.removeEventListener(
        "abort",
        abortFromCaller
      );
  }
}

function isAdvancedRateLimit(
  response: Response,
  payload: unknown
): boolean {
  if (response.status === 429) {
    return true;
  }

  const root = asObject(payload);
  const error = asObject(root?.error);

  if (!error) {
    return false;
  }

  if (error.code === -32090) {
    return true;
  }

  const message =
    typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  return (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("quota exceeded")
  );
}

function getRetryDelay(
  response: Response
): number | null {
  const header =
    response.headers.get("retry-after");

  if (!header) {
    return 1500;
  }

  let delay: number;

  const seconds = Number(header);

  if (
    Number.isFinite(seconds) &&
    seconds >= 0
  ) {
    delay = Math.ceil(seconds * 1000);
  } else {
    const date = Date.parse(header);

    if (!Number.isFinite(date)) {
      return null;
    }

    delay = Math.max(0, date - Date.now());
  }

  if (delay > 3000) {
    return null;
  }

  return Math.max(0, delay);
}

async function waitForRetry(
  ms: number,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted) {
    throw new DOMException(
      "Aborted",
      "AbortError"
    );
  }

  if (ms <= 0) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    /*
     * const timer fixes the previous
     * ESLint prefer-const failure.
     */
    const timer = setTimeout(() => {
      signal?.removeEventListener(
        "abort",
        onAbort
      );

      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);

      signal?.removeEventListener(
        "abort",
        onAbort
      );

      reject(
        new DOMException(
          "Aborted",
          "AbortError"
        )
      );
    }

    signal?.addEventListener(
      "abort",
      onAbort,
      { once: true }
    );
  });
}

async function requestAnkrAdvanced(
  url: URL,
  body: unknown,
  signal?: AbortSignal
): Promise<{
  response: Response;
  payload: unknown;
}> {
  const first = await rpcRequest(
    "ankr",
    url,
    "ankr_getTokenHolders",
    body,
    signal
  );

  if (
    !isAdvancedRateLimit(
      first.response,
      first.payload
    )
  ) {
    return first;
  }

  const delay = getRetryDelay(first.response);

  if (delay === null) {
    return first;
  }

  await waitForRetry(delay, signal);

  return rpcRequest(
    "ankr",
    url,
    "ankr_getTokenHolders",
    body,
    signal
  );
}

async function readTotalSupply(
  config: AnkrNetworkConfig,
  tokenAddress: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<
  | {
      ok: true;
      totalSupply: string;
    }
  | {
      ok: false;
      code:
        EvmProviderErrorCode;
      error: string;
    }
> {
  let url: URL;

  if (config.networkId === "linea") {
    const alchemyKey =
      process.env.ALCHEMY_API_KEY?.trim();

    if (!alchemyKey) {
      return {
        ok: false,
        code: "UPSTREAM_ERROR",
        error:
          "ALCHEMY_API_KEY is not configured for Linea totalSupply.",
      };
    }

    url = new URL(
      `https://linea-mainnet.g.alchemy.com/v2/${alchemyKey}`
    );
  } else {
    url = new URL(
      `https://rpc.ankr.com/${config.rpcChain}/${apiKey}`
    );
  }

  try {
    const {
      response,
      payload,
    } =
      await rpcRequest(
        config.networkId === "linea"
          ? "alchemy"
          : "ankr",

        url,

        "evm.holders.totalSupply",

        {
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",

          params: [
            {
              to:
                tokenAddress,

              data:
                TOTAL_SUPPLY_SELECTOR,
            },

            "latest",
          ],
        },

        signal
      );

    if (
      response.status === 429
    ) {
      return {
        ok: false,
        code:
          "RATE_LIMITED",
        error:
          "Ankr Chain RPC rate limit reached.",
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        code:
          "UPSTREAM_ERROR",

        error:
          errorMessage(
            payload,
            `Ankr Chain RPC returned HTTP ${response.status}.`
          ),
      };
    }

    const root =
      asObject(payload);

    if (
      asObject(root?.error)
    ) {
      return {
        ok: false,
        code:
          "UPSTREAM_ERROR",

        error:
          errorMessage(
            payload,
            "Ankr Chain RPC returned an error."
          ),
      };
    }

    const totalSupply =
      parseTotalSupply(
        root?.result
      );

    if (!totalSupply) {
      return {
        ok: false,
        code:
          "UPSTREAM_ERROR",

        error:
          "Ankr Chain RPC returned an invalid totalSupply value.",
      };
    }

    return {
      ok: true,
      totalSupply,
    };
  } catch (
    error
  ) {
    const timedOut =
      error instanceof Error &&
      error.name ===
        "AbortError";

    return {
      ok: false,

      code:
        timedOut
          ? "TIMEOUT"
          : "UPSTREAM_ERROR",

      error:
        timedOut
          ? "Ankr totalSupply request timed out or was aborted."
          : "Ankr totalSupply request failed.",
    };
  }
}

export class AnkrHoldersProvider
  implements EvmTokenHoldersProvider
{
  readonly id =
    "ankr" as const;

  readonly capabilities =
    CAPABILITIES;

  supportsNetwork(
    network:
      EvmNetworkContext
  ): boolean {
    return (
      getConfig(network) !==
      null
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

  async getTokenHolders(
    request:
      EvmPaginatedAddressRequest
  ): Promise<
    EvmProviderResult<
      EvmTokenHolders
    >
  > {
    const startedAt =
      performance.now();

    if (
      !EVM_ADDRESS.test(
        request.address
      )
    ) {
      return failure(
        "INVALID_ADDRESS",
        "Invalid EVM token address.",
        null
      );
    }

    const config =
      getConfig(
        request.network
      );

    if (!config) {
      return failure(
        "UNSUPPORTED_NETWORK",
        `Ankr token holders are not enabled for ${request.network.name}.`,
        null
      );
    }

    const limit =
      normalizeLimit(
        request.limit
      );

    if (limit === null) {
      return failure(
        "UPSTREAM_ERROR",
        `Ankr holder limit must be between 1 and ${MAX_PAGE_SIZE}.`,
        null
      );
    }

    const pageToken =
      decodeCursor(
        request.cursor
      );

    if (
      pageToken ===
      undefined
    ) {
      return failure(
        "UPSTREAM_ERROR",
        "Invalid Ankr holder cursor.",
        null
      );
    }

    const apiKey =
      process.env
        .ANKR_API_KEY
        ?.trim();

    if (!apiKey) {
      return failure(
        "UPSTREAM_ERROR",
        "ANKR_API_KEY is not configured.",
        null
      );
    }

    const supply =
      await readTotalSupply(
        config,
        request.address,
        apiKey,
        request.signal
      );

    if (!supply.ok) {
      return failure(
        supply.code,
        supply.error,
        elapsedMs(
          startedAt
        )
      );
    }

    const url =
      new URL(
        `https://rpc.ankr.com/multichain/${apiKey}`
      );

    const params:
      Record<
        string,
        unknown
      > = {
        blockchain:
          config.advancedChain,

        contractAddress:
          request.address,

        pageSize:
          limit,
      };

    if (pageToken) {
      params.pageToken =
        pageToken;
    }

    try {
      const {
        response,
        payload,
      } =
        await requestAnkrAdvanced(
          url,

          {
            jsonrpc: "2.0",
            id: 1,

            method:
              "ankr_getTokenHolders",

            params,
          },

          request.signal
        );

      const latencyMs =
        elapsedMs(
          startedAt
        );

      if (
        response.status === 429
      ) {
        return failure(
          "RATE_LIMITED",
          "Ankr Advanced API rate limit reached.",
          latencyMs
        );
      }

      if (!response.ok) {
        return failure(
          "UPSTREAM_ERROR",

          errorMessage(
            payload,
            `Ankr Advanced API returned HTTP ${response.status}.`
          ),

          latencyMs
        );
      }

      const root =
        asObject(payload);

      if (
        asObject(root?.error)
      ) {
        const message =
          errorMessage(
            payload,
            "Ankr Advanced API returned an error."
          );

        const normalized =
          message.toLowerCase();

        return failure(
          (
            normalized.includes(
              "rate limit"
            ) ||
            normalized.includes(
              "too many"
            )
          )
            ? "RATE_LIMITED"
            : "UPSTREAM_ERROR",

          message,

          latencyMs
        );
      }

      const result =
        asObject(
          root?.result
        );

      if (
        !result ||
        !Array.isArray(
          result.holders
        )
      ) {
        return failure(
          "UPSTREAM_ERROR",

          "Ankr holder response did not contain a holders array.",

          latencyMs
        );
      }

      const holders =
        sortHolders(
          result.holders
            .map(
              value =>
                normalizeHolder(
                  value,
                  supply
                    .totalSupply
                )
            )
            .filter(
              (
                holder
              ): holder is
                EvmTokenHolder =>
                holder !==
                null
            )
        );

      return {
        ok: true,

        providerId:
          this.id,

        latencyMs,

        data: {
          holders,

          totalSupply:
            supply.totalSupply,

          totalCount:
            parseCount(
              result.holdersCount
            ),

          nextCursor:
            encodeCursor(
              result.nextPageToken
            ),
        },
      };
    } catch (
      error
    ) {
      const latencyMs =
        elapsedMs(
          startedAt
        );

      const timedOut =
        error instanceof Error &&
        error.name ===
          "AbortError";

      return failure(
        timedOut
          ? "TIMEOUT"
          : "UPSTREAM_ERROR",

        timedOut
          ? "Ankr holder request timed out or was aborted."
          : "Ankr holder request failed.",

        latencyMs
      );
    }
  }
}

export const ankrHoldersProvider =
  new AnkrHoldersProvider();
