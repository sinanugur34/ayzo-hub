import type {
  EvmContractCallProvider,
  EvmContractCodeProvider,
} from "./provider";

import type {
  EvmNetworkContext,
  EvmProviderResult,
  EvmTokenMetadata,
} from "./types";

import {
  verifyEvmContract,
} from "./verification";

const SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
  balanceOf: "0x70a08231",
} as const;

const ZERO_ADDRESS_WORD =
  "0".repeat(64);

type Erc20Provider =
  EvmContractCodeProvider &
  EvmContractCallProvider;

type ReadErc20MetadataInput = {
  network: EvmNetworkContext;
  address: string;
  provider: Erc20Provider;
  signal?: AbortSignal;
};

function decodeUint256(
  value: string
): bigint | null {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) {
    return null;
  }

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function decodeUtf8(
  bytes: Buffer
): string | null {
  const value = bytes
    .toString("utf8")
    .replace(/\0+$/g, "")
    .trim();

  return value.length > 0
    ? value
    : null;
}

function decodeAbiString(
  value: string
): string | null {
  if (
    !/^0x[0-9a-fA-F]*$/.test(value) ||
    value.length <= 2
  ) {
    return null;
  }

  const hex = value.slice(2);

  if (
    hex.length % 2 !== 0 ||
    hex.length < 64
  ) {
    return null;
  }

  const bytes =
    Buffer.from(hex, "hex");

  // Standard ABI dynamic string.
  if (bytes.length >= 64) {
    try {
      const offset = Number(
        BigInt(
          `0x${bytes
            .subarray(0, 32)
            .toString("hex")}`
        )
      );

      if (
        Number.isSafeInteger(offset) &&
        offset >= 0 &&
        offset + 32 <= bytes.length
      ) {
        const length = Number(
          BigInt(
            `0x${bytes
              .subarray(
                offset,
                offset + 32
              )
              .toString("hex")}`
          )
        );

        if (
          Number.isSafeInteger(length) &&
          length >= 0 &&
          length <= 4096 &&
          offset + 32 + length <=
            bytes.length
        ) {
          return decodeUtf8(
            bytes.subarray(
              offset + 32,
              offset + 32 + length
            )
          );
        }
      }
    } catch {
      // Fall through to bytes32 compatibility.
    }
  }

  // Legacy tokens sometimes return bytes32.
  return decodeUtf8(
    bytes.subarray(
      0,
      Math.min(32, bytes.length)
    )
  );
}

function resultValue(
  result: Awaited<
    ReturnType<
      EvmContractCallProvider["callContract"]
    >
  >
): string | null {
  return result.ok
    ? result.data.result
    : null;
}

export async function readErc20Metadata({
  network,
  address,
  provider,
  signal,
}: ReadErc20MetadataInput): Promise<
  EvmProviderResult<EvmTokenMetadata>
> {
  const startedAt =
    performance.now();

  const verification =
    await verifyEvmContract({
      network,
      address,
      provider,
      signal,
    });

  if (!verification.ok) {
    return verification;
  }

  if (!verification.data.isContract) {
    return {
      ok: true,
      providerId: provider.id,
      latencyMs: Math.round(
        performance.now() - startedAt
      ),
      data: {
        address,
        name: null,
        symbol: null,
        decimals: null,
        totalSupply: null,
        isContract: false,
        isErc20: false,
      },
    };
  }

  if (
    !provider.supportsCapability(
      "contractCall"
    )
  ) {
    return {
      ok: false,
      providerId: provider.id,
      latencyMs: null,
      code: "UNSUPPORTED_CAPABILITY",
      error:
        `${provider.id} does not support contract calls.`,
    };
  }

  const [
    nameResult,
    symbolResult,
    decimalsResult,
    totalSupplyResult,
    balanceResult,
  ] = await Promise.all([
    provider.callContract({
      network,
      address,
      data: SELECTORS.name,
      signal,
    }),

    provider.callContract({
      network,
      address,
      data: SELECTORS.symbol,
      signal,
    }),

    provider.callContract({
      network,
      address,
      data: SELECTORS.decimals,
      signal,
    }),

    provider.callContract({
      network,
      address,
      data: SELECTORS.totalSupply,
      signal,
    }),

    provider.callContract({
      network,
      address,
      data:
        SELECTORS.balanceOf +
        ZERO_ADDRESS_WORD,
      signal,
    }),
  ]);

  // Mandatory ERC-20 calls must not be
  // hidden by infrastructure failures.
  for (const result of [
    totalSupplyResult,
    balanceResult,
  ]) {
    if (
      !result.ok &&
      result.code !== "CALL_REVERTED"
    ) {
      return {
        ok: false,
        providerId: result.providerId,
        latencyMs: result.latencyMs,
        code: result.code,
        error: result.error,
      };
    }
  }

  const totalSupplyRaw =
    resultValue(totalSupplyResult);

  const balanceRaw =
    resultValue(balanceResult);

  const totalSupply =
    totalSupplyRaw
      ? decodeUint256(totalSupplyRaw)
      : null;

  const balance =
    balanceRaw
      ? decodeUint256(balanceRaw)
      : null;

  const isErc20 =
    totalSupply !== null &&
    balance !== null;

  const decimalsRaw =
    resultValue(decimalsResult);

  const decodedDecimals =
    decimalsRaw
      ? decodeUint256(decimalsRaw)
      : null;

  const decimals =
    decodedDecimals !== null &&
    decodedDecimals >= 0n &&
    decodedDecimals <= 255n
      ? Number(decodedDecimals)
      : null;

  return {
    ok: true,
    providerId: provider.id,
    latencyMs: Math.round(
      performance.now() - startedAt
    ),
    data: {
      address,
      name:
        decodeAbiString(
          resultValue(nameResult) ?? ""
        ),
      symbol:
        decodeAbiString(
          resultValue(symbolResult) ?? ""
        ),
      decimals,
      totalSupply:
        totalSupply?.toString() ?? null,
      isContract: true,
      isErc20,
    },
  };
}
