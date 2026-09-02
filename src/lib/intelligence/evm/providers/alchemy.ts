import type {
  ProviderCapability,
} from "@/lib/providers/types";

import type {
  EvmAddressRequest,
  EvmContractCallProvider,
  EvmContractCallRequest,
  EvmContractCodeProvider,
} from "../provider";

import type {
  EvmContractCall,
  EvmContractCode,
  EvmNetworkContext,
  EvmProviderErrorCode,
  EvmProviderResult,
} from "../types";

import {
  getAlchemyEvmNetwork,
} from "./alchemyNetworks";

const ALCHEMY_CAPABILITIES = [
  "contractCode",
  "contractCall",
  "rpc",
] as const satisfies readonly ProviderCapability[];

const REQUEST_TIMEOUT_MS = 8_000;

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
    EvmContractCallProvider
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
}

export const alchemyEvmProvider =
  new AlchemyEvmProvider();
