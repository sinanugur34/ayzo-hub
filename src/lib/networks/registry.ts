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
  "fundingProvenance",
  "deploymentIntelligence",
  "developerHistory",
  "coordinatedWalletBehavior",
  "walletGraph",
] as const satisfies readonly NetworkCapability[];

const BITCOIN_CAPABILITIES = [
  "walletRelationships",
  "fundingIntelligence",
  "fundingProvenance",
  "addressFlows",
] as const satisfies readonly NetworkCapability[];

const DOGECOIN_CAPABILITIES = [
  "addressFlows",
  "walletRelationships",
  "fundingIntelligence",
  "fundingProvenance",
] as const satisfies readonly NetworkCapability[];

const TRON_CAPABILITIES = [
  "addressFlows",
  "walletRelationships",
  "fundingIntelligence",
  "fundingProvenance",
] as const satisfies readonly NetworkCapability[];

const XRPL_CAPABILITIES = [
  "addressFlows",
  "walletRelationships",
  "fundingIntelligence",
] as const satisfies readonly NetworkCapability[];

const LITECOIN_CAPABILITIES = [
  "addressFlows",
  "walletRelationships",
  "fundingIntelligence",
  "fundingProvenance",
] as const satisfies readonly NetworkCapability[];

const SUI_CAPABILITIES = [
  "addressFlows",
  "walletRelationships",
  "fundingIntelligence",
  "fundingProvenance",
] as const satisfies readonly NetworkCapability[];

const TON_CAPABILITIES = [
  "addressFlows",
  "walletRelationships",
  "fundingIntelligence",
  "fundingProvenance",
] as const satisfies readonly NetworkCapability[];

const HYPERLIQUID_CAPABILITIES = [
  "addressFlows",
] as const satisfies readonly NetworkCapability[];

const STELLAR_CAPABILITIES = [
  "addressFlows",
  "walletRelationships",
  "fundingIntelligence",
  "fundingProvenance",
] as const satisfies readonly NetworkCapability[];

const CARDANO_CAPABILITIES = [
  "assetVerification",
  "addressFlows",
  "walletRelationships",
  "fundingIntelligence",
  "fundingProvenance",
] as const satisfies readonly NetworkCapability[];

const APTOS_CAPABILITIES = [
  "assetVerification",
  "addressFlows",
  "walletRelationships",
  "fundingIntelligence",
  "fundingProvenance",
] as const satisfies readonly NetworkCapability[];

const NEAR_CAPABILITIES = [
  "assetVerification",
  "addressFlows",
  "walletRelationships",
  "fundingIntelligence",
] as const satisfies readonly NetworkCapability[];

const HEDERA_CAPABILITIES = [
  "assetVerification",
  "addressFlows",
  "walletRelationships",
  "fundingIntelligence",
] as const satisfies readonly NetworkCapability[];

const ZCASH_CAPABILITIES = [
  "addressFlows",
  "walletRelationships",
  "fundingIntelligence",
  "fundingProvenance",
] as const satisfies readonly NetworkCapability[];

