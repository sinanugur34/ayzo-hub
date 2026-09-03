import {
  isInternalApiRequest,
} from "@/lib/apiSecurity";

import {
  runEvmUnifiedIntelligence,
} from "@/lib/intelligence/evm/unifiedOrchestrator";

import {
  isNetworkId,
} from "@/lib/networks/registry";

import {
  readJsonObjectBody,
} from "@/lib/requestBody";

export async function POST(
  request: Request
) {
  const isDevelopmentTestRequest =
    process.env.NODE_ENV !==
      "production" &&
    request.headers.get(
      "x-ayzo-test-request"
    ) === "smoke";

  if (
    !isDevelopmentTestRequest &&
    !isInternalApiRequest(
      request
    )
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Forbidden.",
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

  const body =
    parsedBody.body;

  const networkId =
    typeof body.network ===
      "string"
      ? body.network
          .trim()
          .toLowerCase()
      : "";

  const address =
    typeof body.address ===
      "string"
      ? body.address.trim()
      : "";

  if (!isNetworkId(networkId)) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_NETWORK",
        error:
          "Unsupported network.",
      },
      {
        status: 400,
      }
    );
  }

  const result =
    await runEvmUnifiedIntelligence({
      networkId,
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
