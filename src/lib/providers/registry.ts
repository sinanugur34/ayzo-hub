import type {
  ProviderDefinition,
  ProviderId,
} from "./types";

export const PROVIDERS = {
  goldrush: {
    id: "goldrush",
    name: "GoldRush",
    kind: "indexed-data",
    role: "primary",
  },

  alchemy: {
    id: "alchemy",
    name: "Alchemy",
    kind: "rpc",
    role: "fallback",
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
