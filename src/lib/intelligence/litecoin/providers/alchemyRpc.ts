import { providerUsageFetch } from "@/lib/providerUsageHttpCore";
import type {
  ProviderCapability,
} from "@/lib/providers/types";

import type {
  LitecoinTransactionEvidenceProvider,
  LitecoinTransactionRequest,
} from "../provider";

import type {
  LitecoinProviderErrorCode,
  LitecoinProviderResult,
  LitecoinTransactionEvidence,
  LitecoinTransactionInput,
  LitecoinTransactionOutput,
} from "../types";

const CAPABILITIES = [
  "rpc",
] as const satisfies readonly ProviderCapability[];

const REQUEST_TIMEOUT_MS =
  8_000;

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
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
    ? value as JsonObject
    : null;
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

function decimalLitecoinToLitoshi(
  value: unknown
): string | null {
  if (
    typeof value !== "number" &&
    typeof value !== "string"
  ) {
    return null;
  }

  const text =
    String(value).trim();

  const match =
    /^(\d+)(?:\.(\d{0,8}))?$/.exec(
      text
    );

  if (!match) {
    return null;
  }

  const whole =
    match[1];

  if (!whole) {
    return null;
  }

  const fraction =
    (
      match[2] ?? ""
    ).padEnd(
      8,
      "0"
    );

  try {
    return (
      BigInt(whole) *
        100_000_000n +
      BigInt(
        fraction || "0"
      )
    ).toString();
  } catch {
    return null;
  }
}

