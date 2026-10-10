import { isInternalApiRequest } from "@/lib/apiSecurity";
import { isGoldRushExitCanaryActive } from "@/lib/goldRushExitCanary";
import { probeEtherscanLogCorrelation } from "@/lib/intelligence/evm/providers/etherscanLogCorrelationProbe";
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
  const result = await probeEtherscanLogCorrelation(network,{signal:request.signal});
  return Response.json({ok:result.outcome === "MATCHED_SINGLE_LOG",...result}, {
    status:result.outcome === "MATCHED_SINGLE_LOG" ? 200 :
      result.outcome === "RATE_LIMITED" ? 429 : result.outcome === "TIMEOUT" ? 504 : 502,
    headers:{"Cache-Control":"no-store"},
  });
}
