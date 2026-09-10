import type {
  ProviderCapability,
} from "@/lib/providers/types";

import type {
  TronTransactionEvidenceProvider,
  TronTransactionRequest,
} from "../provider";

import type {
  TronProviderErrorCode,
  TronProviderResult,
  TronTransactionContractEvidence,
  TronTransactionEvidence,
} from "../types";

const CAPABILITIES = [
  "rpc",
  "transactionReceipt",
] as const satisfies readonly ProviderCapability[];

const TRONGRID_MAINNET_BASE_URL =
  "https://api.trongrid.io";

const REQUEST_TIMEOUT_MS =
  8_000;

const TX_HASH =
  /^[0-9a-fA-F]{64}$/;

const TRON_HEX_ADDRESS =
  /^41[0-9a-fA-F]{40}$/;

type JsonObject =
  Record<string, unknown>;

type FetchResult =
  | {
      ok: true;
      data: unknown;
      latencyMs: number;
    }
  | {
      ok: false;
      code:
        TronProviderErrorCode;
      error: string;
      latencyMs: number;
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

  return normalized ||
    null;
}

function parseHexAddress(
  value: unknown
): string | null {
  if (
    typeof value !== "string" ||
    !TRON_HEX_ADDRESS.test(
      value.trim()
    )
  ) {
    return null;
  }

  return value
    .trim()
    .toLowerCase();
}

function parseHex(
  value: unknown
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  if (
    normalized.length % 2 !== 0 ||
    !/^[0-9a-fA-F]*$/.test(
      normalized
    )
  ) {
    return null;
  }

  return normalized.toLowerCase();
}

function parseNonNegativeInteger(
  value: unknown
): number | null {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  )
    ? value
    : null;
}

function parseExactUnsignedInteger(
  value: unknown
): string | null {
  if (
    typeof value === "number"
  ) {
    return (
      Number.isSafeInteger(value) &&
      value >= 0
    )
      ? String(value)
      : null;
  }

  if (
    typeof value === "string"
  ) {
    const normalized =
      value.trim();

    return /^\d+$/.test(
      normalized
    )
      ? normalized
      : null;
  }

  return null;
}

