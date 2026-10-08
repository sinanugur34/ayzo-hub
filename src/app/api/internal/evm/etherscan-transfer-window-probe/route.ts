import { isInternalApiRequest } from "@/lib/apiSecurity";
import { isGoldRushExitCanaryActive } from "@/lib/goldRushExitCanary";
import { probeEtherscanTransferWindow } from "@/lib/intelligence/evm/providers/etherscanTransferWindowProbe";
import { readJsonObjectBody } from "@/lib/requestBody";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!isInternalApiRequest(request)) return Response.json({ok:false,code:"FORBIDDEN"},{status:403});
  if (!isGoldRushExitCanaryActive()) return Response.json({ok:false,code:"DISABLED"},{status:404});
  const body = await readJsonObjectBody(request);
  if (!body.ok) return body.response;
  const network = body.body.network;
  if (network !== "sonic" && network !== "mantle") {
    return Response.json({ok:false,code:"INVALID_NETWORK"},{status:400});
  }
  const result = await probeEtherscanTransferWindow(network, {signal:request.signal});
  // Diagnostic HTTP 200 does not imply product-level transfer parity.
  const observational = result.outcome === "EVENT_WITH_LOG_INDEX" ||
    result.outcome === "EVENT_MISSING_LOG_INDEX" || result.outcome === "EMPTY_WINDOW";
  return Response.json(
    {ok:result.outcome === "EVENT_WITH_LOG_INDEX", ...result},
    {status:observational ? 200 : result.outcome === "RATE_LIMITED" ? 429 :
      result.outcome === "TIMEOUT" ? 504 : 502,
      headers:{"Cache-Control":"no-store"}},
  );
}
