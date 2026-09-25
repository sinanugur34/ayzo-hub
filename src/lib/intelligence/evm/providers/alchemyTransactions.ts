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
  getAlchemyEvmNetwork,
} from "./alchemyNetworks";

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

type TransferRequestResult =
  | {
      ok: true;

      transfers:
        readonly unknown[];

      pageKey:
        string | null;
    }
  | {
      ok: false;

      code:
        EvmProviderErrorCode;

      error:
        string;
    };

type AlchemyTransactionCursor = {
  incoming:
    string | null;

  outgoing:
    string | null;
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

function parseTimestamp(
  value: unknown
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

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

function parseBlockNumber(
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
      "string"
  ) {
    return null;
  }

  try {
    const parsed =
      value.startsWith(
        "0x"
      )
        ? BigInt(value)
        : BigInt(
            value.trim()
          );

    if (
      parsed < 0n ||
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

function parsePageKey(
  value: unknown
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

function encodeCursor(
  cursor:
    AlchemyTransactionCursor
): string | null {
  if (
    !cursor.incoming &&
    !cursor.outgoing
  ) {
    return null;
  }

  return (
    "alchemy:" +
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
    string | null | undefined
):
  | {
      ok: true;

      cursor:
        AlchemyTransactionCursor | null;
    }
  | {
      ok: false;
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
      "alchemy:"
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
        "alchemy:".length
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

function parseRawValue(
  value: unknown
): string | null {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

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

function normalizeTransfer(
  value: unknown
): EvmTransaction | null {
  const transfer =
    asObject(value);

  if (!transfer) {
    return null;
  }

  const hash =
    parseHash(
      transfer.hash
    );

  if (!hash) {
    return null;
  }

  const metadata =
    asObject(
      transfer.metadata
    );

  const rawContract =
    asObject(
      transfer.rawContract
    );

  return {
    hash,

    blockNumber:
      parseBlockNumber(
        transfer.blockNum
      ),

    timestamp:
      parseTimestamp(
        metadata
          ?.blockTimestamp
      ),

    from:
      parseAddress(
        transfer.from
      ),

    to:
      parseAddress(
        transfer.to
      ),

    value:
      parseRawValue(
        rawContract
          ?.value
      ),
  };
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
      "compute units"
    )
  ) {
    return "RATE_LIMITED";
  }

  return "UPSTREAM_ERROR";
}

export class AlchemyTransactionsProvider
  implements EvmTransactionsProvider
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
      config !== null &&
      config.chainId ===
        network.chainId
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
        ok: false,
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

    const config =
      getAlchemyEvmNetwork(
        request.network
          .networkId
      );

    if (
      !config ||
      config.chainId !==
        request.network.chainId
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
          `Alchemy transaction history is not enabled for ${request.network.name}.`,
      };
    }

    const parsedCursor =
      parseCursor(
        request.cursor
      );

    if (
      !parsedCursor.ok
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
          "Invalid Alchemy transaction pagination cursor.",
      };
    }

    const apiKey =
      process.env
        .ALCHEMY_API_KEY
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

    const endpoint =
      `https://${config.httpHost}/v2`;

    const maxPerDirection =
      Math.min(
        50,
        Math.max(
          1,
          Math.ceil(
            (
              request.limit ??
              50
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
          string | null | undefined
      ): Promise<
        TransferRequestResult
      > => {
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

        const filter =
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
            await fetch(
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

                        ...filter,

                        category: [
                          "external",
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
                "Alchemy transaction history rate limit reached.",
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
                `Alchemy transaction history returned HTTP ${response.status}.`,
            };
          }

          const payload =
            asObject(
              await response.json()
            );

          if (!payload) {
            return {
              ok:
                false,
              code:
                "UPSTREAM_ERROR",
              error:
                "Alchemy returned an invalid transaction-history response.",
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
                : "Alchemy transaction-history RPC error.";

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
                "Alchemy transaction-history response did not contain transfers.",
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
                "Alchemy transaction-history request timed out or was aborted.",
            };
          }

          return {
            ok:
              false,
            code:
              "UPSTREAM_ERROR",
            error:
              "Alchemy transaction-history request failed.",
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

            parsedCursor.cursor
              ?.outgoing
          ),

          requestDirection(
            "incoming",

            parsedCursor.cursor
              ?.incoming
          ),
        ]);

      const latencyMs =
        elapsedMs(
          startedAt
        );

      if (!outgoing.ok) {
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

      if (!incoming.ok) {
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

      const normalized =
        [
          ...outgoing
            .transfers,
          ...incoming
            .transfers,
        ]
          .map(
            normalizeTransfer
          )
          .filter(
            (
              transaction
            ): transaction is EvmTransaction =>
              transaction !==
              null
          );

      const unique =
        new Map<
          string,
          EvmTransaction
        >();

      for (
        const transaction
        of normalized
      ) {
        if (
          !unique.has(
            transaction.hash
          )
        ) {
          unique.set(
            transaction.hash,
            transaction
          );
        }
      }

      const transactions =
        [
          ...unique.values(),
        ].sort(
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
            )
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

export const alchemyTransactionsProvider =
  new AlchemyTransactionsProvider();