function parseTimestamp(
  value: unknown
): string | null {
  const milliseconds =
    parseNonNegativeInteger(
      value
    );

  if (milliseconds === null) {
    return null;
  }

  const date =
    new Date(
      milliseconds
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

function classifyStatus(
  status: number
): TronProviderErrorCode {
  return status === 429
    ? "RATE_LIMITED"
    : "UPSTREAM_ERROR";
}

function firstObject(
  value: unknown
): JsonObject | null {
  if (
    !Array.isArray(value)
  ) {
    return null;
  }

  for (
    const item of value
  ) {
    const object =
      asObject(item);

    if (object) {
      return object;
    }
  }

  return null;
}

function parseContract(
  rawData:
    JsonObject | null
): TronTransactionContractEvidence | null {
  const contract =
    firstObject(
      rawData?.contract
    );

  if (!contract) {
    return null;
  }

  const parameter =
    asObject(
      contract.parameter
    );

  const value =
    asObject(
      parameter?.value
    );

  return {
    type:
      parseString(
        contract.type
      ),

    ownerAddressHex:
      parseHexAddress(
        value?.owner_address
      ),

    toAddressHex:
      parseHexAddress(
        value?.to_address
      ),

    contractAddressHex:
      parseHexAddress(
        value?.contract_address
      ),

    amountSun:
      parseExactUnsignedInteger(
        value?.amount
      ),

    callValueSun:
      parseExactUnsignedInteger(
        value?.call_value
      ),

    dataHex:
      parseHex(
        value?.data
      ),
  };
}

function parseBodyResult(
  body:
    JsonObject
): string | null {
  const result =
    firstObject(
      body.ret
    );

  return parseString(
    result?.contractRet
  );
}

async function postNodeJson(
  {
    path,
    transactionHash,
    apiKey,
    signal,
  }: {
    path: string;
    transactionHash: string;
    apiKey: string;
    signal: AbortSignal;
  }
): Promise<FetchResult> {
  const startedAt =
    performance.now();

  try {
    const response =
      await fetch(
        `${TRONGRID_MAINNET_BASE_URL}${path}`,
        {
          method:
            "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",

            "User-Agent":
              "AYZO/1.0",

            "TRON-PRO-API-KEY":
              apiKey,
          },

          body:
            JSON.stringify({
              value:
                transactionHash,
            }),

          cache:
            "no-store",

          signal,
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

    if (!response.ok) {
      return {
        ok: false,
        latencyMs,
        code:
          classifyStatus(
            response.status
          ),
        error:
          response.status === 429
            ? "TronGrid rate limit reached."
            : "TronGrid canonical transaction request failed.",
      };
    }

    const object =
      asObject(
        payload
      );

    if (!object) {
      return {
        ok: false,
        latencyMs,
        code:
          "UPSTREAM_ERROR",
        error:
          "TronGrid returned an invalid canonical transaction response.",
      };
    }

    return {
      ok: true,
      latencyMs,
      data:
        object,
    };
  } catch {
    return {
      ok: false,
      latencyMs:
        elapsedMs(
          startedAt
        ),
      code:
        signal.aborted
          ? "TIMEOUT"
          : "UPSTREAM_ERROR",
      error:
        signal.aborted
          ? "TronGrid canonical transaction request was aborted."
          : "Unable to reach TronGrid canonical transaction API.",
    };
  }
}

export class TronGridCanonicalProvider
  implements
    TronTransactionEvidenceProvider
{
  readonly id =
    "trongrid" as const;

  readonly capabilities =
    CAPABILITIES;

  supportsNetwork(
    network:
      TronTransactionRequest[
        "network"
      ]
  ): boolean {
    return (
      network.networkId ===
        "tron" &&
      network.nativeCurrency ===
        "TRX"
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
      TronTransactionRequest
  ): Promise<
    TronProviderResult<
      TronTransactionEvidence
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
          "TronGrid canonical evidence is not enabled for this network.",
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
          "Invalid TRON transaction hash.",
      };
    }

    const apiKey =
      process.env
        .TRONGRID_API_KEY
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
          "TRONGRID_API_KEY is not configured.",
      };
    }

    const controller =
      new AbortController();

    let timedOut =
      false;

    const timeout =
      setTimeout(
        () => {
          timedOut =
            true;

          controller.abort();
        },
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
            {
              once: true,
            }
          );
      }
    }

    try {
      const bodyResult =
        await postNodeJson({
          path:
            "/walletsolidity/gettransactionbyid",
          transactionHash:
            requestedHash,
          apiKey,
          signal:
            controller.signal,
        });

      if (!bodyResult.ok) {
        return {
          ok: false,
          providerId:
            this.id,
          latencyMs:
            bodyResult.latencyMs,
          code:
            bodyResult.code,
          error:
            timedOut
              ? "TronGrid canonical transaction request timed out."
              : bodyResult.error,
        };
      }

      const receiptResult =
        await postNodeJson({
          path:
            "/walletsolidity/gettransactioninfobyid",
          transactionHash:
            requestedHash,
          apiKey,
          signal:
            controller.signal,
        });

      if (!receiptResult.ok) {
        return {
          ok: false,
          providerId:
            this.id,
          latencyMs:
            receiptResult.latencyMs,
          code:
            receiptResult.code,
          error:
            timedOut
              ? "TronGrid transaction receipt request timed out."
              : receiptResult.error,
        };
      }

      const body =
        asObject(
          bodyResult.data
        );

      const receipt =
        asObject(
          receiptResult.data
        );

      if (
        !body ||
        !receipt
      ) {
        return {
          ok: false,
          providerId:
            this.id,
          latencyMs:
            bodyResult.latencyMs +
            receiptResult.latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            "TronGrid returned incomplete canonical evidence.",
        };
      }

      const bodyHash =
        parseHash(
          body.txID
        );

      const receiptHash =
        parseHash(
          receipt.id
        );

      if (
        bodyHash !==
          requestedHash ||
        receiptHash !==
          requestedHash
      ) {
        return {
          ok: false,
          providerId:
            this.id,
          latencyMs:
            bodyResult.latencyMs +
            receiptResult.latencyMs,
          code:
            "UPSTREAM_ERROR",
          error:
            "TronGrid canonical transaction hash did not match the requested transaction.",
        };
      }

      const rawData =
        asObject(
          body.raw_data
        );

      const receiptData =
        asObject(
          receipt.receipt
        );

      const evidence:
        TronTransactionEvidence = {
          transactionHash:
            requestedHash,

          blockHeight:
            parseNonNegativeInteger(
              receipt.blockNumber
            ),

          timestamp:
            parseTimestamp(
              receipt.blockTimeStamp
            ) ??
            parseTimestamp(
              rawData?.timestamp
            ),

          confirmed:
            true,

          executionResult:
            parseString(
              receiptData?.result
            ) ??
            parseBodyResult(
              body
            ),

          feeSun:
            parseExactUnsignedInteger(
              receipt.fee
            ),

          energyUsage:
            parseNonNegativeInteger(
              receiptData
                ?.energy_usage
            ),

          energyUsageTotal:
            parseNonNegativeInteger(
              receiptData
                ?.energy_usage_total
            ),

          energyFeeSun:
            parseExactUnsignedInteger(
              receiptData
                ?.energy_fee
            ),

          netUsage:
            parseNonNegativeInteger(
              receiptData
                ?.net_usage
            ),

          netFeeSun:
            parseExactUnsignedInteger(
              receiptData
                ?.net_fee
            ),

          contract:
            parseContract(
              rawData
            ),

          rawDataHex:
            parseHex(
              body.raw_data_hex
            ),

          signatureCount:
            Array.isArray(
              body.signature
            )
              ? body.signature
                  .filter(
                    signature =>
                      typeof signature ===
                        "string" &&
                      Boolean(
                        signature.trim()
                      )
                  )
                  .length
              : 0,
        };

      return {
        ok: true,
        providerId:
          this.id,
        latencyMs:
          bodyResult.latencyMs +
          receiptResult.latencyMs,
        data:
          evidence,
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

export const tronGridCanonicalProvider =
  new TronGridCanonicalProvider();
