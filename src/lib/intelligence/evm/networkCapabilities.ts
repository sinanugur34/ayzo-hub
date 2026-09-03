import type {
  NetworkId,
} from "@/lib/networks/registry";

export const EVM_NETWORK_CAPABILITY_IDS = [
  "verification",
  "holders",
  "transactions",
  "transfers",
  "relationships",
  "funding",
  "deployment",
  "developerHistory",
  "coordinatedBehavior",
  "walletGraph",
] as const;

export type EvmNetworkCapabilityId =
  (typeof EVM_NETWORK_CAPABILITY_IDS)[number];

export type EvmNetworkCapabilityAvailability =
  | "available"
  | "limited"
  | "unavailable";

export type EvmNetworkCapability = {
  availability:
    EvmNetworkCapabilityAvailability;
  limitation: string | null;
};

export type EvmNetworkCapabilities = {
  [K in EvmNetworkCapabilityId]:
    EvmNetworkCapability;
};

const BOUNDED_RELATIONSHIP_LIMITATION =
  "Relationship evidence is bounded to configured transaction and ERC-20 transfer pages.";

const TOP_LEVEL_DEPLOYMENT_LIMITATION =
  "Only top-level CREATE deployment evidence is covered; internal CREATE and CREATE2 are not included.";

const BOUNDED_DEVELOPER_LIMITATION =
  "Developer history is bounded and includes only receipt-verified top-level CREATE evidence.";

const BOUNDED_COORDINATION_LIMITATION =
  "Coordination analysis is bounded and does not infer ownership, identity, intent or control.";

const BOUNDED_GRAPH_LIMITATION =
  "Wallet graph coverage is bounded observed connectivity and does not infer ownership.";

function supportedEvmCapabilities():
  EvmNetworkCapabilities {
  return {
    verification: {
      availability:
        "available",
      limitation:
        null,
    },

    holders: {
      availability:
        "available",
      limitation:
        null,
    },

    transactions: {
      availability:
        "available",
      limitation:
        null,
    },

    transfers: {
      availability:
        "available",
      limitation:
        null,
    },

    relationships: {
      availability:
        "limited",
      limitation:
        BOUNDED_RELATIONSHIP_LIMITATION,
    },

    funding: {
      availability:
        "limited",
      limitation:
        BOUNDED_RELATIONSHIP_LIMITATION,
    },

    deployment: {
      availability:
        "limited",
      limitation:
        TOP_LEVEL_DEPLOYMENT_LIMITATION,
    },

    developerHistory: {
      availability:
        "limited",
      limitation:
        BOUNDED_DEVELOPER_LIMITATION,
    },

    coordinatedBehavior: {
      availability:
        "limited",
      limitation:
        BOUNDED_COORDINATION_LIMITATION,
    },

    walletGraph: {
      availability:
        "limited",
      limitation:
        BOUNDED_GRAPH_LIMITATION,
    },
  };
}

const EVM_NETWORK_CAPABILITIES = {
  ethereum:
    supportedEvmCapabilities(),

  base:
    supportedEvmCapabilities(),
} as const satisfies Partial<
  Record<
    NetworkId,
    EvmNetworkCapabilities
  >
>;

export function getEvmNetworkCapabilities(
  networkId: NetworkId
): EvmNetworkCapabilities | null {
  return (
    EVM_NETWORK_CAPABILITIES[
      networkId as keyof typeof EVM_NETWORK_CAPABILITIES
    ] ?? null
  );
}