const ALGORAND_CAPABILITIES = [
  "assetVerification",
  "addressFlows",
  "walletRelationships",
  "fundingIntelligence",
  "fundingProvenance",
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
    status: "live",
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
    status: "live",
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
    status: "live",
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
    status: "live",
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
    status: "live",
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
    status: "live",
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
    status: "live",
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
    status: "live",
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
    status: "live",
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
    status: "live",
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
    status: "live",
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
    status: "live",
    chainId: 143,
    nativeCurrency: "MON",
    explorerUrl: "https://monadscan.com",
    capabilities: EVM_CAPABILITIES,
  },

  dogecoin: {
    id: "dogecoin",
    name: "Dogecoin",
    shortName: "DOGE",
    family: "dogecoin",
    status: "live",
    chainId: null,
    nativeCurrency: "DOGE",
    explorerUrl: "https://blockchair.com/dogecoin",
    capabilities: DOGECOIN_CAPABILITIES,
  },

  bitcoin: {
    id: "bitcoin",
    name: "Bitcoin",
    shortName: "BTC",
    family: "bitcoin",
    status: "live",
    chainId: null,
    nativeCurrency: "BTC",
    explorerUrl: "https://mempool.space",
    capabilities: BITCOIN_CAPABILITIES,
  },

  tron: {
    id: "tron",
    name: "TRON",
    shortName: "TRX",
    family: "tron",
    status: "live",
    chainId: null,
    nativeCurrency: "TRX",
    explorerUrl: "https://tronscan.org",
    capabilities: TRON_CAPABILITIES,
  },
  xrp: {
    id: "xrp",
    name: "XRP Ledger",
    shortName: "XRP",
    family: "xrpl",
    status: "live",
    chainId: null,
    nativeCurrency: "XRP",
    explorerUrl: "https://livenet.xrpl.org",
    capabilities: XRPL_CAPABILITIES,
  },

  litecoin: {
    id: "litecoin",
    name: "Litecoin",
    shortName: "LTC",
    family: "litecoin",
    status: "live",
    chainId: null,
    nativeCurrency: "LTC",
    explorerUrl: "https://blockchair.com/litecoin",
    capabilities: LITECOIN_CAPABILITIES,
  },

  sui: {
    id: "sui",
    name: "Sui",
    shortName: "SUI",
    family: "sui",
    status: "live",
    chainId: null,
    nativeCurrency: "SUI",
    explorerUrl: "https://suivision.xyz",
    capabilities: SUI_CAPABILITIES,
  },

  ton: {
    id: "ton",
    name: "TON",
    shortName: "TON",
    family: "ton",
    status: "live",
    chainId: null,
    nativeCurrency: "TON",
    explorerUrl: "https://tonviewer.com",
    capabilities: TON_CAPABILITIES,
  },

  hyperliquid: {
    id: "hyperliquid",
    name: "Hyperliquid",
    shortName: "HYPE",
    family: "hyperliquid",
    status: "live",
    chainId: null,
    nativeCurrency: "HYPE",
    explorerUrl: "https://app.hyperliquid.xyz/explorer",
    capabilities: HYPERLIQUID_CAPABILITIES,
  },

  stellar: {
    id: "stellar",
    name: "Stellar",
    shortName: "XLM",
    family: "stellar",
    status: "live",
    chainId: null,
    nativeCurrency: "XLM",
    explorerUrl: "https://stellar.expert/explorer/public",
    capabilities: STELLAR_CAPABILITIES,
  },

  cardano: {
    id: "cardano",
    name: "Cardano",
    shortName: "ADA",
    family: "cardano",
    status: "live",
    chainId: null,
    nativeCurrency: "ADA",
    explorerUrl: "https://cardanoscan.io",
    capabilities: CARDANO_CAPABILITIES,
  },

  aptos: {
    id: "aptos",
    name: "Aptos",
    shortName: "APT",
    family: "aptos",
    status: "live",
    chainId: null,
    nativeCurrency: "APT",
    explorerUrl: "https://explorer.aptoslabs.com",
    capabilities: APTOS_CAPABILITIES,
  },

  zcash: {
    id: "zcash",
    name: "Zcash",
    shortName: "ZEC",
    family: "zcash",
    status: "development",
    chainId: null,
    nativeCurrency: "ZEC",
    explorerUrl: "https://blockchair.com/zcash",
    capabilities: ZCASH_CAPABILITIES,
  },

  algorand: {
    id: "algorand",
    name: "Algorand",
    shortName: "ALGO",
    family: "algorand",
    status: "development",
    chainId: null,
    nativeCurrency: "ALGO",
    explorerUrl: "https://allo.info",
    capabilities: ALGORAND_CAPABILITIES,
  },

  near: {
    id: "near",
    name: "NEAR",
    shortName: "NEAR",
    family: "near",
    status: "development",
    chainId: null,
    nativeCurrency: "NEAR",
    explorerUrl: "https://nearblocks.io",
    capabilities: NEAR_CAPABILITIES,
  },

  hedera: {
    id: "hedera",
    name: "Hedera",
    shortName: "HBAR",
    family: "hedera",
    status: "live",
    chainId: null,
    nativeCurrency: "HBAR",
    explorerUrl: "https://hashscan.io/mainnet",
    capabilities: HEDERA_CAPABILITIES,
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
