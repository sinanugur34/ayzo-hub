import {
  providerUsageFetch,
} from "@/lib/providerUsageHttpCore";

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
  EvmProviderResult,
  EvmTransfer,
  EvmTransfersPage,
} from "../types";

import {
  getAlchemyEvmNetwork,
} from "./alchemyNetworks";

import {
  isAlchemyFreeEapiNetwork,
} from "./alchemyEapiNetworks";

const CAPABILITIES = [
  "tokenTransfers",
] as const satisfies readonly ProviderCapability[];

const REQUEST_TIMEOUT_MS =
  8_000;

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

const TX_HASH =
  /^0x[0-9a-fA-F]{64}$/;

/*
 * Keep this allow-list conservative.
 *
 * These are the networks for which AYZO
 * deliberately enables Alchemy Transfers API
 * in this wave.
 *
 * More chains can be enabled independently
 * after live capability verification.
 */
type JsonObject =
  Record<
    string,
    unknown
  >;

type DirectionCursor = {
  incoming:
    string | null;

  outgoing:
    string | null;
};

type DirectionResult =
  | {
      ok:
        true;

      transfers:
        readonly unknown[];

      pageKey:
        string | null;
    }
  | {
      ok:
        false;

      code:
        EvmProviderErrorCode;

      error:
        string;
    };

type NormalizedTransfer = {
  key:
    string;

  transfer:
    EvmTransfer;
};

function asObject(
  value:
    unknown
): JsonObject | null {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  return value as
    JsonObject;
}

function parseString(
  value:
    unknown
): string | null {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized
    ? normalized
    : null;
}

function parseAddress(
  value:
    unknown
): string | null {
  const normalized =
    parseString(
      value
    )
      ?.toLowerCase() ??
    null;

  return (
    normalized &&
    EVM_ADDRESS.test(
      normalized
    )
  )
    ? normalized
    : null;
}

function parseHash(
  value:
    unknown
): string | null {
  const normalized =
    parseString(
      value
    )
      ?.toLowerCase() ??
    null;

  return (
    normalized &&
    TX_HASH.test(
      normalized
    )
  )
    ? normalized
    : null;
}

function parseBlockNumber(
  value:
    unknown
): number | null {
  if (
    typeof value ===
      "number" &&
    Number.isSafeInteger(
      value
    ) &&
    value >=
      0
  ) {
    return value;
  }

  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  try {
    const normalized =
      value.trim();

    const parsed =
      normalized.startsWith(
        "0x"
      )
        ? BigInt(
            normalized
          )
        : BigInt(
            normalized
          );

    if (
      parsed <
        0n ||
      parsed >
        BigInt(
          Number.MAX_SAFE_INTEGER
        )
    ) {
      return null;
    }

    return Number(
      parsed
    );
  } catch {
    return null;
  }
}

function parseTimestamp(
  value:
    unknown
): string | null {
  const normalized =
    parseString(
      value
    );

  if (!normalized) {
    return null;
  }

  const parsed =
    Date.parse(
      normalized
    );

  return Number.isFinite(
    parsed
  )
    ? new Date(
        parsed
      ).toISOString()
    : null;
}

function parseRawValue(
  value:
    unknown
): string | null {
  const normalized =
    parseString(
      value
    );

  if (!normalized) {
    return null;
  }

  try {
    if (
      /^0x[0-9a-fA-F]+$/.test(
        normalized
      )
    ) {
      return BigInt(
        normalized
      ).toString();
    }

    if (
      /^\d+$/.test(
        normalized
      )
    ) {
      return BigInt(
        normalized
      ).toString();
    }

    return null;
  } catch {
    return null;
  }
}

function parsePageKey(
  value:
    unknown
): string | null {
  return parseString(
    value
  );
}

