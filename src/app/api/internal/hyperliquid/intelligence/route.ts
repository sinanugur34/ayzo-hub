import { isLocalDevelopmentSmokeRequest } from "@/lib/internalSmokeSecurity";
import {
  isInternalApiRequest,
} from "@/lib/apiSecurity";

import {
  isHyperliquidAddress,
} from "@/lib/intelligence/hyperliquid/address";

import {
  runHyperliquidIntelligence,
} from "@/lib/intelligence/hyperliquid/engine";

import {
  readJsonObjectBody,
} from "@/lib/requestBody";

export async function POST(
  request: Request
) {
  const isDevelopmentTestRequest = isLocalDevelopmentSmokeRequest(request);

  if (
    !isDevelopmentTestRequest &&
    !isInternalApiRequest(request)
  ) {
    return Response.json(
      {
        ok: false,
        error: "Forbidden.",
      },
      {
        status: 403,
      }
    );
  }

  const parsedBody =
    await readJsonObjectBody(
      request
    );

  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const address =
    typeof parsedBody
      .body
      .address ===
      "string"
      ? parsedBody
          .body
          .address
          .trim()
      : "";

  if (
    !isHyperliquidAddress(
      address
    )
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_ADDRESS",
        error:
          "Invalid Hyperliquid address.",
        network:
          "hyperliquid",
      },
      {
        status: 400,
      }
    );
  }

  const result =
    await runHyperliquidIntelligence({
      address,
    });

  return Response.json(
    result.data,
    {
      status:
        result.status,
    }
  );
}
