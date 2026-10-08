import { createHmac } from "node:crypto";
import { Redis } from "@upstash/redis";
import { getInternalApiKey } from "@/lib/apiSecurity";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { redisRuntimePrefix } from "@/lib/redisRuntimeNamespace";
import { readJsonObjectBody } from "@/lib/requestBody";
import {
  DISCOVERY_NETWORKS,
  scanEvmContractNetworks,
  type EvmContractDiscoveryResult,
} from "@/lib/networks/evmContractDiscovery";
import {
  EVM_ACCOUNT_SHAPE,
  detectNativeCandidates,
  uncoveredLiveNetworks,
} from "@/lib/networks/smartNetworkDetection";
import type { NetworkId } from "@/lib/networks/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;
const HEADERS = { "Cache-Control": "no-store" };
const MAX_AGE_SECONDS = 1_800;
let redisClient: Redis | null = null;

function redis(): Redis {
  if (redisClient) return redisClient;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("CACHE_NOT_CONFIGURED");
  redisClient = new Redis({ url, token });
  return redisClient;
}

function error(status: number, code: string): Response {
  return Response.json({ ok: false, code }, { status, headers: HEADERS });
}

function verifiedCache(value: unknown): value is EvmContractDiscoveryResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const o = value as Partial<EvmContractDiscoveryResult>;
  if (!Array.isArray(o.candidates) || o.evidence !== "eth_getCode" ||
      o.checked !== DISCOVERY_NETWORKS.length || o.total !== DISCOVERY_NETWORKS.length ||
      !["single", "multiple", "none"].includes(String(o.status))) return false;
  const matches = o.candidates;
  if (matches.some(id => !DISCOVERY_NETWORKS.includes(id)) ||
      new Set(matches).size !== matches.length) return false;
  return o.status === "single" ? matches.length === 1 :
    o.status === "multiple" ? matches.length > 1 : matches.length === 0;
}

function formatResult(candidates: NetworkId[]) {
  const status = candidates.length === 1 ? "single" :
    candidates.length > 1 ? "multiple" : "none";
  return {
    ok: true,
    status,
    network: candidates.length === 1 ? candidates[0] : null,
    candidates,
    verification: "validated_format",
    checked: 0,
    total: 0,
  };
}

function contractResult(result: EvmContractDiscoveryResult) {
  return {
    ok: true,
    status: result.status,
    network: result.status === "single" ? result.candidates[0] : null,
    candidates: result.candidates,
    verification: "contract_bytecode",
    checked: result.checked,
    total: result.total,
  };
}

export async function POST(request: Request): Promise<Response> {
  const parsed = await readJsonObjectBody(request, 512);
  if (!parsed.ok) return parsed.response;
  const raw = parsed.body.address;
  if (typeof raw !== "string" || !raw.trim() || raw.trim().length > 128) {
    return error(400, "INVALID_ADDRESS");
  }
  const address = raw.trim();

  try {
    // Fail closed on configuration gaps, including future live networks.
    if (uncoveredLiveNetworks().length) return error(503, "DETECTION_COVERAGE_INCOMPLETE");
    const perIp = await checkRateLimit({
      key: `smart-network-v1:${getClientIp(request)}`,
      limit: 18,
      windowMs: 60_000,
    });
    if (!perIp.allowed) return error(429, "RATE_LIMITED");

    if (!EVM_ACCOUNT_SHAPE.test(address)) {
      return Response.json(formatResult(detectNativeCandidates(address)), { headers: HEADERS });
    }

    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) return error(503, "PROVIDER_NOT_CONFIGURED");

    const cacheKey = `ayzo:${redisRuntimePrefix()}smart-network:v1:` +
      createHmac("sha256", getInternalApiKey())
        .update(address.toLowerCase()).digest("hex");
    const cached: unknown = await redis().get(cacheKey);
    if (verifiedCache(cached)) {
      return Response.json({ ...contractResult(cached), cache: "hit" }, { headers: HEADERS });
    }

    const global = await checkRateLimit({
      key: "smart-network-global-v1", limit: 80, windowMs: 3_600_000,
    });
    if (!global.allowed) return error(429, "GLOBAL_BUDGET_EXHAUSTED");

    const result = await scanEvmContractNetworks(address, apiKey);
    if (result.status !== "partial") {
      await redis().set(cacheKey, result, { ex: MAX_AGE_SECONDS });
    }
    return Response.json({ ...contractResult(result), cache: "miss" }, { headers: HEADERS });
  } catch {
    return error(503, "DETECTION_UNAVAILABLE");
  }
}
