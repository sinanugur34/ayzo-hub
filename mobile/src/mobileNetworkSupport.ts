import {
  NETWORKS,
  NETWORK_IDS,
  type NetworkId,
} from "../../src/lib/networks/registry";

export type MobileAnalysisAdapterId =
  | "solana"
  | "evm"
  | "utxo"
  | "tron"
  | "xrpl"
  | "sui"
  | "ton"
  | "hyperliquid"
  | "stellar"
  | "cardano"
  | "aptos"
  | "near"
  | "hedera";

/*
 * Exhaustive mapping.
 *
 * Adding a canonical NetworkId without deciding
 * its mobile adapter must fail TypeScript.
 */
export const MOBILE_NETWORK_ADAPTERS:
  Record<
    NetworkId,
    MobileAnalysisAdapterId
  > = {
  solana:
    "solana",

  ethereum:
    "evm",

  base:
    "evm",

  bnb:
    "evm",

  arbitrum:
    "evm",

  polygon:
    "evm",

  optimism:
    "evm",

  avalanche:
    "evm",

  linea:
    "evm",

  scroll:
    "evm",

  mantle:
    "evm",

  sonic:
    "evm",

  monad:
    "evm",

  bitcoin:
    "utxo",

  dogecoin:
    "utxo",

  tron:
    "tron",

  xrp:
    "xrpl",

  litecoin:
    "utxo",

  sui:
    "sui",

  ton:
    "ton",

  hyperliquid:
    "hyperliquid",

  stellar:
    "stellar",

  cardano:
    "cardano",

  aptos:
    "aptos",

  near:
    "near",

  hedera:
    "hedera",
};

/*
 * Mobile readiness is deliberately separate from
 * the canonical backend live flag.
 *
 * Android exposes a network only when:
 *
 *   canonical status === live
 *   AND
 *   mobile engine readiness === true
 *
 * This prevents backend work from accidentally
 * exposing an unfinished Android experience.
 */
const MOBILE_ENGINE_READY =
  new Set<NetworkId>([
    "solana",

    "ethereum",
    "base",
    "bnb",
    "arbitrum",
    "polygon",
    "optimism",
    "avalanche",
    "linea",
    "scroll",
    "mantle",
    "sonic",
    "monad",

    "bitcoin",
    "dogecoin",
    "litecoin",
    "sui",
    "ton",
    "stellar",
    "hyperliquid",
    "tron",
    "xrp",
    "cardano",
    "aptos",
  ]);

export function getMobileNetworkSupport(
  networkId:
    NetworkId
) {
  const network =
    NETWORKS[
      networkId
    ];

  const canonicalLive =
    network.status ===
      "live";

  const engineReady =
    MOBILE_ENGINE_READY.has(
      networkId
    );

  return {
    networkId,

    name:
      network.name,

    family:
      network.family,

    adapter:
      MOBILE_NETWORK_ADAPTERS[
        networkId
      ],

    canonicalLive,

    engineReady,

    analysisEnabled:
      canonicalLive &&
      engineReady,

    evidenceWorkspace:
      true,
  } as const;
}

export function isMobileAnalysisNetworkLive(
  networkId:
    NetworkId
): boolean {
  return (
    getMobileNetworkSupport(
      networkId
    ).analysisEnabled
  );
}

export function getMobileLiveNetworkIds():
  readonly NetworkId[] {
  return NETWORK_IDS.filter(
    networkId =>
      isMobileAnalysisNetworkLive(
        networkId
      )
  );
}

export function getMobileLiveNetworks() {
  return (
    getMobileLiveNetworkIds()
      .map(
        networkId =>
          NETWORKS[
            networkId
          ]
      )
  );
}
