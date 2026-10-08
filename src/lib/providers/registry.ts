import type {
  ProviderDefinition,
  ProviderId,
} from "./types";

export const PROVIDERS = {
  routescan: {
    id: "routescan",
    name: "Routescan",
    kind: "indexed-data",
    role: "fallback",
  },

  blockscout: {
    id: "blockscout",
    name: "Blockscout",
    kind: "indexed-data",
    role: "fallback",
  },

  goldrush: {
    id: "goldrush",
    name: "GoldRush",
    kind: "indexed-data",
    role: "primary",
  },

  ankr: {
    id: "ankr",
    name: "Ankr",
    kind: "indexed-data",
    role: "primary",
  },

  alchemy: {
    id: "alchemy",
    name: "Alchemy",
    kind: "rpc",
    role: "fallback",
  },

  etherscan: {
    id: "etherscan",
    name: "Etherscan",
    kind: "indexed-data",
    role: "fallback",
  },

  "sonic-rpc": {
    id: "sonic-rpc",
    name: "Sonic Public RPC",
    kind: "rpc",
    role: "fallback",
  },

  "mantle-rpc": {
    id: "mantle-rpc",
    name: "Mantle Public RPC",
    kind: "rpc",
    role: "fallback",
  },

  blockchair: {
    id: "blockchair",
    name: "Blockchair",
    kind: "indexed-data",
    role: "primary",
  },

  mempool: {
    id: "mempool",
    name: "Mempool.space",
    kind: "indexed-data",
    role: "fallback",
  },

  blockcypher: {
    id: "blockcypher",
    name: "BlockCypher",
    kind: "indexed-data",
    role: "fallback",
  },

  trongrid: {
    id: "trongrid",
    name: "TronGrid",
    kind: "indexed-data",
    role: "primary",
  },
} as const satisfies Record<
  ProviderId,
  ProviderDefinition
>;

export function getProvider(
  id: ProviderId
): ProviderDefinition {
  return PROVIDERS[id];
}
