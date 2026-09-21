import {
  NETWORKS,
  type NetworkId,
} from "./registry";
import type {
  NetworkCapability,
} from "./types";

export const PRODUCT_TOOL_IDS = [
  "tokenAnalysis",
  "walletAnalysis",
  "fundingTrace",
  "connections",
] as const;

export type ProductToolId =
  (typeof PRODUCT_TOOL_IDS)[number];

export type ProductToolDefinition = {
  id: ProductToolId;
  title: string;
  description: string;
  icon: string;
  requiredAny: readonly NetworkCapability[];
};

export const PRODUCT_TOOLS:
  readonly ProductToolDefinition[] = [
  {
    id: "tokenAnalysis",
    title: "Token Analysis",
    description: "Authorities, holders & asset signals",
    icon: "◎",
    requiredAny: [
      "assetVerification",
      "holderIntelligence",
    ],
  },
  {
    id: "walletAnalysis",
    title: "Wallet Analysis",
    description: "Behavior, history & observed flows",
    icon: "◌",
    requiredAny: [
      "walletRelationships",
      "walletGraph",
      "addressFlows",
    ],
  },
  {
    id: "fundingTrace",
    title: "Funding Trace",
    description: "Follow observed source and destination evidence",
    icon: "↗",
    requiredAny: [
      "fundingIntelligence",
      "fundingProvenance",
    ],
  },
  {
    id: "connections",
    title: "Connections",
    description: "Relationships, graph evidence & linked addresses",
    icon: "⌘",
    requiredAny: [
      "walletRelationships",
      "walletGraph",
      "coordinatedWalletBehavior",
    ],
  },
];

export function getProductToolsForNetwork(
  networkId: NetworkId
): readonly ProductToolDefinition[] {
  const capabilities:
    readonly NetworkCapability[] =
    NETWORKS[networkId].capabilities;

  return PRODUCT_TOOLS.filter((tool) =>
    tool.requiredAny.some((capability) =>
      capabilities.includes(capability)
    )
  );
}

export function getLiveNetworks() {
  return Object.values(NETWORKS).filter(
    (network) => network.status === "live"
  );
}
