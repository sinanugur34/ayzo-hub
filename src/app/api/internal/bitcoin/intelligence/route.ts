import {
  isInternalApiRequest,
} from "@/lib/apiSecurity";

import {
  isBitcoinMainnetAddress,
} from "@/lib/intelligence/bitcoin/address";

import {
  runBitcoinIntelligence,
} from "@/lib/intelligence/bitcoin/engine";

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
        ok:
          false,

        error:
          "Forbidden.",
      },
      {
        status:
          403,
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
    !isBitcoinMainnetAddress(
      address
    )
  ) {
    return Response.json(
      {
        ok:
          false,

        code:
          "INVALID_ADDRESS",

        error:
          "Invalid Bitcoin address.",

        network:
          "bitcoin",
      },
      {
        status:
          400,
      }
    );
  }

  const result =
    await runBitcoinIntelligence({
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
