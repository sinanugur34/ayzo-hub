import type {
  ProviderCapability,
} from "@/lib/providers/types";

import type {
  EvmAddressRequest,
  EvmContractCallProvider,
  EvmContractCallRequest,
  EvmContractCodeProvider,
  EvmContractDeploymentProvider,
  EvmTransactionReceiptProvider,
  EvmTransactionReceiptRequest,
} from "../provider";

import type {
  EvmContractCall,
  EvmContractCode,
  EvmContractDeploymentLookup,
  EvmNetworkContext,
  EvmProviderErrorCode,
  EvmProviderFailure,
  EvmProviderResult,
  EvmTransactionReceipt,
} from "../types";

import {
  findFirstContractCodeBlock,
  hasEvmRuntimeCode,
  parseEvmHexQuantity,
  toEvmBlockTag,
} from "../contractDeployment";

import {
  getAlchemyEvmNetwork,
} from "./alchemyNetworks";

const ALCHEMY_CAPABILITIES = [
  "contractCode",
  "contractCall",
  "contractDeployment",
  "transactionReceipt",
  "rpc",
] as const satisfies readonly ProviderCapability[];

const REQUEST_TIMEOUT_MS = 8_000;

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

function parseRpcAddress(
  value: unknown
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim().toLowerCase();

  return EVM_ADDRESS.test(
    normalized
  )
    ? normalized
    : null;
}

function parseRpcHash(
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

function blockTimestampToIso(
  value: unknown
): string | null {
  const seconds =
    parseEvmHexQuantity(value);

  if (seconds === null) {
    return null;
  }

  const milliseconds =
    seconds * 1000;

  if (
    !Number.isSafeInteger(
      milliseconds
    )
  ) {
    return null;
  }

  const date =
    new Date(milliseconds);

  return Number.isFinite(
    date.getTime()
  )
    ? date.toISOString()
    : null;
}

class DeploymentProbeFailure
  extends Error {
  constructor(
    readonly failure:
      EvmProviderFailure
  ) {
    super(
      "Historical contract-code probe failed."
    );
  }
}

type JsonRpcError = {
  code?: number;
  message?: string;
};

type JsonRpcResponse = {
  result?: unknown;
  error?: JsonRpcError;
};

type RpcRequest = {
  network: EvmNetworkContext;
  method: string;
  params: readonly unknown[];
  signal?: AbortSignal;
};

function elapsedMs(startedAt: number) {
  return Math.max(
    0,
    Math.round(
      performance.now() - startedAt
    )
  );
}

function classifyRpcError(
  message: string
): EvmProviderErrorCode {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes("rate limit") ||
    normalized.includes(
      "too many requests"
    ) ||
    normalized.includes(
      "compute units"
    )
  ) {
    return "RATE_LIMITED";
  }

  if (
    normalized.includes("execution reverted") ||
    normalized.includes("reverted") ||
    normalized.includes("revert")
  ) {
    return "CALL_REVERTED";
  }

  return "UPSTREAM_ERROR";
}

