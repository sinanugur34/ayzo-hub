import type {
  NetworkCapability,
  NetworkDefinition,
} from "./types";

const SOLANA_CAPABILITIES = [
  "assetVerification",
  "holderIntelligence",
  "walletRelationships",
  "fundingIntelligence",
] as const satisfies readonly NetworkCapability[];

const EVM_CAPABILITIES = [
  "assetVerification",
  "holderIntelligence",
  "walletRelationships",
  "fundingIntelligence",
] as const satisfies readonly NetworkCapability[];

const BITCOIN_CAPABILITIES = [
  "walletRelationships",
  "fundingIntelligence",
  "fundingProvenance",
  "addressFlows",
] as const satisfies readonly NetworkCapability[];

export const NETWORKS = {
  solana: {
    id: "solana",
    name: "Solana",
    shortName: "SOL",
    family: "solana",
    status: "live",
    chainId: null,
    nativeCurrency: "SOL",
    explorerUrl: "https://solscan.io",
    capabilities: SOLANA_CAPABILITIES,
  },

  ethereum: {
    id: "ethereum",
    name: "Ethereum",
    shortName: "ETH",
    family: "evm",
    status: "development",
    chainId: 1,
    nativeCurrency: "ETH",
    explorerUrl: "https://etherscan.io",
    capabilities: EVM_CAPABILITIES,
  },

  base: {
    id: "base",
    name: "Base",
    shortName: "BASE",
    family: "evm",
    status: "planned",
    chainId: 8453,
    nativeCurrency: "ETH",
    explorerUrl: "https://basescan.org",
    capabilities: EVM_CAPABILITIES,
  },

  bnb: {
    id: "bnb",
    name: "BNB Chain",
    shortName: "BNB",
    family: "evm",
    status: "planned",
    chainId: 56,
    nativeCurrency: "BNB",
    explorerUrl: "https://bscscan.com",
    capabilities: EVM_CAPABILITIES,
  },

  arbitrum: {
    id: "arbitrum",
    name: "Arbitrum",
    shortName: "ARB",
    family: "evm",
    status: "planned",
    chainId: 42161,
    nativeCurrency: "ETH",
    explorerUrl: "https://arbiscan.io",
    capabilities: EVM_CAPABILITIES,
  },

  polygon: {
    id: "polygon",
    name: "Polygon",
    shortName: "POL",
    family: "evm",
    status: "planned",
    chainId: 137,
    nativeCurrency: "POL",
    explorerUrl: "https://polygonscan.com",
    capabilities: EVM_CAPABILITIES,
  },

  optimism: {
    id: "optimism",
    name: "Optimism",
    shortName: "OP",
    family: "evm",
    status: "planned",
    chainId: 10,
    nativeCurrency: "ETH",
    explorerUrl: "https://optimistic.etherscan.io",
    capabilities: EVM_CAPABILITIES,
  },

  avalanche: {
    id: "avalanche",
    name: "Avalanche",
    shortName: "AVAX",
    family: "evm",
    status: "planned",
    chainId: 43114,
    nativeCurrency: "AVAX",
    explorerUrl: "https://snowtrace.io",
    capabilities: EVM_CAPABILITIES,
  },

  linea: {
    id: "linea",
    name: "Linea",
    shortName: "LINEA",
    family: "evm",
    status: "planned",
    chainId: 59144,
    nativeCurrency: "ETH",
    explorerUrl: "https://lineascan.build",
    capabilities: EVM_CAPABILITIES,
  },

  scroll: {
    id: "scroll",
    name: "Scroll",
    shortName: "SCROLL",
    family: "evm",
    status: "planned",
    chainId: 534352,
    nativeCurrency: "ETH",
    explorerUrl: "https://scrollscan.com",
    capabilities: EVM_CAPABILITIES,
  },

  mantle: {
    id: "mantle",
    name: "Mantle",
    shortName: "MNT",
    family: "evm",
    status: "planned",
    chainId: 5000,
    nativeCurrency: "MNT",
    explorerUrl: "https://mantlescan.xyz",
    capabilities: EVM_CAPABILITIES,
  },

  sonic: {
    id: "sonic",
    name: "Sonic",
    shortName: "S",
    family: "evm",
    status: "planned",
    chainId: 146,
    nativeCurrency: "S",
    explorerUrl: "https://sonicscan.org",
    capabilities: EVM_CAPABILITIES,
  },

  monad: {
    id: "monad",
    name: "Monad",
    shortName: "MON",
    family: "evm",
    status: "planned",
    chainId: 143,
    nativeCurrency: "MON",
    explorerUrl: "https://monadscan.com",
    capabilities: EVM_CAPABILITIES,
  },

  bitcoin: {
    id: "bitcoin",
    name: "Bitcoin",
    shortName: "BTC",
    family: "bitcoin",
    status: "planned",
    chainId: null,
    nativeCurrency: "BTC",
    explorerUrl: "https://mempool.space",
    capabilities: BITCOIN_CAPABILITIES,
  },
} as const satisfies Record<string, NetworkDefinition>;

export type NetworkId = keyof typeof NETWORKS;

export const NETWORK_IDS =
  Object.keys(NETWORKS) as NetworkId[];

export function getNetwork(
  id: string
): NetworkDefinition | null {
  return NETWORKS[id as NetworkId] ?? null;
}

export function isNetworkId(
  value: string
): value is NetworkId {
  return value in NETWORKS;
}
