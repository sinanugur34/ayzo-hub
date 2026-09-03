import {
  isInternalApiRequest,
} from "@/lib/apiSecurity";

import {
  getEvmNetworkContext,
} from "@/lib/intelligence/evm/engine";

import {
  goldRushTransfersProvider,
} from "@/lib/intelligence/evm/providers/goldrushTransfers";

import {
  analyzeEvmWalletRelationships,
  ERC20_TRANSFER_ONLY_RELATIONSHIP_COVERAGE,
  evmTransfersToRelationshipObservations,
} from "@/lib/intelligence/evm/walletRelationships";

import {
  isNetworkId,
} from "@/lib/networks/registry";

import {
  readJsonObjectBody,
} from "@/lib/requestBody";

function isSafeDecimal(
  value: string
): boolean {
  if (!/^\d+$/.test(value)) {
    return false;
  }

  const parsed =
    Number(value);

  return (
    Number.isSafeInteger(parsed) &&
    parsed >= 0
  );
}

function isTransferCursor(
  value: string
): boolean {
  if (isSafeDecimal(value)) {
    return true;
  }

  const match =
    /^(?:wallet|events):(\d+):(\d+)$/.exec(
      value
    );

  return (
    match !== null &&
    isSafeDecimal(match[1]) &&
    isSafeDecimal(match[2])
  );
}

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

  const tokenAddress =
    typeof body.tokenAddress ===
      "string"
      ? body.tokenAddress.trim()
      : "";

  const limit =
    body.limit === undefined
      ? 100
      : body.limit;

  const cursor =
    body.cursor === undefined ||
    body.cursor === null
      ? null
      : typeof body.cursor ===
          "string"
        ? body.cursor.trim()
        : "__INVALID__";

  if (!isNetworkId(networkId)) {
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

  if (limit !== 100) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_LIMIT",
        error:
          "Relationship transfer limit must be 100.",
      },
      { status: 400 }
    );
  }

  if (
    cursor ===
      "__INVALID__" ||
    (
      cursor !== null &&
      !isTransferCursor(
        cursor
      )
    )
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_CURSOR",
        error:
          "Invalid relationship transfer cursor.",
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

  const transferResult =
    await goldRushTransfersProvider
      .getTokenTransfers({
        network,
        address,
        tokenAddress,
        limit,
        cursor,
      });

  if (!transferResult.ok) {
    const status =
      transferResult.code ===
          "INVALID_ADDRESS" ||
        transferResult.code ===
          "INVALID_TOKEN_ADDRESS"
        ? 400
        : transferResult.code ===
            "RATE_LIMITED"
          ? 429
          : transferResult.code ===
              "TIMEOUT"
            ? 504
            : 502;

    return Response.json(
      {
        ok: false,
        network: networkId,
        provider:
          goldRushTransfersProvider.id,
        result:
          transferResult,
      },
      { status }
    );
  }

  const intelligence =
    analyzeEvmWalletRelationships({
      walletAddress: address,

      observations:
        evmTransfersToRelationshipObservations(
          transferResult.data
            .transfers
        ),

      coverage:
        ERC20_TRANSFER_ONLY_RELATIONSHIP_COVERAGE,
    });

  return Response.json({
    ok: true,
    network: networkId,
    provider:
      goldRushTransfersProvider.id,

    coverage: {
      analyzedTransferCount:
        transferResult.data
          .transfers.length,
      nextCursor:
        transferResult.data
          .nextCursor,
    },

    intelligence,
  });
}
