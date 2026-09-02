import type {
  ProviderCapability,
} from "@/lib/providers/types";

import type {
  EvmAddressRequest,
  EvmContractCodeProvider,
} from "../provider";

import type {
  EvmContractCode,
  EvmProviderErrorCode,
  EvmProviderResult,
} from "../types";

import {
  getAlchemyEvmNetwork,
} from "./alchemyNetworks";

const ALCHEMY_CAPABILITIES = [
  "contractCode",
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

function elapsedMs(startedAt: number) {
  return Math.max(
    0,
    Math.round(performance.now() - startedAt)
  );
}

function classifyRpcError(
  message: string
): EvmProviderErrorCode {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many requests") ||
    normalized.includes("compute units")
  ) {
    return "RATE_LIMITED";
  }

  return "UPSTREAM_ERROR";
}

export class AlchemyEvmProvider
  implements EvmContractCodeProvider
{
  readonly id = "alchemy" as const;

  readonly capabilities =
    ALCHEMY_CAPABILITIES;

  supportsNetwork(
    requestNetwork: EvmAddressRequest["network"]
  ): boolean {
    const config =
      getAlchemyEvmNetwork(
        requestNetwork.networkId
      );

    return (
      config !== null &&
      config.chainId ===
        requestNetwork.chainId
    );
  }

  supportsCapability(
    capability: ProviderCapability
  ): boolean {
    return (
      this.capabilities as readonly ProviderCapability[]
    ).includes(capability);
  }

  async getContractCode(
    request: EvmAddressRequest
  ): Promise<
    EvmProviderResult<EvmContractCode>
  > {
    const config =
      getAlchemyEvmNetwork(
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
        code: "UNSUPPORTED_NETWORK",
        error:
          `Alchemy is not enabled for ${request.network.name}.`,
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

    if (request.signal) {
      if (request.signal.aborted) {
        controller.abort();
      } else {
        request.signal.addEventListener(
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
            Authorization: `Bearer ${apiKey}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_getCode",
            params: [
              request.address,
              "latest",
            ],
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
        typeof payload.result !==
        "string"
      ) {
        return {
          ok: false,
          providerId: this.id,
          latencyMs,
          code: "UPSTREAM_ERROR",
          error:
            "Alchemy returned an invalid eth_getCode response.",
        };
      }

      const code =
        payload.result.trim();

      const normalized =
        code.toLowerCase();

      const isContract =
        normalized.length > 2 &&
        normalized !== "0x0";

      return {
        ok: true,
        providerId: this.id,
        latencyMs,
        data: {
          address: request.address,
          code,
          isContract,
        },
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

      request.signal?.removeEventListener(
        "abort",
        abortFromCaller
      );
    }
  }
}

export const alchemyEvmProvider =
  new AlchemyEvmProvider();
