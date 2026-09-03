import type {
  ProviderCapability,
} from "@/lib/providers/types";

import type {
  BitcoinTransactionEvidenceProvider,
  BitcoinTransactionRequest,
} from "../provider";

import type {
  BitcoinPrevoutEvidence,
  BitcoinProviderErrorCode,
  BitcoinProviderResult,
  BitcoinTransactionEvidence,
  BitcoinTransactionInput,
  BitcoinTransactionOutput,
} from "../types";

const ALCHEMY_CAPABILITIES = [
  "rpc",
] as const satisfies readonly ProviderCapability[];

const REQUEST_TIMEOUT_MS =
  8_000;

const MAX_PREVOUT_LOOKUPS =
  8;

const TX_HASH =
  /^[0-9a-fA-F]{64}$/;

type JsonObject =
  Record<string, unknown>;

type JsonRpcResponse = {
  result?: unknown;

  error?: {
    code?: number;
    message?: string;
  };
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
) {
  return Math.max(
    0,
    Math.round(
      performance.now() -
        startedAt
    )
  );
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
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  ) {
    return value;
  }

  return null;
}

function bitcoinValueToSats(
  value: unknown
): string | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return null;
  }

  const sats =
    Math.round(
      value * 100_000_000
    );

  if (
    !Number.isSafeInteger(sats) ||
    sats < 0
  ) {
    return null;
  }

  return String(sats);
}

function scriptHex(
  value: unknown
): string | null {
  const script =
    asObject(value);

  if (!script) {
    return null;
  }

  const hex =
    script.hex;

  if (
    typeof hex !== "string" ||
    !/^[0-9a-fA-F]*$/.test(
      hex
    )
  ) {
    return null;
  }

  return hex.toLowerCase();
}

function classifyRpcError(
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
      "compute units"
    )
  ) {
    return "RATE_LIMITED";
  }

  return "UPSTREAM_ERROR";
}

type RpcRequest = {
  method: string;
  params: readonly unknown[];
  signal?: AbortSignal;
};

type ParsedRootInput = {
  previousTransactionHash:
    string | null;
  previousOutputIndex:
    number | null;
  coinbase: boolean;
};

function parseRootInput(
  value: unknown
): ParsedRootInput | null {
  const input =
    asObject(value);

  if (!input) {
    return null;
  }

  if (
    typeof input.coinbase ===
      "string"
  ) {
    return {
      previousTransactionHash:
        null,

      previousOutputIndex:
        null,

      coinbase:
        true,
    };
  }

  const previousTransactionHash =
    parseHash(
      input.txid
    );

  const previousOutputIndex =
    parseNonNegativeInteger(
      input.vout
    );

  if (
    !previousTransactionHash ||
    previousOutputIndex === null
  ) {
    return null;
  }

  return {
    previousTransactionHash,
    previousOutputIndex,
    coinbase:
      false,
  };
}

function parseOutput(
  value: unknown
): BitcoinTransactionOutput | null {
  const output =
    asObject(value);

  if (!output) {
    return null;
  }

  const index =
    parseNonNegativeInteger(
      output.n
    );

  const valueSats =
    bitcoinValueToSats(
      output.value
    );

  const scriptPubKey =
    scriptHex(
      output.scriptPubKey
    );

  if (
    index === null ||
    valueSats === null ||
    scriptPubKey === null
  ) {
    return null;
  }

  return {
    index,
    valueSats,
    scriptPubKey,
  };
}

function prevoutAt(
  payload: unknown,
  index: number
): BitcoinPrevoutEvidence | null {
  const transaction =
    asObject(payload);

  if (!transaction) {
    return null;
  }

  const outputs =
    transaction.vout;

  if (!Array.isArray(outputs)) {
    return null;
  }

  const match =
    outputs.find(
      (candidate) => {
        const output =
          asObject(candidate);

        return (
          output !== null &&
          parseNonNegativeInteger(
            output.n
          ) === index
        );
      }
    );

  const output =
    asObject(match);

  if (!output) {
    return null;
  }

  const valueSats =
    bitcoinValueToSats(
      output.value
    );

  const scriptPubKey =
    scriptHex(
      output.scriptPubKey
    );

  if (
    valueSats === null ||
    scriptPubKey === null
  ) {
    return null;
  }

  return {
    valueSats,
    scriptPubKey,
  };
}

