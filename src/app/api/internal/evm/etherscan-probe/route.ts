import { isInternalApiRequest } from "@/lib/apiSecurity";
import { isGoldRushExitCanaryActive } from "@/lib/goldRushExitCanary";
import {
  probeEtherscanNetwork,
  type EtherscanProbeNetwork,
} from "@/lib/intelligence/evm/providers/etherscanProbe";
import { readJsonObjectBody } from "@/lib/requestBody";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!isInternalApiRequest(request)) {
    return Response.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
  }
  // This route is impossible to activate on Vercel Production.
  if (!isGoldRushExitCanaryActive()) {
    return Response.json({ ok: false, code: "DISABLED" }, { status: 404 });
  }
  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const raw: unknown = parsed.body.network;
  if (raw !== "ethereum" && raw !== "sonic" && raw !== "mantle") {
    return Response.json({ ok: false, code: "INVALID_NETWORK" }, { status: 400 });
  }
  const result = await probeEtherscanNetwork(raw as EtherscanProbeNetwork);
  return Response.json(
    { ok: result.outcome === "AVAILABLE", ...result },
    { status: result.outcome === "AVAILABLE" ? 200 : result.outcome === "RATE_LIMITED" ? 429 :
        result.outcome === "TIMEOUT" ? 504 : 502,
      headers: { "Cache-Control": "no-store" } },
  );
}
