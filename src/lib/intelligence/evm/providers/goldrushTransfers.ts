import type {
  ProviderCapability,
} from "@/lib/providers/types";

import type {
  EvmTokenTransfersRequest,
  EvmTransfersProvider,
} from "../provider";

import type {
  EvmNetworkContext,
  EvmProviderErrorCode,
  EvmProviderFailure,
  EvmProviderResult,
  EvmTransfer,
  EvmTransfersPage,
} from "../types";

import {
  getGoldRushEvmNetwork,
} from "./goldrushNetworks";

const CAPABILITIES = [
  "tokenTransfers",
] as const satisfies readonly ProviderCapability[];

const REQUEST_TIMEOUT_MS =
  15_000;

const PAGE_SIZE = 100;

const EVENT_BLOCK_RANGE =
  999_999;

const TRANSFER_EVENT_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

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
): number {
  return Math.max(
    0,
    Math.round(
      performance.now() -
        startedAt
    )
  );
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

function parseAddress(
  value: unknown
): string | null {
  const address =
    parseString(value);

  return (
    address &&
    EVM_ADDRESS.test(address)
  )
    ? address
    : null;
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

type TransferCursor =
  | {
      source: "wallet";
      page: number;
      offset: number;
    }
  | {
      source: "events";
      endingBlock: number;
      page: number;
    };

function parseNonNegativeInteger(
  value: string
): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed =
    Number(value);

  return (
    Number.isSafeInteger(parsed) &&
    parsed >= 0
  )
    ? parsed
    : null;
}

function parseCursor(
  cursor?: string | null
): TransferCursor | null {
  if (
    cursor === undefined ||
    cursor === null ||
    cursor === ""
  ) {
    return {
      source: "wallet",
      page: 0,
      offset: 0,
    };
  }

  const walletPage =
    parseNonNegativeInteger(
      cursor
    );

  if (walletPage !== null) {
    return {
      source: "wallet",
      page: walletPage,
      offset: 0,
    };
  }

  const walletMatch =
    /^wallet:(\d+):(\d+)$/.exec(
      cursor
    );

  if (walletMatch) {
    const page =
      parseNonNegativeInteger(
        walletMatch[1]
      );
    const offset =
      parseNonNegativeInteger(
        walletMatch[2]
      );

    if (
      page !== null &&
      offset !== null
    ) {
      return {
        source: "wallet",
        page,
        offset,
      };
    }
  }

  const match =
    /^events:(\d+):(\d+)$/.exec(
      cursor
    );

  if (!match) {
    return null;
  }

  const endingBlock =
    parseNonNegativeInteger(
      match[1]
    );
  const page =
    parseNonNegativeInteger(
      match[2]
    );

  if (
    endingBlock === null ||
    page === null
  ) {
    return null;
  }

  return {
    source: "events",
    endingBlock,
    page,
  };
}

function normalizeTransferValue(
  value: unknown,
  absolute = false
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  if (
    !/^[+-]?\d+$/.test(
      normalized
    )
  ) {
    return null;
  }

  try {
    const parsed =
      BigInt(normalized);

    if (
      parsed < 0n &&
      !absolute
    ) {
      return null;
    }

    return (
      parsed < 0n
        ? -parsed
        : parsed
    ).toString();
  } catch {
    return null;
  }
}

function normalizeHexValue(
  value: unknown
): string | null {
  const raw =
    parseString(value);

  if (
    !raw ||
    !/^0x[0-9a-fA-F]{64}$/.test(
      raw
    )
  ) {
    return null;
  }

  try {
    return BigInt(raw).toString();
  } catch {
    return null;
  }
}

function parseTopicAddress(
  value: unknown
): string | null {
  const topic =
    parseString(value);

  if (
    !topic ||
    !/^0x0{24}[0-9a-fA-F]{40}$/.test(
      topic
    )
  ) {
    return null;
  }

  return `0x${topic.slice(-40)}`;
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

  const data =
    asObject(root.data);

  for (const candidate of [
    root.error_message,
    root.message,
    data?.error_message,
    data?.message,
  ]) {
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

type GoldRushJsonResponse = {
  response: Response;
  payload: unknown;
};

async function fetchGoldRushJson(
  url: URL,
  apiKey: string,
  signal: AbortSignal
): Promise<GoldRushJsonResponse> {
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
        signal,
      }
    );

  let payload:
    unknown = null;

  try {
    payload =
      await response.json();
  } catch {
    // Validated by the caller.
  }

  return {
    response,
    payload,
  };
}

function responseFailure(
  result: GoldRushJsonResponse,
  startedAt: number,
  fallbackMessage: string
): EvmProviderFailure | null {
  const {
    response,
    payload,
  } = result;

  const latencyMs =
    elapsedMs(startedAt);

  if (response.status === 429) {
    return {
      ok: false,
      providerId: "goldrush",
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
      providerId: "goldrush",
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

  if (root?.error === true) {
    const message =
      errorMessage(
        payload,
        fallbackMessage
      );

    return {
      ok: false,
      providerId: "goldrush",
      latencyMs,
      code:
        classifyError(
          message
        ),
      error: message,
    };
  }

  return null;
}

function isHighActivityRejection(
  result: GoldRushJsonResponse
): boolean {
  return (
    result.response.status === 406 &&
    errorMessage(
      result.payload,
      ""
    )
      .toLowerCase()
      .includes(
        "predictably time out"
      )
  );
}

function normalizeTransfer(
  transferValue: unknown,
  parent: JsonObject,
  requestedToken: string
): EvmTransfer | null {
  const transfer =
    asObject(
      transferValue
    );

  if (!transfer) {
    return null;
  }

  const hash =
    parseString(
      transfer.tx_hash
    ) ??
    parseString(
      parent.tx_hash
    );

  if (
    !hash ||
    !TX_HASH.test(hash)
  ) {
    return null;
  }

  const tokenAddress =
    parseAddress(
      transfer.contract_address
    );

  if (
    !tokenAddress ||
    tokenAddress.toLowerCase() !==
      requestedToken.toLowerCase()
  ) {
    return null;
  }

  const value =
    normalizeTransferValue(
      transfer.delta,
      true
    );

  const from =
    parseAddress(
      transfer.from_address
    );

  const to =
    parseAddress(
      transfer.to_address
    );

  if (
    value === null ||
    !from ||
    !to
  ) {
    return null;
  }

  return {
    transactionHash: hash,

    blockNumber:
      parseInteger(
        parent.block_height
      ),

    timestamp:
      parseString(
        transfer.block_signed_at
      ) ??
      parseString(
        parent.block_signed_at
      ),

    from,

    to,

    tokenAddress,

    value,
  };
}

function decodedParameter(
  decodedValue: unknown,
  name: string
): unknown {
  const decoded =
    asObject(decodedValue);

  if (
    decoded?.name !==
      "Transfer" ||
    !Array.isArray(
      decoded.params
    )
  ) {
    return null;
  }

  for (
    const parameterValue of
      decoded.params
  ) {
    const parameter =
      asObject(
        parameterValue
      );

    if (
      parameter?.name === name
    ) {
      return parameter.value;
    }
  }

  return null;
}

function normalizeTransferEvent(
  eventValue: unknown,
  requestedToken: string,
  requestedAddress: string
): EvmTransfer | null {
  const event =
    asObject(eventValue);

  if (!event) {
    return null;
  }

  const tokenAddress =
    parseAddress(
      event.sender_address
    );

  if (
    !tokenAddress ||
    tokenAddress.toLowerCase() !==
      requestedToken.toLowerCase()
  ) {
    return null;
  }

  const topics =
    Array.isArray(
      event.raw_log_topics
    )
      ? event.raw_log_topics
      : [];

  const topicZero =
    parseString(topics[0]);

  if (
    topicZero?.toLowerCase() !==
      TRANSFER_EVENT_TOPIC
  ) {
    return null;
  }

  const hash =
    parseString(
      event.tx_hash
    );

  if (
    !hash ||
    !TX_HASH.test(hash)
  ) {
    return null;
  }

  const from =
    parseAddress(
      decodedParameter(
        event.decoded,
        "from"
      )
    ) ??
    parseTopicAddress(
      topics[1]
    );

  const to =
    parseAddress(
      decodedParameter(
        event.decoded,
        "to"
      )
    ) ??
    parseTopicAddress(
      topics[2]
    );

  const value =
    normalizeTransferValue(
      decodedParameter(
        event.decoded,
        "value"
      )
    ) ??
    normalizeHexValue(
      event.raw_log_data
    );

  if (
    !from ||
    !to ||
    value === null ||
    (
      from.toLowerCase() !==
        requestedAddress.toLowerCase() &&
      to.toLowerCase() !==
        requestedAddress.toLowerCase()
    )
  ) {
    return null;
  }

  return {
    transactionHash: hash,
    blockNumber:
      parseInteger(
        event.block_height
      ),
    timestamp:
      parseString(
        event.block_signed_at
      ),
    from,
    to,
    tokenAddress,
    value,
  };
}

function pageFromTransfers(
  transfers:
    readonly EvmTransfer[],
  paginationValue: unknown,
  page: number,
  offset: number
): EvmTransfersPage {
  const pagination =
    asObject(
      paginationValue
    );

  const currentPage =
    parseInteger(
      pagination?.page_number
    ) ?? page;

  const pageTransfers =
    transfers.slice(
      offset,
      offset + PAGE_SIZE
    );

  const nextOffset =
    offset +
      pageTransfers.length;

  let nextCursor:
    string | null = null;

  if (
    nextOffset <
      transfers.length
  ) {
    nextCursor =
      `wallet:${currentPage}:${nextOffset}`;
  } else if (
    pagination?.has_more ===
      true
  ) {
    nextCursor =
      `wallet:${currentPage + 1}:0`;
  }

  return {
    transfers: pageTransfers,
    nextCursor,
  };
}

async function loadTransferEventPage(
  chainName: string,
  address: string,
  tokenAddress: string,
  page: number,
  endingBlock: number | null,
  apiKey: string,
  signal: AbortSignal,
  startedAt: number
): Promise<
  EvmProviderResult<
    EvmTransfersPage
  >
> {
  let chainTip =
    endingBlock;

  if (chainTip === null) {
    const probeUrl =
      new URL(
        `https://api.covalenthq.com/v1/${chainName}/events/topics/${TRANSFER_EVENT_TOPIC}/`
      );

    probeUrl.searchParams.set(
      "secondary-topics",
      address
    );
    probeUrl.searchParams.set(
      "starting-block",
      "latest"
    );
    probeUrl.searchParams.set(
      "ending-block",
      "latest"
    );
    probeUrl.searchParams.set(
      "page-size",
      "1"
    );
    probeUrl.searchParams.set(
      "page-number",
      "0"
    );

    const probe =
      await fetchGoldRushJson(
        probeUrl,
        apiKey,
        signal
      );

    const probeFailure =
      responseFailure(
        probe,
        startedAt,
        "GoldRush transfer event probe failed."
      );

    if (probeFailure) {
      return probeFailure;
    }

    chainTip =
      parseInteger(
        unwrapData(
          probe.payload
        )?.chain_tip_height
      );
  }

  if (chainTip === null) {
    return {
      ok: false,
      providerId: "goldrush",
      latencyMs:
        elapsedMs(startedAt),
      code: "UPSTREAM_ERROR",
      error:
        "GoldRush transfer event probe did not contain a chain tip height.",
    };
  }

  const startingBlock =
    Math.max(
      0,
      chainTip -
        EVENT_BLOCK_RANGE
    );

  const eventsUrl =
    new URL(
      `https://api.covalenthq.com/v1/${chainName}/events/topics/${TRANSFER_EVENT_TOPIC}/`
    );

  eventsUrl.searchParams.set(
    "secondary-topics",
    address
  );
  eventsUrl.searchParams.set(
    "starting-block",
    String(
      startingBlock
    )
  );
  eventsUrl.searchParams.set(
    "ending-block",
    String(chainTip)
  );
  eventsUrl.searchParams.set(
    "page-size",
    String(PAGE_SIZE)
  );
  eventsUrl.searchParams.set(
    "page-number",
    String(page)
  );

  const events =
    await fetchGoldRushJson(
      eventsUrl,
      apiKey,
      signal
    );

  const eventsFailure =
    responseFailure(
      events,
      startedAt,
      "GoldRush transfer event request failed."
    );

  if (eventsFailure) {
    return eventsFailure;
  }

  const data =
    unwrapData(
      events.payload
    );

  if (
    !data ||
    !Array.isArray(
      data.items
    )
  ) {
    return {
      ok: false,
      providerId: "goldrush",
      latencyMs:
        elapsedMs(startedAt),
      code: "UPSTREAM_ERROR",
      error:
        "GoldRush transfer event response did not contain an items array.",
    };
  }

  const transfers =
    data.items
      .map(
        (value) =>
          normalizeTransferEvent(
            value,
            tokenAddress,
            address
          )
      )
      .filter(
        (
          transfer
        ): transfer is EvmTransfer =>
          transfer !== null
      );

  const pagination =
    asObject(
      data.pagination
    );
  const currentPage =
    parseInteger(
      pagination?.page_number
    ) ?? page;

  const nextCursor =
    pagination?.has_more ===
      true
      ? `events:${chainTip}:${currentPage + 1}`
      : startingBlock > 0
        ? `events:${startingBlock - 1}:0`
        : null;

  return {
    ok: true,
    providerId: "goldrush",
    latencyMs:
      elapsedMs(startedAt),
    data: {
      transfers,
      nextCursor,
    },
  };
}

export class GoldRushTransfersProvider
  implements EvmTransfersProvider
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

  async getTokenTransfers(
    request:
      EvmTokenTransfersRequest
  ): Promise<
    EvmProviderResult<
      EvmTransfersPage
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

    if (
      !EVM_ADDRESS.test(
        request.tokenAddress
      )
    ) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code:
          "INVALID_TOKEN_ADDRESS",
        error:
          "Invalid EVM token address.",
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

    const cursor =
      parseCursor(
        request.cursor
      );

    if (cursor === null) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code: "UPSTREAM_ERROR",
        error:
          "Invalid transfer pagination cursor.",
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
        `https://api.covalenthq.com/v1/${config.chainName}/address/${request.address}/transfers_v2/`
      );

    url.searchParams.set(
      "contract-address",
      request.tokenAddress
    );

    url.searchParams.set(
      "page-size",
      String(PAGE_SIZE)
    );

    url.searchParams.set(
      "page-number",
      String(cursor.page)
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
      if (
        cursor.source ===
          "events"
      ) {
        return await loadTransferEventPage(
          config.chainName,
          request.address,
          request.tokenAddress,
          cursor.page,
          cursor.endingBlock,
          apiKey,
          controller.signal,
          startedAt
        );
      }

      const result =
        await fetchGoldRushJson(
          url,
          apiKey,
          controller.signal
        );

      if (
        isHighActivityRejection(
          result
        )
      ) {
        return await loadTransferEventPage(
          config.chainName,
          request.address,
          request.tokenAddress,
          cursor.page,
          null,
          apiKey,
          controller.signal,
          startedAt
        );
      }

      const failure =
        responseFailure(
          result,
          startedAt,
          "GoldRush transfer request failed."
        );

      if (failure) {
        return failure;
      }

      const data =
        unwrapData(
          result.payload
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
          latencyMs:
            elapsedMs(startedAt),
          code: "UPSTREAM_ERROR",
          error:
            "GoldRush transfer response did not contain an items array.",
        };
      }

      const transfers:
        EvmTransfer[] = [];

      for (
        const itemValue of
          data.items
      ) {
        const item =
          asObject(
            itemValue
          );

        if (
          !item ||
          !Array.isArray(
            item.transfers
          )
        ) {
          continue;
        }

        for (
          const transferValue of
            item.transfers
        ) {
          const transfer =
            normalizeTransfer(
              transferValue,
              item,
              request.tokenAddress
            );

          if (transfer) {
            transfers.push(
              transfer
            );
          }
        }
      }

      return {
        ok: true,
        providerId: this.id,
        latencyMs:
          elapsedMs(startedAt),

        data:
          pageFromTransfers(
            transfers,
            data.pagination,
            cursor.page,
            cursor.offset
          ),
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
            "GoldRush transfer request timed out or was aborted.",
        };
      }

      return {
        ok: false,
        providerId: this.id,
        latencyMs,
        code: "UPSTREAM_ERROR",
        error:
          "GoldRush transfer request failed.",
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

export const goldRushTransfersProvider =
  new GoldRushTransfersProvider();