export class AlchemyBitcoinProvider
  implements
    BitcoinTransactionEvidenceProvider
{
  readonly id =
    "alchemy" as const;

  readonly capabilities =
    ALCHEMY_CAPABILITIES;

  supportsNetwork(
    network:
      BitcoinTransactionRequest[
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

  private async rpcRequest({
    method,
    params,
    signal,
  }: RpcRequest): Promise<
    BitcoinProviderResult<unknown>
  > {
    const apiKey =
      process.env
        .ALCHEMY_API_KEY
        ?.trim();

    if (!apiKey) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
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

    const abortFromCaller = () =>
      controller.abort();

    if (signal) {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener(
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
          "https://bitcoin-mainnet.g.alchemy.com/v2",
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
                  1,

                method,
                params,
              }),

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
        JsonRpcResponse | null =
          null;

      try {
        payload =
          await response
            .json() as
              JsonRpcResponse;
      } catch {
        // Validated below.
      }

      if (
        response.status ===
          429
      ) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code:
            "RATE_LIMITED",
          error:
            "Alchemy Bitcoin RPC rate limit reached.",
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            `Alchemy Bitcoin RPC returned HTTP ${response.status}.`,
        };
      }

      if (payload?.error) {
        const message =
          typeof payload
            .error.message ===
            "string"
            ? payload
                .error.message
            : "Alchemy Bitcoin RPC error.";

        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code:
            classifyRpcError(
              message
            ),
          error:
            message,
        };
      }

      if (
        !payload ||
        !Object.prototype
          .hasOwnProperty.call(
            payload,
            "result"
          )
      ) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            "Alchemy Bitcoin RPC response did not contain a result.",
        };
      }

      return {
        ok: true,
        providerId: this.id,
        latencyMs,
        data:
          payload.result,
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
            "Alchemy Bitcoin RPC request timed out or was aborted.",
        };
      }

      return {
        ok: false,
        providerId: this.id,
        latencyMs,
        code:
          "UPSTREAM_ERROR",
        error:
          "Alchemy Bitcoin RPC request failed.",
      };
    } finally {
      clearTimeout(
        timeout
      );

      signal
        ?.removeEventListener(
          "abort",
          abortFromCaller
        );
    }
  }

  async getTransactionEvidence(
    request:
      BitcoinTransactionRequest
  ): Promise<
    BitcoinProviderResult<
      BitcoinTransactionEvidence
    >
  > {
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
          "Alchemy Bitcoin RPC is not enabled for this network.",
      };
    }

    const requestedHash =
      parseHash(
        request.transactionHash
      );

    if (!requestedHash) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code:
          "INVALID_TRANSACTION_HASH",
        error:
          "Invalid Bitcoin transaction hash.",
      };
    }

    const rootResult =
      await this.rpcRequest({
        method:
          "getrawtransaction",

        params: [
          requestedHash,
          true,
        ],

        signal:
          request.signal,
      });

    if (!rootResult.ok) {
      return rootResult;
    }

    const transaction =
      asObject(
        rootResult.data
      );

    if (!transaction) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs:
          rootResult.latencyMs,
        code:
          "UPSTREAM_ERROR",
        error:
          "Alchemy Bitcoin transaction result was not an object.",
      };
    }

    const transactionHash =
      parseHash(
        transaction.txid
      );

    if (
      !transactionHash ||
      transactionHash !==
        requestedHash
    ) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs:
          rootResult.latencyMs,
        code:
          "UPSTREAM_ERROR",
        error:
          "Alchemy Bitcoin transaction txid did not match the requested hash after normalization.",
      };
    }

    const witnessHash =
      parseHash(
        transaction.hash
      );

    const blockHash =
      parseHash(
        transaction.blockhash
      );

    const confirmations =
      parseNonNegativeInteger(
        transaction.confirmations
      );

    const rawInputs =
      transaction.vin;

    const rawOutputs =
      transaction.vout;

    if (
      !Array.isArray(
        rawInputs
      ) ||
      !Array.isArray(
        rawOutputs
      )
    ) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs:
          rootResult.latencyMs,
        code:
          "UPSTREAM_ERROR",
        error:
          "Alchemy Bitcoin transaction did not contain vin/vout arrays.",
      };
    }

    const parsedInputs =
      rawInputs.map(
        parseRootInput
      );

    if (
      parsedInputs.some(
        (input) =>
          input === null
      )
    ) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs:
          rootResult.latencyMs,
        code:
          "UPSTREAM_ERROR",
        error:
          "Alchemy Bitcoin transaction contained an invalid input.",
      };
    }

    const outputs =
      rawOutputs.map(
        parseOutput
      );

    if (
      outputs.some(
        (output) =>
          output === null
      )
    ) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs:
          rootResult.latencyMs,
        code:
          "UPSTREAM_ERROR",
        error:
          "Alchemy Bitcoin transaction contained an invalid output.",
      };
    }

    const eligibleIndexes =
      parsedInputs
        .map(
          (input, index) => ({
            input,
            index,
          })
        )
        .filter(
          (
            item
          ): item is {
            input:
              NonNullable<
                (typeof parsedInputs)[number]
              >;
            index: number;
          } =>
            item.input !==
              null &&
            !item.input
              .coinbase
        );

    const attemptedIndexes =
      eligibleIndexes.slice(
        0,
        MAX_PREVOUT_LOOKUPS
      );

    const attemptedSet =
      new Set(
        attemptedIndexes.map(
          (item) =>
            item.index
        )
      );

    const resolvedPrevouts =
      new Map<
        number,
        BitcoinPrevoutEvidence | null
      >();

    await Promise.all(
      attemptedIndexes.map(
        async ({
          input,
          index,
        }) => {
          const hash =
            input
              .previousTransactionHash;

          const outputIndex =
            input
              .previousOutputIndex;

          if (
            !hash ||
            outputIndex === null
          ) {
            resolvedPrevouts.set(
              index,
              null
            );

            return;
          }

          const previousResult =
            await this.rpcRequest({
              method:
                "getrawtransaction",

              params: [
                hash,
                true,
              ],

              signal:
                request.signal,
            });

          if (
            !previousResult.ok
          ) {
            resolvedPrevouts.set(
              index,
              null
            );

            return;
          }

          resolvedPrevouts.set(
            index,
            prevoutAt(
              previousResult.data,
              outputIndex
            )
          );
        }
      )
    );

    const inputs:
      BitcoinTransactionInput[] =
        parsedInputs.map(
          (
            parsedInput,
            index
          ) => {
            if (!parsedInput) {
              throw new Error(
                "Unreachable invalid Bitcoin input."
              );
            }

            if (
              parsedInput.coinbase
            ) {
              return {
                previousTransactionHash:
                  null,

                previousOutputIndex:
                  null,

                prevout:
                  null,

                prevoutStatus:
                  "coinbase",
              };
            }

            if (
              !attemptedSet.has(
                index
              )
            ) {
              return {
                previousTransactionHash:
                  parsedInput
                    .previousTransactionHash,

                previousOutputIndex:
                  parsedInput
                    .previousOutputIndex,

                prevout:
                  null,

                prevoutStatus:
                  "omitted",
              };
            }

            const prevout =
              resolvedPrevouts.get(
                index
              ) ?? null;

            return {
              previousTransactionHash:
                parsedInput
                  .previousTransactionHash,

              previousOutputIndex:
                parsedInput
                  .previousOutputIndex,

              prevout,

              prevoutStatus:
                prevout
                  ? "resolved"
                  : "unavailable",
            };
          }
        );

    const resolved =
      inputs.filter(
        (input) =>
          input.prevoutStatus ===
            "resolved"
      ).length;

    const unavailable =
      inputs.filter(
        (input) =>
          input.prevoutStatus ===
            "unavailable"
      ).length;

    const omitted =
      inputs.filter(
        (input) =>
          input.prevoutStatus ===
            "omitted"
      ).length;

    return {
      ok: true,
      providerId: this.id,

      latencyMs:
        rootResult.latencyMs,

      data: {
        transactionHash,

        witnessHash,

        blockHash,

        confirmed:
          blockHash !== null &&
          confirmations !== null &&
          confirmations > 0,

        confirmations,

        inputs,

        outputs:
          outputs as
            BitcoinTransactionOutput[],

        prevoutCoverage: {
          eligible:
            eligibleIndexes.length,

          attempted:
            attemptedIndexes.length,

          resolved,

          unavailable,

          omitted,

          complete:
            unavailable === 0 &&
            omitted === 0,
        },
      },
    };
  }
}

export const alchemyBitcoinProvider =
  new AlchemyBitcoinProvider();
