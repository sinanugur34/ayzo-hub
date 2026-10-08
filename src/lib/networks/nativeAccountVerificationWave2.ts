import { isAddress as isSolanaAddress } from "@solana/kit";
import { providerUsageFetch } from "@/lib/providerUsageHttpCore";
import { isTronAddress, tronAddressToHex } from "@/lib/intelligence/tron/address";
import { normalizeSuiAddress } from "@/lib/intelligence/sui/address";

/** Network-specific account/activity evidence; absence is never a wrong-chain verdict. */
export const WAVE2_ACCOUNT_NETWORKS = ["solana", "tron", "sui"] as const;
export type Wave2AccountNetwork = typeof WAVE2_ACCOUNT_NETWORKS[number];
export type Wave2Status = "observed" | "not_observed" | "unavailable";
export type Wave2Evidence = { network: Wave2AccountNetwork; status: Wave2Status };
export type Wave2Keys = { alchemy?: string; helius?: string; tronGrid?: string };

const TIMEOUT_MS = 4_500;
const MAX_BODY_CHARS = 16_384;
const SUI_GRAPHQL = "https://graphql.mainnet.sui.io/graphql";
const TRONGRID = "https://api.trongrid.io";
const SUI_QUERY = `query AyzoAccountPresence($address: SuiAddress!) {
  chainIdentifier
  subject: address(address: $address) {
    address
    objects(first: 1) { nodes { address } }
    recentTransactions: transactions(last: 1, relation: AFFECTED) {
      nodes { digest }
    }
  }
}`;

type Row = Record<string, unknown>;
function row(x: unknown): Row | null {
  return typeof x === "object" && x !== null && !Array.isArray(x) ? x as Row : null;
}
function nodes(x: unknown): unknown[] | null {
  const items = row(x)?.nodes;
  return Array.isArray(items) ? items : null;
}

/** Strong current Solana account-state proof, never address ownership proof. */
export function solanaAccountStatus(payload: unknown): Wave2Status {
  const root = row(payload);
  if (!root || root.jsonrpc !== "2.0" || root.error !== undefined) return "unavailable";
  const result = row(root.result);
  const context = row(result?.context);
  if (!context || !Number.isSafeInteger(context.slot) || Number(context.slot) < 1) return "unavailable";
  if (result?.value === null) return "not_observed";
  const account = row(result?.value);
  if (!account || typeof account.owner !== "string" || !isSolanaAddress(account.owner) ||
      typeof account.lamports !== "number" || !Number.isSafeInteger(account.lamports) ||
      account.lamports < 0 || typeof account.executable !== "boolean") return "unavailable";
  return "observed";
}

/** TronGrid v1 account endpoint may return a successful, empty data array. */
export function tronAccountStatus(payload: unknown, address: string): Wave2Status {
  const root = row(payload);
  if (!root || root.success !== true || !Array.isArray(root.data)) return "unavailable";
  if (root.data.length === 0) return "not_observed";
  if (root.data.length !== 1) return "unavailable";
  const account = row(root.data[0]);
  const value = account?.address;
  const expectedHex = tronAddressToHex(address);
  if (typeof value !== "string" || !expectedHex) return "unavailable";
  const same = value === address || value.toLowerCase().replace(/^0x/, "") === expectedHex;
  return same ? "observed" : "unavailable";
}

/** Sui accounts are stateless. Evidence means object ownership or recorded activity. */
export function suiActivityStatus(payload: unknown, address: string): Wave2Status {
  const root = row(payload);
  if (!root || root.errors !== undefined) return "unavailable";
  const data = row(root.data);
  if (!data || typeof data.chainIdentifier !== "string" || data.chainIdentifier.length < 4) {
    return "unavailable";
  }
  const subject = row(data.subject);
  const normalized = normalizeSuiAddress(address);
  if (!subject || !normalized || typeof subject.address !== "string" ||
      normalizeSuiAddress(subject.address) !== normalized) return "unavailable";
  const objects = nodes(subject.objects);
  const txs = nodes(subject.recentTransactions);
  if (!objects || !txs) return "unavailable";
  // An owned object or a confirmed digest is positive on-chain evidence.
  const objectFound = objects.some(item => {
    const objectId = row(item)?.address;
    return typeof objectId === "string" && normalizeSuiAddress(objectId) !== null;
  });
  const txFound = txs.some(item => {
    const digest = row(item)?.digest;
    return typeof digest === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,64}$/.test(digest);
  });
  if (objectFound || txFound) return "observed";
  // An empty sample is not proof of a nonexistent Sui address.
  return objects.length === 0 && txs.length === 0 ? "not_observed" : "unavailable";
}

async function readProviderJson(
  request: typeof fetch,
  provider: string,
  url: string,
  init: RequestInit
): Promise<unknown | null> {
  try {
    const result = await providerUsageFetch(
      { provider, operation: "native.account_lookup" }, url,
      () => request(url, {
        ...init, redirect: "error", cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    );
    if (result.status !== 200 || !result.ok) return null;
    const declaredSize = result.headers.get("content-length");
    if (declaredSize !== null && Number(declaredSize) > MAX_BODY_CHARS) return null;
    const text = await result.text();
    if (text.length > MAX_BODY_CHARS) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** No user-controlled provider base URLs and no client-side credentials. */
export async function verifyWave2Account(
  network: Wave2AccountNetwork,
  address: string,
  request: typeof fetch = fetch,
  keys: Wave2Keys = {
    alchemy: process.env.ALCHEMY_API_KEY,
    helius: process.env.HELIUS_API_KEY,
    tronGrid: process.env.TRONGRID_API_KEY,
  }
): Promise<Wave2Evidence> {
  const evidence = (status: Wave2Status): Wave2Evidence => ({ network, status });
  if (network === "solana") {
    if (!isSolanaAddress(address)) return evidence("unavailable");
    const endpoints = [
      ...(keys.alchemy?.trim() ? [{
        provider: "alchemy", url: "https://solana-mainnet.g.alchemy.com/v2/" +
          encodeURIComponent(keys.alchemy.trim()),
      }] : []),
      ...(keys.helius?.trim() ? [{
        provider: "helius", url: "https://mainnet.helius-rpc.com/?api-key=" +
          encodeURIComponent(keys.helius.trim()),
      }] : []),
    ];
    for (const source of endpoints) {
      const payload = await readProviderJson(request, source.provider, source.url, {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "getAccountInfo",
          params: [address, {
            encoding: "base64", commitment: "finalized",
            dataSlice: { offset: 0, length: 0 },
          }],
        }),
      });
      const status = solanaAccountStatus(payload);
      if (status !== "unavailable") return evidence(status);
    }
    return evidence("unavailable");
  }

  if (network === "tron") {
    if (!isTronAddress(address) || !keys.tronGrid?.trim()) return evidence("unavailable");
    const payload = await readProviderJson(
      request, "trongrid", `${TRONGRID}/v1/accounts/${encodeURIComponent(address)}`, {
        method: "GET",
        headers: { accept: "application/json", "TRON-PRO-API-KEY": keys.tronGrid.trim() },
      }
    );
    return evidence(tronAccountStatus(payload, address));
  }

  const normalized = normalizeSuiAddress(address);
  if (!normalized) return evidence("unavailable");
  const payload = await readProviderJson(request, "sui-graphql", SUI_GRAPHQL, {
    method: "POST", headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ query: SUI_QUERY, variables: { address: normalized } }),
  });
  return evidence(suiActivityStatus(payload, normalized));
}
