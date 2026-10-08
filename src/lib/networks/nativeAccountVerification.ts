import type { NetworkId } from "@/lib/networks/registry";
import { verifyWave2Account, type Wave2AccountNetwork } from "./nativeAccountVerificationWave2";
import { providerUsageFetch } from "@/lib/providerUsageHttpCore";
import { normalizeHederaAccountId } from "@/lib/intelligence/hedera/address";
import { isStellarAccountAddress } from "@/lib/intelligence/stellar/address";
import { normalizeAptosAddress } from "@/lib/intelligence/aptos/address";

/** Only these native account-lookup strategies are certified in Wave 1. */
export const NATIVE_ACCOUNT_NETWORKS = [
  "hedera", "stellar", "aptos", "solana", "tron", "sui",
] as const satisfies readonly NetworkId[];

export type NativeAccountNetwork = typeof NATIVE_ACCOUNT_NETWORKS[number];
export type NativeAccountStatus = "observed" | "not_observed" | "unavailable";
export type NativeAccountEvidence = {
  network: NativeAccountNetwork;
  status: NativeAccountStatus;
};

const MAX_RESPONSE_CHARS = 65536;
const REQUEST_TIMEOUT_MS = 4500;
const ACCOUNT_NETWORKS = new Set<string>(NATIVE_ACCOUNT_NETWORKS);

type JsonObject = Record<string, unknown>;
function record(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject : null;
}

export function isNativeAccountNetwork(id: NetworkId): id is NativeAccountNetwork {
  return ACCOUNT_NETWORKS.has(id);
}

export function validateNativeAccountPayload(
  network: NativeAccountNetwork,
  address: string,
  data: unknown
): boolean {
  const row = record(data);
  if (!row) return false;
  if (network === "hedera") {
    return typeof row.account === "string" &&
      normalizeHederaAccountId(row.account) === normalizeHederaAccountId(address);
  }
  if (network === "stellar") {
    return typeof row.account_id === "string" &&
      row.account_id === address.trim().toUpperCase();
  }
  if (network !== "aptos") return false;
  return typeof row.sequence_number === "string" &&
    /^\d+$/.test(row.sequence_number) &&
    typeof row.authentication_key === "string" &&
    /^0x[0-9a-fA-F]{64}$/.test(row.authentication_key);
}

function lookupUrl(network: NativeAccountNetwork, address: string): string | null {
  if (network === "hedera") {
    const id = normalizeHederaAccountId(address);
    return id ? `https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${encodeURIComponent(id)}` : null;
  }
  if (network === "stellar") {
    const id = address.trim().toUpperCase();
    return isStellarAccountAddress(id)
      ? `https://horizon.stellar.org/accounts/${encodeURIComponent(id)}` : null;
  }
  if (network !== "aptos") return null;
  const id = normalizeAptosAddress(address);
  return id ? `https://api.mainnet.aptoslabs.com/v1/accounts/${encodeURIComponent(id)}` : null;
}

export async function verifyNativeAccount(
  network: NativeAccountNetwork,
  address: string,
  request: typeof fetch = fetch
): Promise<NativeAccountEvidence> {
  if (network === "solana" || network === "tron" || network === "sui") {
    return verifyWave2Account(network as Wave2AccountNetwork, address, request);
  }
  const unavailable: NativeAccountEvidence = { network, status: "unavailable" };
  const url = lookupUrl(network, address);
  if (!url) return unavailable;
  const provider = network === "hedera" ? "hedera-mirror-public" :
    network === "stellar" ? "stellar-horizon" : "aptos-labs";
  try {
    const response = await providerUsageFetch(
      { provider, operation: "native.account_lookup" },
      url,
      () => request(url, {
        method: "GET", headers: { accept: "application/json" },
        redirect: "error", cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    );
    if (response.status === 404) return { network, status: "not_observed" };
    if (response.status !== 200 || !response.ok) return unavailable;
    const size = Number(response.headers.get("content-length"));
    if (Number.isFinite(size) && size > MAX_RESPONSE_CHARS) return unavailable;
    const raw = await response.text();
    if (raw.length > MAX_RESPONSE_CHARS) return unavailable;
    const body: unknown = JSON.parse(raw);
    return validateNativeAccountPayload(network, address, body)
      ? { network, status: "observed" }
      : unavailable;
  } catch {
    // Neither transport failures nor malformed responses establish absence.
    return unavailable;
  }
}

export async function verifyNativeCandidates(
  candidates: readonly NetworkId[],
  address: string,
  request: typeof fetch = fetch
): Promise<NativeAccountEvidence[]> {
  const supported = [...new Set(candidates)].filter(isNativeAccountNetwork);
  return Promise.all(supported.map(network => verifyNativeAccount(network, address, request)));
}

export function validNativeEvidenceCache(
  value: unknown,
  candidates: readonly NetworkId[]
): value is NativeAccountEvidence[] {
  if (!Array.isArray(value)) return false;
  const expected = candidates.filter(isNativeAccountNetwork);
  return value.length === expected.length &&
    value.every((item: unknown, index: number) => {
      const row = record(item);
      return row?.network === expected[index] &&
        (row.status === "observed" || row.status === "not_observed");
    });
}
