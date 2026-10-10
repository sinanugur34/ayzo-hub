import type { NetworkId } from "@/lib/networks/registry";
import type { EvmPaginatedAddressRequest, EvmTokenHoldersProvider } from "../provider";
import type { EvmProviderResult, EvmTokenHolders } from "../types";
import { ankrHoldersProvider } from "./ankrHolders";
import { isIndexedHolderCanaryAllowed } from "./indexedHolderCanary";
import { blockscoutHoldersProvider } from "./indexedHolderAdapters";

const ANKR_NETWORKS = new Set<NetworkId>([
  "base", "bnb", "arbitrum", "polygon", "avalanche", "linea",
]);
export type PreferredHoldersDependencies = { ankr: EvmTokenHoldersProvider };
const DEFAULT_DEPENDENCIES: PreferredHoldersDependencies = { ankr: ankrHoldersProvider };

export function getPreferredEvmHolderProviderId(networkId: NetworkId):
  "ankr" | "blockscout" | "unavailable" {
  if (ANKR_NETWORKS.has(networkId)) return "ankr";
  if (["ethereum", "optimism", "scroll"].includes(networkId)) return "blockscout";
  return "unavailable";
}

const fail = (message: string): EvmProviderResult<EvmTokenHolders> => ({
  ok: false, providerId: "blockscout", latencyMs: null,
  code: "UPSTREAM_ERROR", error: message,
});

export async function getPreferredEvmTokenHolders(
  request: EvmPaginatedAddressRequest,
  dependencies: PreferredHoldersDependencies = DEFAULT_DEPENDENCIES
): Promise<EvmProviderResult<EvmTokenHolders>> {
  const cursor = request.cursor ?? "";
  const indexedAllowed = isIndexedHolderCanaryAllowed({
    flag: process.env.AYZO_INDEXED_HOLDER_CANARY,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
  // Provider-owned pagination MUST NOT be translated between providers.
  if (cursor && /^\d+$/.test(cursor))
    return fail("Retired holder cursor cannot be continued by a different provider.");
  if (cursor.startsWith("routescan:")) {
    return { ok: false, providerId: "routescan", latencyMs: null,
      code: "UPSTREAM_ERROR", error: "Unverified holder ordering; continuation rejected." };
  }
  if (cursor.startsWith("blockscout:")) {
    if (!indexedAllowed || !blockscoutHoldersProvider.supportsNetwork(request.network))
      return fail("Indexed holder continuation is disabled in this environment.");
    return blockscoutHoldersProvider.getTokenHolders(request);
  }
  if (cursor && !cursor.startsWith("ankr:"))
    return fail("Unknown holder cursor; refusing cross-provider continuation.");
  if (cursor.startsWith("ankr:")) {
    if (!ANKR_NETWORKS.has(request.network.networkId)) return fail("Ankr cursor network mismatch.");
    return dependencies.ankr.getTokenHolders(request);
  }
  // The preview-only canary is not independent holder certification.
  if (indexedAllowed && blockscoutHoldersProvider.supportsNetwork(request.network)) {
    const result = await blockscoutHoldersProvider.getTokenHolders(request);
    if (result.ok) return result;
    if (!ANKR_NETWORKS.has(request.network.networkId)) return result;
  }
  if (ANKR_NETWORKS.has(request.network.networkId))
    return dependencies.ankr.getTokenHolders(request);
  return fail("No certified non-retired holder provider is available for this network.");
}