function encodeCursor(
  cursor:
    DirectionCursor
): string | null {
  if (
    !cursor.incoming &&
    !cursor.outgoing
  ) {
    return null;
  }

  return (
    "alchemy-transfer:" +
    Buffer
      .from(
        JSON.stringify({
          i:
            cursor.incoming,

          o:
            cursor.outgoing,
        }),
        "utf8"
      )
      .toString(
        "base64url"
      )
  );
}

function parseCursor(
  value:
    string |
    null |
    undefined
):
  | {
      ok:
        true;

      cursor:
        DirectionCursor | null;
    }
  | {
      ok:
        false;
    } {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      ""
  ) {
    return {
      ok:
        true,

      cursor:
        null,
    };
  }

  if (
    !value.startsWith(
      "alchemy-transfer:"
    )
  ) {
    return {
      ok:
        false,
    };
  }

  try {
    const encoded =
      value.slice(
        "alchemy-transfer:"
          .length
      );

    const parsed =
      JSON.parse(
        Buffer
          .from(
            encoded,
            "base64url"
          )
          .toString(
            "utf8"
          )
      ) as {
        i?:
          unknown;

        o?:
          unknown;
      };

    const incoming =
      parsed.i ===
        null
        ? null
        : parsePageKey(
            parsed.i
          );

    const outgoing =
      parsed.o ===
        null
        ? null
        : parsePageKey(
            parsed.o
          );

    if (
      parsed.i !==
        null &&
      incoming ===
        null
    ) {
      return {
        ok:
          false,
      };
    }

    if (
      parsed.o !==
        null &&
      outgoing ===
        null
    ) {
      return {
        ok:
          false,
      };
    }

    return {
      ok:
        true,

      cursor: {
        incoming,

        outgoing,
      },
    };
  } catch {
    return {
      ok:
        false,
    };
  }
}

function normalizeTransfer(
  value:
    unknown,

  tokenAddress:
    string
): NormalizedTransfer | null {
  const item =
    asObject(
      value
    );

  if (!item) {
    return null;
  }

  const transactionHash =
    parseHash(
      item.hash
    );

  const from =
    parseAddress(
      item.from
    );

  const to =
    parseAddress(
      item.to
    );

  const rawContract =
    asObject(
      item.rawContract
    );

  const rawValue =
    parseRawValue(
      rawContract
        ?.value
    );

  if (
    !transactionHash ||
    !from ||
    !to ||
    rawValue ===
      null
  ) {
    return null;
  }

  const metadata =
    asObject(
      item.metadata
    );

  const uniqueId =
    parseString(
      item.uniqueId
    );

  /*
   * Alchemy normally supplies uniqueId.
   * The deterministic fallback key prevents
   * incoming/outgoing self-transfer duplication
   * if uniqueId is absent.
   */
  const key =
    uniqueId ??
    [
      transactionHash,
      from,
      to,
      tokenAddress,
      rawValue,
      String(
        item.blockNum ??
        ""
      ),
    ].join(
      ":"
    );

  return {
    key,

    transfer: {
      transactionHash,

      blockNumber:
        parseBlockNumber(
          item.blockNum
        ),

      timestamp:
        parseTimestamp(
          metadata
            ?.blockTimestamp
        ),

      from,

      to,

      tokenAddress,

      value:
        rawValue,
    },
  };
}

function elapsedMs(
  startedAt:
    number
) {
  return Math.max(
    0,
    Math.round(
      performance.now() -
        startedAt
    )
  );
}

function classifyError(
  message:
    string
): EvmProviderErrorCode {
  const normalized =
    message
      .toLowerCase();

  if (
    normalized.includes(
      "rate limit"
    ) ||
    normalized.includes(
      "too many requests"
    ) ||
    normalized.includes(
      "compute units"
    )
  ) {
    return "RATE_LIMITED";
  }

  return "UPSTREAM_ERROR";
}

