import {
  NETWORKS,
  isNetworkId,
  type NetworkId,
} from "@/lib/networks/registry";
import type {
  NetworkDefinition,
  NetworkFamily,
} from "@/lib/networks/types";

export type IntelligenceEngineId =
  NetworkFamily;

export type NetworkResolution =
  | {
      ok: true;
      networkId: NetworkId;
      engine: IntelligenceEngineId;
      network: NetworkDefinition;
    }
  | {
      ok: false;
      code:
        | "INVALID_NETWORK"
        | "NETWORK_NOT_AVAILABLE";
      error: string;
      networkId?: NetworkId;
    };

export function resolveIntelligenceNetwork(
  value: unknown
): NetworkResolution {
  if (typeof value !== "string") {
    return {
      ok: false,
      code: "INVALID_NETWORK",
      error: "Network is required.",
    };
  }

  const normalized =
    value.trim().toLowerCase();

  if (!isNetworkId(normalized)) {
    return {
      ok: false,
      code: "INVALID_NETWORK",
      error: "Unsupported network.",
    };
  }

  const network = NETWORKS[normalized];

  if (network.status !== "live") {
    return {
      ok: false,
      code: "NETWORK_NOT_AVAILABLE",
      error: `${network.name} intelligence is not live yet.`,
      networkId: normalized,
    };
  }

  return {
    ok: true,
    networkId: normalized,
    engine: network.family,
    network,
  };
}