export class AlchemyEvmProvider
  implements
    EvmContractCodeProvider,
    EvmContractCallProvider,
    EvmContractDeploymentProvider,
    EvmTransactionReceiptProvider
{
  readonly id = "alchemy" as const;

  readonly capabilities =
    ALCHEMY_CAPABILITIES;

  supportsNetwork(
    network: EvmNetworkContext
  ): boolean {
    const config =
      getAlchemyEvmNetwork(
        network.networkId
      );

    return (
      config !== null &&
      config.chainId === network.chainId
    );
  }

  supportsCapability(
    capability: ProviderCapability
  ): boolean {
    return (
      this.capabilities as readonly ProviderCapability[]
    ).includes(capability);
  }

  private async rpcRequest({
    network,
    method,
    params,
    signal,
  }: RpcRequest): Promise<
    EvmProviderResult<unknown>
  > {
    const config =
      getAlchemyEvmNetwork(
        network.networkId
      );

    if (
      !config ||
      config.chainId !== network.chainId
    ) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code: "UNSUPPORTED_NETWORK",
        error:
          `Alchemy is not enabled for ${network.name}.`,
      };
    }

    const apiKey =
      process.env.ALCHEMY_API_KEY?.trim();

    if (!apiKey) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: null,
        code: "UPSTREAM_ERROR",
        error:
          "ALCHEMY_API_KEY is not configured.",
      };
    }

    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
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
      const response = await fetch(
        `https://${config.httpHost}/v2`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${apiKey}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method,
            params,
          }),
          cache: "no-store",
          signal: controller.signal,
        }
      );

      const latencyMs =
        elapsedMs(startedAt);

      if (response.status === 429) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code: "RATE_LIMITED",
          error:
            "Alchemy rate limit reached.",
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code: "UPSTREAM_ERROR",
          error:
            `Alchemy RPC returned HTTP ${response.status}.`,
        };
      }

      const payload =
        (await response.json()) as JsonRpcResponse;

      if (payload.error) {
        const message =
          typeof payload.error.message ===
          "string"
            ? payload.error.message
            : "Alchemy RPC error.";

        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code:
            classifyRpcError(message),
          error: message,
        };
      }

      if (
        !Object.prototype.hasOwnProperty.call(
          payload,
          "result"
        )
      ) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code: "UPSTREAM_ERROR",
          error:
            "Alchemy RPC response did not contain a result.",
        };
      }

      return {
        ok: true,
        providerId: this.id,
        latencyMs,
        data: payload.result,
      };
    } catch {
      const latencyMs =
        elapsedMs(startedAt);

      if (controller.signal.aborted) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code: "TIMEOUT",
          error:
            "Alchemy RPC request timed out or was aborted.",
        };
      }

      return {
        ok: false,
        providerId: this.id,
        latencyMs,
        code: "UPSTREAM_ERROR",
        error:
          "Alchemy RPC request failed.",
      };
    } finally {
      clearTimeout(timeout);

      signal?.removeEventListener(
        "abort",
        abortFromCaller
      );
    }
  }

  async getContractCode(
    request: EvmAddressRequest
  ): Promise<
    EvmProviderResult<EvmContractCode>
  > {
    const result =
      await this.rpcRequest({
        network: request.network,
        method: "eth_getCode",
        params: [
          request.address,
          "latest",
        ],
        signal: request.signal,
      });

    if (!result.ok) {
      return result;
    }

    if (
      typeof result.data !== "string"
    ) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: result.latencyMs,
        code: "UPSTREAM_ERROR",
        error:
          "Alchemy returned an invalid eth_getCode result.",
      };
    }

    const code =
      result.data.trim();

    const normalized =
      code.toLowerCase();

    const isContract =
      normalized.length > 2 &&
      normalized !== "0x0";

    return {
      ok: true,
      providerId: this.id,
      latencyMs: result.latencyMs,
      data: {
        address: request.address,
        code,
        isContract,
      },
    };
  }

  async callContract(
    request: EvmContractCallRequest
  ): Promise<
    EvmProviderResult<EvmContractCall>
  > {
    const blockTag =
      request.blockTag ?? "latest";

    const result =
      await this.rpcRequest({
        network: request.network,
        method: "eth_call",
        params: [
          {
            to: request.address,
            data: request.data,
          },
          blockTag,
        ],
        signal: request.signal,
      });

    if (!result.ok) {
      return result;
    }

    if (
      typeof result.data !== "string"
    ) {
      return {
        ok: false,
        providerId: this.id,
        latencyMs: result.latencyMs,
        code: "UPSTREAM_ERROR",
        error:
          "Alchemy returned an invalid eth_call result.",
      };
    }

    return {
      ok: true,
      providerId: this.id,
      latencyMs: result.latencyMs,
      data: {
        address: request.address,
        data: request.data,
        blockTag,
        result: result.data,
      },
    };
  }

  async getTransactionReceipt(
    request:
      EvmTransactionReceiptRequest
  ): Promise<
    EvmProviderResult<
      EvmTransactionReceipt
    >
  > {
    const transactionHash =
      request.transactionHash
        .trim()
        .toLowerCase();

    if (
      !TX_HASH.test(
        transactionHash
      )
    ) {
      return {
        ok: false,
        providerId:
          this.id,
        latencyMs:
          null,
        code:
          "INVALID_TRANSACTION_HASH",
        error:
          "Invalid EVM transaction hash.",
      };
    }

    const result =
      await this.rpcRequest({
        network:
          request.network,

        method:
          "eth_getTransactionReceipt",

        params: [
          transactionHash,
        ],

        signal:
          request.signal,
      });

    if (!result.ok) {
      return result;
    }

    const receipt =
      asObject(
        result.data
      );

    if (!receipt) {
      return {
        ok: false,
        providerId:
          this.id,
        latencyMs:
          result.latencyMs,
        code:
          "UPSTREAM_ERROR",
        error:
          "Alchemy returned an invalid transaction receipt.",
      };
    }

    const hash =
      parseRpcHash(
        receipt.transactionHash
      );

    const blockNumber =
      parseEvmHexQuantity(
        receipt.blockNumber
      );

    const from =
      parseRpcAddress(
        receipt.from
      );

    const to =
      receipt.to === null
        ? null
        : parseRpcAddress(
            receipt.to
          );

    const contractAddress =
      receipt.contractAddress ===
        null
        ? null
        : parseRpcAddress(
            receipt.contractAddress
          );

    if (
      !hash ||
      blockNumber === null ||
      !from ||
      (
        receipt.to !== null &&
        to === null
      ) ||
      (
        receipt.contractAddress !==
          null &&
        contractAddress === null
      )
    ) {
      return {
        ok: false,
        providerId:
          this.id,
        latencyMs:
          result.latencyMs,
        code:
          "UPSTREAM_ERROR",
        error:
          "Alchemy returned malformed transaction receipt fields.",
      };
    }

    const status =
      parseEvmHexQuantity(
        receipt.status
      );

    const success =
      status === 1
        ? true
        : status === 0
          ? false
          : null;

    return {
      ok: true,
      providerId:
        this.id,
      latencyMs:
        result.latencyMs,

      data: {
        transactionHash:
          hash,

        blockNumber,

        from,

        to,

        contractAddress,

        success,
      },
    };
  }

  async getContractDeployment(
    request: EvmAddressRequest
  ): Promise<
    EvmProviderResult<
      EvmContractDeploymentLookup
    >
  > {
    const normalizedAddress =
      request.address
        .trim()
        .toLowerCase();

    if (
      !EVM_ADDRESS.test(
        normalizedAddress
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

    const codeResult =
      await this.getContractCode({
        ...request,
        address:
          normalizedAddress,
      });

    if (!codeResult.ok) {
      return codeResult;
    }

    const baseCoverage = {
      historicalCodeSearch:
        true,
      topLevelCreateReceipts:
        true,
      internalCreate:
        false,
      create2:
        false,
    } as const;

    if (
      !codeResult.data.isContract
    ) {
      return {
        ok: true,
        providerId:
          this.id,
        latencyMs:
          codeResult.latencyMs,
        data: {
          contractAddress:
            normalizedAddress,
          isContract: false,
          firstObservedCodeBlock:
            null,
          deployment:
            null,
          coverage: {
            ...baseCoverage,
            limitation:
              "Address has no runtime contract code at latest block.",
          },
        },
      };
    }

    const startedAt =
      performance.now();

    const latestBlockResult =
      await this.rpcRequest({
        network:
          request.network,
        method:
          "eth_blockNumber",
        params: [],
        signal:
          request.signal,
      });

    if (!latestBlockResult.ok) {
      return latestBlockResult;
    }

    const latestBlock =
      parseEvmHexQuantity(
        latestBlockResult.data
      );

    if (latestBlock === null) {
      return {
        ok: false,
        providerId:
          this.id,
        latencyMs:
          elapsedMs(startedAt),
        code:
          "UPSTREAM_ERROR",
        error:
          "Alchemy returned an invalid eth_blockNumber result.",
      };
    }

    let firstObservedCodeBlock:
      number | null = null;

    try {
      firstObservedCodeBlock =
        await findFirstContractCodeBlock(
          latestBlock,
          async blockNumber => {
            const result =
              await this.rpcRequest({
                network:
                  request.network,
                method:
                  "eth_getCode",
                params: [
                  normalizedAddress,
                  toEvmBlockTag(
                    blockNumber
                  ),
                ],
                signal:
                  request.signal,
              });

            if (!result.ok) {
              throw new DeploymentProbeFailure(
                result
              );
            }

            return hasEvmRuntimeCode(
              result.data
            );
          }
        );
    } catch (error) {
      if (
        error instanceof
          DeploymentProbeFailure
      ) {
        return error.failure;
      }

      return {
        ok: false,
        providerId:
          this.id,
        latencyMs:
          elapsedMs(startedAt),
        code:
          "UPSTREAM_ERROR",
        error:
          "Historical contract-code search failed.",
      };
    }

    if (
      firstObservedCodeBlock ===
        null
    ) {
      return {
        ok: false,
        providerId:
          this.id,
        latencyMs:
          elapsedMs(startedAt),
        code:
          "UPSTREAM_ERROR",
        error:
          "Contract code exists at latest block but no historical code block was found.",
      };
    }

    const blockResult =
      await this.rpcRequest({
        network:
          request.network,
        method:
          "eth_getBlockByNumber",
        params: [
          toEvmBlockTag(
            firstObservedCodeBlock
          ),
          true,
        ],
        signal:
          request.signal,
      });

    if (!blockResult.ok) {
      return blockResult;
    }

    const block =
      asObject(
        blockResult.data
      );

    if (
      !block ||
      !Array.isArray(
        block.transactions
      )
    ) {
      return {
        ok: false,
        providerId:
          this.id,
        latencyMs:
          elapsedMs(startedAt),
        code:
          "UPSTREAM_ERROR",
        error:
          "Alchemy returned an invalid deployment block.",
      };
    }

    const timestamp =
      blockTimestampToIso(
        block.timestamp
      );

    for (
      const transactionValue of
        block.transactions
    ) {
      const transaction =
        asObject(
          transactionValue
        );

      if (
        !transaction ||
        transaction.to !== null
      ) {
        continue;
      }

      const hash =
        parseRpcHash(
          transaction.hash
        );

      const deployerAddress =
        parseRpcAddress(
          transaction.from
        );

      if (
        !hash ||
        !deployerAddress
      ) {
        continue;
      }

      const receiptResult =
        await this.rpcRequest({
          network:
            request.network,
          method:
            "eth_getTransactionReceipt",
          params: [
            hash,
          ],
          signal:
            request.signal,
        });

      if (!receiptResult.ok) {
        return receiptResult;
      }

      const receipt =
        asObject(
          receiptResult.data
        );

      const contractAddress =
        parseRpcAddress(
          receipt
            ?.contractAddress
        );

      if (
        contractAddress !==
          normalizedAddress
      ) {
        continue;
      }

      return {
        ok: true,
        providerId:
          this.id,
        latencyMs:
          elapsedMs(startedAt),
        data: {
          contractAddress:
            normalizedAddress,
          isContract:
            true,

          firstObservedCodeBlock,

          deployment: {
            contractAddress:
              normalizedAddress,

            deployerAddress,

            transactionHash:
              hash,

            blockNumber:
              firstObservedCodeBlock,

            timestamp,

            creationKind:
              "top_level_create",

            evidenceKind:
              "transaction_receipt",
          },

          coverage: {
            ...baseCoverage,

            limitation:
              "Top-level CREATE deployment evidence is covered. Internal CREATE and CREATE2 deployments require trace evidence and are not yet included.",
          },
        },
      };
    }

    return {
      ok: true,
      providerId:
        this.id,
      latencyMs:
        elapsedMs(startedAt),

      data: {
        contractAddress:
          normalizedAddress,

        isContract:
          true,

        firstObservedCodeBlock,

        deployment:
          null,

        coverage: {
          ...baseCoverage,

          limitation:
            "Runtime code was located historically, but no matching top-level creation receipt was found. Internal CREATE/CREATE2 deployment evidence is not yet covered.",
        },
      },
    };

}
}


export const alchemyEvmProvider =
  new AlchemyEvmProvider();
