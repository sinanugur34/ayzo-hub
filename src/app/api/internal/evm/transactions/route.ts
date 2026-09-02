import {
  isInternalApiRequest,
} from "@/lib/apiSecurity";

import {
  getEvmNetworkContext,
} from "@/lib/intelligence/evm/engine";

import {
  goldRushTransactionsProvider,
} from "@/lib/intelligence/evm/providers/goldrushTransactions";

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
        error: "Forbidden.",
      },
      { status: 403 }
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

  const cursor =
    body.cursor === undefined ||
    body.cursor === null
      ? null
      : typeof body.cursor ===
          "string"
        ? body.cursor.trim()
        : "__INVALID__";

  if (
    !isNetworkId(
      networkId
    )
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_NETWORK",
        error:
          "Unsupported network.",
      },
      { status: 400 }
    );
  }

  if (
    cursor ===
      "__INVALID__" ||
    (
      cursor !== null &&
      !/^\d+$/.test(cursor)
    )
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_CURSOR",
        error:
          "Transaction cursor must be a non-negative page number.",
      },
      { status: 400 }
    );
  }

  const network =
    getEvmNetworkContext(
      networkId
    );

  if (!network) {
    return Response.json(
      {
        ok: false,
        code:
          "UNSUPPORTED_NETWORK",
        error:
          "Network is not an EVM network.",
      },
      { status: 400 }
    );
  }

  const result =
    await goldRushTransactionsProvider
      .getTransactions({
        network,
        address,
        cursor,
      });

  const status =
    result.ok
      ? 200
      : result.code ===
          "INVALID_ADDRESS"
        ? 400
        : result.code ===
            "RATE_LIMITED"
          ? 429
          : result.code ===
              "TIMEOUT"
            ? 504
            : 502;

  return Response.json(
    {
      ok: result.ok,
      network: networkId,
      provider:
        goldRushTransactionsProvider.id,
      result,
    },
    { status }
  );
}
