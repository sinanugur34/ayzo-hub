import type { NetworkId } from "@/lib/networks/registry";
import { NETWORKS } from "@/lib/networks/registry";
import {
  ALCHEMY_EVM_NETWORKS,
  getAlchemyEvmNetwork,
} from "@/lib/intelligence/evm/providers/alchemyNetworks";
import { providerUsageFetch } from "@/lib/providerUsageHttpCore";

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HEX_CODE = /^0x(?:[0-9a-fA-F]{2})*$/;
const CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 4500;

/* Fixed provider hostnames only; no URL, hostname, or network from user input. */
export const DISCOVERY_NETWORKS = Object.keys(ALCHEMY_EVM_NETWORKS)
  .filter((id): id is NetworkId =>
    id in NETWORKS &&
    NETWORKS[id as NetworkId].status === "live" &&
    NETWORKS[id as NetworkId].family === "evm"
  );

export type DiscoveryStatus = "single" | "multiple" | "none" | "partial";
export type ContractCodeEvidence = {
  network: NetworkId;
  code: string | null;
};
export type EvmContractDiscoveryResult = {
  status: DiscoveryStatus;
  candidates: NetworkId[];
  checked: number;
  total: number;
  evidence: "eth_getCode";
};

export function classifyContractEvidence(
  samples: readonly ContractCodeEvidence[],
  networks: readonly NetworkId[] = DISCOVERY_NETWORKS
): EvmContractDiscoveryResult {
  const expected = new Set<string>(networks);
  const seen = new Set<string>();
  const matches: NetworkId[] = [];
  let checked = 0;
  let invalid = false;

  for (const item of samples) {
    if (!expected.has(item.network) || seen.has(item.network)) {
      invalid = true;
      continue;
    }
    seen.add(item.network);
    if (item.code === null || !HEX_CODE.test(item.code)) {
      invalid = true;
      continue;
    }
    checked++;
    if (item.code.toLowerCase() !== "0x") matches.push(item.network);
  }

  const complete = !invalid &&
    seen.size === networks.length && checked === networks.length;
  return {
    status: !complete ? "partial" :
      matches.length === 1 ? "single" :
      matches.length > 1 ? "multiple" : "none",
    candidates: matches,
    checked,
    total: networks.length,
    evidence: "eth_getCode",
  };
}

async function getContractCode(
  network: NetworkId,
  address: string,
  apiKey: string,
  request: typeof fetch,
): Promise<ContractCodeEvidence> {
  const config = getAlchemyEvmNetwork(network);
  if (!config || !/^[-a-z0-9]+\.g\.alchemy\.com$/.test(config.httpHost)) {
    return { network, code: null };
  }
  const url = `https://${config.httpHost}/v2/${encodeURIComponent(apiKey)}`;
  try {
    const response = await providerUsageFetch(
      { provider: "alchemy", operation: "eth_getCode" },
      url,
      () => request(url, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "eth_getCode", params: [address, "latest"],
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    );
    if (!response.ok) return { network, code: null };
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return { network, code: null };
    }
    const obj = body as Record<string, unknown>;
    const value = obj.result;
    if (obj.error !== undefined || typeof value !== "string" ||
      value.length > 131072 || !HEX_CODE.test(value)) {
      return { network, code: null };
    }
    return { network, code: value };
  } catch {
    // Fail closed. Provider errors are never proof that a contract is absent.
    return { network, code: null };
  }
}

export async function scanEvmContractNetworks(
  address: string,
  apiKey: string,
  request: typeof fetch = fetch,
  networks: readonly NetworkId[] = DISCOVERY_NETWORKS,
): Promise<EvmContractDiscoveryResult> {
  if (!EVM_ADDRESS.test(address) || !apiKey || networks.length === 0 ||
    networks.length > DISCOVERY_NETWORKS.length ||
    networks.some(id => !DISCOVERY_NETWORKS.includes(id))) {
    throw new Error("Invalid network discovery input.");
  }
  const results: ContractCodeEvidence[] = [];
  let next = 0;
  const worker = async () => {
    while (next < networks.length) {
      const index = next++;
      results[index] = await getContractCode(
        networks[index], address.toLowerCase(), apiKey, request
      );
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, networks.length) }, worker));
  return classifyContractEvidence(results, networks);
}
