import {
  isInternalApiRequest,
} from "@/lib/apiSecurity";

import {
  isDogecoinMainnetAddress,
} from "@/lib/intelligence/dogecoin/address";

import {
  runDogecoinIntelligence,
} from "@/lib/intelligence/dogecoin/engine";

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
    !isDogecoinMainnetAddress(
      address
    )
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_ADDRESS",
        error:
          "Invalid Dogecoin address.",
        network:
          "dogecoin",
      },
      {
        status: 400,
      }
    );
  }

  const result =
    await runDogecoinIntelligence({
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
