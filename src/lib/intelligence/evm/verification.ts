import type {
  EvmContractCodeProvider,
} from "./provider";
import type {
  EvmContractVerification,
  EvmNetworkContext,
  EvmProviderFailure,
  EvmProviderResult,
} from "./types";

const EVM_ADDRESS_PATTERN =
  /^0x[0-9a-fA-F]{40}$/;

export function isEvmAddress(
  value: string
): boolean {
  return EVM_ADDRESS_PATTERN.test(value);
}

type VerifyEvmContractInput = {
  network: EvmNetworkContext;
  address: string;
  provider: EvmContractCodeProvider;
  signal?: AbortSignal;
};

export async function verifyEvmContract({
  network,
  address,
  provider,
  signal,
}: VerifyEvmContractInput): Promise<
  EvmProviderResult<EvmContractVerification>
> {
  if (!isEvmAddress(address)) {
    const failure: EvmProviderFailure = {
      ok: false,
      providerId: provider.id,
      latencyMs: null,
      code: "INVALID_ADDRESS",
      error: "Invalid EVM address.",
    };

    return failure;
  }

  if (!provider.supportsNetwork(network)) {
    return {
      ok: false,
      providerId: provider.id,
      latencyMs: null,
      code: "UNSUPPORTED_NETWORK",
      error:
        `${provider.id} does not support ${network.name}.`,
    };
  }

  if (
    !provider.supportsCapability(
      "contractCode"
    )
  ) {
    return {
      ok: false,
      providerId: provider.id,
      latencyMs: null,
      code: "UNSUPPORTED_CAPABILITY",
      error:
        `${provider.id} does not support contract-code verification.`,
    };
  }

  const result =
    await provider.getContractCode({
      network,
      address,
      signal,
    });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    providerId: result.providerId,
    latencyMs: result.latencyMs,
    data: {
      networkId: network.networkId,
      address,
      isContract:
        result.data.isContract,
      providerId: result.providerId,
      latencyMs: result.latencyMs,
    },
  };
}
