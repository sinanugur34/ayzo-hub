import {
  isInternalApiRequest,
} from "@/lib/apiSecurity";

import {
  isSuiAddress,
} from "@/lib/intelligence/sui/address";

import {
  runSuiIntelligence,
} from "@/lib/intelligence/sui/engine";

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
    !isSuiAddress(
      address
    )
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_ADDRESS",
        error:
          "Invalid Sui address.",
        network:
          "sui",
      },
      {
        status: 400,
      }
    );
  }

  const result =
    await runSuiIntelligence({
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