export class AlchemyTransfersProvider
  implements EvmTransfersProvider
{
  readonly id =
    "alchemy" as const;

  readonly capabilities =
    CAPABILITIES;

  supportsNetwork(
    network:
      EvmNetworkContext
  ): boolean {
    const config =
      getAlchemyEvmNetwork(
        network.networkId
      );

    return (
      config !==
        null &&
      config.chainId ===
        network.chainId &&
      isAlchemyFreeEapiNetwork(
        network.networkId
      )
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

  async getTokenTransfers(
    request:
      EvmTokenTransfersRequest
  ): Promise<
    EvmProviderResult<
      EvmTransfersPage
    >
  > {
    const address =
      request.address
        .trim()
        .toLowerCase();

    const tokenAddress =
      request.tokenAddress
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

    if (
      !EVM_ADDRESS.test(
        tokenAddress
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
          "INVALID_TOKEN_ADDRESS",

        error:
          "Invalid EVM token address.",
      };
    }

    const config =
      getAlchemyEvmNetwork(
        request.network
          .networkId
      );

    if (
      !config ||
      config.chainId !==
        request.network
          .chainId ||
      !isAlchemyFreeEapiNetwork(
        request.network
          .networkId
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
          "UNSUPPORTED_NETWORK",

        error:
          `Alchemy Transfers API is not enabled by AYZO for ${request.network.name}.`,
      };
    }

    const cursorResult =
      parseCursor(
        request.cursor
      );

    if (
      !cursorResult.ok
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
          "Invalid Alchemy transfer pagination cursor.",
      };
    }

    const apiKey =
      process.env
        .ALCHEMY_API_KEY
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
          "ALCHEMY_API_KEY is not configured.",
      };
    }

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

    if (
      request.signal
    ) {
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

    const endpoint =
      `https://${config.httpHost}/v2`;

    /*
     * AYZO's EvmTransfersPage limit is normally
     * 100. Split it across inbound/outbound so
     * the merged page stays bounded.
     */
    const maxPerDirection =
      Math.min(
        100,
        Math.max(
          1,
          Math.ceil(
            (
              request.limit ??
              100
            ) /
              2
          )
        )
      );

    const maxCount =
      `0x${maxPerDirection.toString(
        16
      )}`;

    const requestDirection =
      async (
        direction:
          "incoming" |
          "outgoing",

        pageKey:
          string |
          null |
          undefined
      ): Promise<
        DirectionResult
      > => {
        /*
         * null means that this direction was
         * already exhausted on a prior page.
         */
        if (
          pageKey ===
            null
        ) {
          return {
            ok:
              true,

            transfers:
              [],

            pageKey:
              null,
          };
        }

        const directionFilter =
          direction ===
            "incoming"
            ? {
                toAddress:
                  address,
              }
            : {
                fromAddress:
                  address,
              };

        try {
          const response =
            await providerUsageFetch(
              {
                provider:
                  "alchemy",

                operation:
                  "evm.transfers",
              },

              endpoint,

              () =>
                fetch(
                  endpoint,
                  {
                    method:
                      "POST",

                    headers: {
                      Authorization:
                        `Bearer ${apiKey}`,

                      "Content-Type":
                        "application/json",
                    },

                    body:
                      JSON.stringify({
                        jsonrpc:
                          "2.0",

                        id:
                          direction ===
                            "incoming"
                            ? 1
                            : 2,

                        method:
                          "alchemy_getAssetTransfers",

                        params: [
                          {
                            fromBlock:
                              "0x0",

                            toBlock:
                              "latest",

                            ...directionFilter,

                            contractAddresses: [
                              tokenAddress,
                            ],

                            category: [
                              "erc20",
                            ],

                            withMetadata:
                              true,

                            excludeZeroValue:
                              false,

                            maxCount,

                            order:
                              "desc",

                            ...(
                              typeof pageKey ===
                                "string"
                                ? {
                                    pageKey,
                                  }
                                : {}
                            ),
                          },
                        ],
                      }),

                    cache:
                      "no-store",

                    signal:
                      controller.signal,
                  }
                )
            );

          if (
            response.status ===
              429
          ) {
            return {
              ok:
                false,

              code:
                "RATE_LIMITED",

              error:
                "Alchemy transfer rate limit reached.",
            };
          }

          if (
            !response.ok
          ) {
            return {
              ok:
                false,

              code:
                "UPSTREAM_ERROR",

              error:
                `Alchemy transfer request returned HTTP ${response.status}.`,
            };
          }

          const payload =
            asObject(
              await response
                .json()
            );

          if (!payload) {
            return {
              ok:
                false,

              code:
                "UPSTREAM_ERROR",

              error:
                "Alchemy returned an invalid transfer response.",
            };
          }

          const rpcError =
            asObject(
              payload.error
            );

          if (rpcError) {
            const message =
              typeof rpcError
                .message ===
                "string"
                ? rpcError
                    .message
                    .trim()
                : "Alchemy transfer RPC error.";

            return {
              ok:
                false,

              code:
                classifyError(
                  message
                ),

              error:
                message,
            };
          }

          const result =
            asObject(
              payload.result
            );

          if (
            !result ||
            !Array.isArray(
              result.transfers
            )
          ) {
            return {
              ok:
                false,

              code:
                "UPSTREAM_ERROR",

              error:
                "Alchemy transfer response did not contain transfers.",
            };
          }

          return {
            ok:
              true,

            transfers:
              result.transfers,

            pageKey:
              parsePageKey(
                result.pageKey
              ),
          };
        } catch {
          if (
            controller.signal
              .aborted
          ) {
            return {
              ok:
                false,

              code:
                "TIMEOUT",

              error:
                "Alchemy transfer request timed out or was aborted.",
            };
          }

          return {
            ok:
              false,

            code:
              "UPSTREAM_ERROR",

            error:
              "Alchemy transfer request failed.",
          };
        }
      };

    try {
      const [
        outgoing,
        incoming,
      ] =
        await Promise.all([
          requestDirection(
            "outgoing",

            cursorResult
              .cursor
              ?.outgoing
          ),

          requestDirection(
            "incoming",

            cursorResult
              .cursor
              ?.incoming
          ),
        ]);

      const latencyMs =
        elapsedMs(
          startedAt
        );

      if (
        !outgoing.ok
      ) {
        return {
          ok:
            false,

          providerId:
            this.id,

          latencyMs,

          code:
            outgoing.code,

          error:
            outgoing.error,
        };
      }

      if (
        !incoming.ok
      ) {
        return {
          ok:
            false,

          providerId:
            this.id,

          latencyMs,

          code:
            incoming.code,

          error:
            incoming.error,
        };
      }

      const unique =
        new Map<
          string,
          EvmTransfer
        >();

      for (
        const raw of [
          ...outgoing
            .transfers,
          ...incoming
            .transfers,
        ]
      ) {
        const normalized =
          normalizeTransfer(
            raw,
            tokenAddress
          );

        if (
          !normalized
        ) {
          continue;
        }

        if (
          !unique.has(
            normalized.key
          )
        ) {
          unique.set(
            normalized.key,
            normalized.transfer
          );
        }
      }

      const transfers =
        [
          ...unique.values(),
        ]
          .sort(
            (
              left,
              right
            ) =>
              (
                right
                  .blockNumber ??
                -1
              ) -
              (
                left
                  .blockNumber ??
                -1
              ) ||
              left
                .transactionHash
                .localeCompare(
                  right
                    .transactionHash
                )
          )
          .slice(
            0,
            request.limit ??
              100
          );

      return {
        ok:
          true,

        providerId:
          this.id,

        latencyMs,

        data: {
          transfers,

          nextCursor:
            encodeCursor({
              incoming:
                incoming.pageKey,

              outgoing:
                outgoing.pageKey,
            }),
        },
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

export const alchemyTransfersProvider =
  new AlchemyTransfersProvider();