function parseTimestamp(
  value: unknown
): string | null {
  const seconds =
    parseInteger(value);

  if (seconds === null) {
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

function classifyRpcError(
  message: string
): LitecoinProviderErrorCode {
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

function parseOutput(
  value: unknown
): LitecoinTransactionOutput | null {
  const output =
    asObject(value);

  if (!output) {
    return null;
  }

  const index =
    parseInteger(
      output.n
    );

  const valueLitoshi =
    decimalLitecoinToLitoshi(
      output.value
    );

  const script =
    asObject(
      output.scriptPubKey
    );

  const scriptHex =
    typeof script?.hex ===
      "string" &&
    /^[0-9a-fA-F]*$/.test(
      script.hex
    )
      ? script.hex.toLowerCase()
      : null;

  const addresses:
    string[] = [];

  if (
    typeof script?.address ===
      "string" &&
    script.address.trim()
  ) {
    addresses.push(
      script.address.trim()
    );
  }

  if (
    Array.isArray(
      script?.addresses
    )
  ) {
    for (
      const address of
        script.addresses
    ) {
      if (
        typeof address ===
          "string" &&
        address.trim()
      ) {
        addresses.push(
          address.trim()
        );
      }
    }
  }

  if (
    index === null ||
    valueLitoshi === null
  ) {
    return null;
  }

  return {
    index,
    valueLitoshi,
    scriptHex,
    addresses:
      [...new Set(addresses)],
  };
}

export class AlchemyLitecoinRpcProvider
  implements
    LitecoinTransactionEvidenceProvider
{
  readonly id =
    "alchemy" as const;

  readonly capabilities =
    CAPABILITIES;

  supportsNetwork(
    network:
      LitecoinTransactionRequest[
        "network"
      ]
  ): boolean {
    return (
      network.networkId ===
        "litecoin" &&
      network.nativeCurrency ===
        "LTC"
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

  async getTransactionEvidence(
    request:
      LitecoinTransactionRequest
  ): Promise<
    LitecoinProviderResult<
      LitecoinTransactionEvidence
    >
  > {
    if (
      !this.supportsNetwork(
        request.network
      )
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
          "Alchemy Litecoin RPC is not enabled for this network.",
      };
    }

    const requestedHash =
      parseHash(
        request.transactionHash
      );

    if (!requestedHash) {
      return {
        ok: false,
        providerId:
          this.id,
        latencyMs:
          null,
        code:
          "INVALID_TRANSACTION_HASH",
        error:
          "Invalid Litecoin transaction hash.",
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
        await providerUsageFetch({ provider: "alchemy", operation: "litecoin.getrawtransaction" }, `https://litecoin-mainnet.g.alchemy.com/v2/${encodeURIComponent(apiKey)}`, () => fetch(
          `https://litecoin-mainnet.g.alchemy.com/v2/${encodeURIComponent(apiKey)}`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                jsonrpc:
                  "2.0",

                id:
                  1,

                method:
                  "getrawtransaction",

                params: [
                  requestedHash,
                  true,
                ],
              }),

            cache:
              "no-store",

            signal:
              controller.signal,
          }
        ));

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
          providerId:
            this.id,
          latencyMs,
          code:
            "RATE_LIMITED",
          error:
            "Alchemy Litecoin RPC rate limit reached.",
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          providerId:
            this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            `Alchemy Litecoin RPC returned HTTP ${response.status}.`,
        };
      }

      if (payload?.error) {
        const message =
          typeof payload
            .error.message ===
            "string"
            ? payload
                .error.message
            : "Alchemy Litecoin RPC error.";

        return {
          ok: false,
          providerId:
            this.id,
          latencyMs,
          code:
            classifyRpcError(
              message
            ),
          error:
            message,
        };
      }

      const transaction =
        asObject(
          payload?.result
        );

      if (!transaction) {
        return {
          ok: false,
          providerId:
            this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            "Alchemy Litecoin transaction result was not an object.",
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
          providerId:
            this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            "Alchemy Litecoin transaction txid did not match the requested hash.",
        };
      }

      if (
        !Array.isArray(
          transaction.vin
        ) ||
        !Array.isArray(
          transaction.vout
        )
      ) {
        return {
          ok: false,
          providerId:
            this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            "Alchemy Litecoin transaction did not contain vin/vout arrays.",
        };
      }

      const inputs:
        LitecoinTransactionInput[] =
          [];

      for (
        const candidate of
          transaction.vin
      ) {
        const input =
          asObject(candidate);

        if (!input) {
          return {
            ok: false,
            providerId:
              this.id,
            latencyMs,
            code:
              "UPSTREAM_ERROR",
            error:
              "Alchemy Litecoin transaction contained an invalid input.",
          };
        }

        if (
          typeof input.coinbase ===
            "string"
        ) {
          inputs.push({
            previousTransactionHash:
              null,
            previousOutputIndex:
              null,
            valueLitoshi:
              null,
            addresses:
              [],
            coinbase:
              true,
          });

          continue;
        }

        const previousHash =
          parseHash(
            input.txid
          );

        const previousIndex =
          parseInteger(
            input.vout
          );

        if (
          !previousHash ||
          previousIndex ===
            null
        ) {
          return {
            ok: false,
            providerId:
              this.id,
            latencyMs,
            code:
              "UPSTREAM_ERROR",
            error:
              "Alchemy Litecoin transaction contained an invalid non-coinbase input.",
          };
        }

        inputs.push({
          previousTransactionHash:
            previousHash,
          previousOutputIndex:
            previousIndex,
          valueLitoshi:
            null,
          addresses:
            [],
          coinbase:
            false,
        });
      }

      const outputs =
        transaction.vout.map(
          parseOutput
        );

      if (
        outputs.some(
          output =>
            output === null
        )
      ) {
        return {
          ok: false,
          providerId:
            this.id,
          latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            "Alchemy Litecoin transaction contained an invalid output.",
        };
      }

      const parsedOutputs =
        outputs as
          LitecoinTransactionOutput[];

      const outputTotal =
        parsedOutputs.reduce(
          (
            total,
            output
          ) =>
            total +
            BigInt(
              output.valueLitoshi
            ),
          0n
        );

      const blockHash =
        parseHash(
          transaction.blockhash
        );

      const confirmations =
        parseInteger(
          transaction.confirmations
        );

      return {
        ok: true,
        providerId:
          this.id,
        latencyMs,
        data: {
          transactionHash,
          blockHash,
          blockHeight:
            null,
          confirmed:
            blockHash !== null &&
            confirmations !==
              null &&
            confirmations > 0,
          confirmations,
          timestamp:
            parseTimestamp(
              transaction.blocktime ??
              transaction.time
            ),
          valueLitoshi:
            outputTotal
              .toString(),
          valueInLitoshi:
            null,
          feesLitoshi:
            null,
          inputs,
          outputs:
            parsedOutputs,
        },
      };
    } catch {
      const latencyMs =
        elapsedMs(
          startedAt
        );

      return {
        ok: false,
        providerId:
          this.id,
        latencyMs,
        code:
          controller.signal
            .aborted
            ? "TIMEOUT"
            : "UPSTREAM_ERROR",
        error:
          controller.signal
            .aborted
            ? "Alchemy Litecoin RPC request timed out or was aborted."
            : "Alchemy Litecoin RPC request failed.",
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

export const alchemyLitecoinRpcProvider =
  new AlchemyLitecoinRpcProvider();
