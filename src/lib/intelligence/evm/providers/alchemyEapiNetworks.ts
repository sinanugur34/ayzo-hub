import type {
  NetworkId,
} from "@/lib/networks/registry";

/*
 * Live-certified against the AYZO Free Alchemy app
 * on 2026-10-07.
 *
 * These networks returned HTTP 200 for:
 * alchemy_getAssetTransfers.
 *
 * Mantle and Sonic deliberately remain excluded:
 * Alchemy returned EAPIs-not-enabled errors.
 */
export const ALCHEMY_FREE_EAPI_NETWORKS =
  [
    "ethereum",
    "base",
    "bnb",
    "arbitrum",
    "polygon",
    "optimism",
    "avalanche",
    "linea",
    "scroll",
    "monad",
  ] as const satisfies readonly NetworkId[];

const NETWORK_SET =
  new Set<string>(
    ALCHEMY_FREE_EAPI_NETWORKS
  );

export function isAlchemyFreeEapiNetwork(
  networkId:
    string
): boolean {
  return NETWORK_SET.has(
    networkId
  );
}
