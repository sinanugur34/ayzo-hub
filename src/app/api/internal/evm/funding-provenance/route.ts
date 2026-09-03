import {
  isInternalApiRequest,
} from "@/lib/apiSecurity";

import {
  getEvmNetworkContext,
} from "@/lib/intelligence/evm/engine";

import {
  analyzeEvmFundingProvenance,
  evmTransactionsToFundingObservations,
  evmTransfersToFundingObservations,
  FULL_FUNDING_COVERAGE,
  TRANSACTION_ONLY_FUNDING_COVERAGE,
  type EvmFundingObservation,
} from "@/lib/intelligence/evm/fundingProvenance";

import {
  goldRushTransactionsProvider,
} from "@/lib/intelligence/evm/providers/goldrushTransactions";

import {
  goldRushTransfersProvider,
} from "@/lib/intelligence/evm/providers/goldrushTransfers";

import {
  isNetworkId,
} from "@/lib/networks/registry";

import {
  readJsonObjectBody,
} from "@/lib/requestBody";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

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

function providerStatus(
  code: string
): number {
  if (
    code === "INVALID_ADDRESS" ||
    code === "INVALID_TOKEN_ADDRESS"
  ) {
    return 400;
  }

  if (code === "RATE_LIMITED") {
    return 429;
  }

  if (code === "TIMEOUT") {
    return 504;
  }

  return 502;
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
      "string" &&
    body.tokenAddress.trim()
      ? body.tokenAddress.trim()
      : null;

  const transactionCursor =
    body.transactionCursor ===
        undefined ||
      body.transactionCursor === null
      ? null
      : typeof body.transactionCursor ===
          "string"
        ? body.transactionCursor.trim()
        : "__INVALID__";

  const transferCursor =
    body.transferCursor ===
        undefined ||
      body.transferCursor === null
      ? null
      : typeof body.transferCursor ===
          "string"
        ? body.transferCursor.trim()
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

  if (!EVM_ADDRESS.test(address)) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_ADDRESS",
        error:
          "Invalid EVM address.",
      },
      { status: 400 }
    );
  }

  if (
    tokenAddress !== null &&
    !EVM_ADDRESS.test(
      tokenAddress
    )
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_TOKEN_ADDRESS",
        error:
          "Invalid EVM token address.",
      },
      { status: 400 }
    );
  }

  if (
    transactionCursor ===
      "__INVALID__" ||
    (
      transactionCursor !== null &&
      !isSafeDecimal(
        transactionCursor
      )
    )
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_TRANSACTION_CURSOR",
        error:
          "Invalid transaction cursor.",
      },
      { status: 400 }
    );
  }

  if (
    transferCursor ===
      "__INVALID__" ||
    (
      transferCursor !== null &&
      !isTransferCursor(
        transferCursor
      )
    )
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_TRANSFER_CURSOR",
        error:
          "Invalid transfer cursor.",
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

  const transactionResult =
    await goldRushTransactionsProvider
      .getTransactions({
        network,
        address,
        cursor:
          transactionCursor,
      });

  if (!transactionResult.ok) {
    return Response.json(
      {
        ok: false,
        network: networkId,
        provider:
          goldRushTransactionsProvider.id,
        result:
          transactionResult,
      },
      {
        status:
          providerStatus(
            transactionResult.code
          ),
      }
    );
  }

  const observations:
    EvmFundingObservation[] = [
    ...evmTransactionsToFundingObservations(
      transactionResult.data
        .transactions
    ),
  ];

  let transferCount = 0;
  let nextTransferCursor:
    string | null = null;

  if (tokenAddress !== null) {
    const transferResult =
      await goldRushTransfersProvider
        .getTokenTransfers({
          network,
          address,
          tokenAddress,
          limit: 100,
          cursor:
            transferCursor,
        });

    if (!transferResult.ok) {
      return Response.json(
        {
          ok: false,
          network:
            networkId,
          provider:
            goldRushTransfersProvider.id,
          result:
            transferResult,
        },
        {
          status:
            providerStatus(
              transferResult.code
            ),
        }
      );
    }

    observations.push(
      ...evmTransfersToFundingObservations(
        transferResult.data
          .transfers
      )
    );

    transferCount =
      transferResult.data
        .transfers.length;

    nextTransferCursor =
      transferResult.data
        .nextCursor;
  }

  const coverage =
    tokenAddress === null
      ? TRANSACTION_ONLY_FUNDING_COVERAGE
      : FULL_FUNDING_COVERAGE;

  const intelligence =
    analyzeEvmFundingProvenance({
      walletAddress:
        address,
      observations,
      coverage,
    });

  return Response.json({
    ok: true,
    network:
      networkId,

    providers: {
      transactions:
        goldRushTransactionsProvider.id,
      transfers:
        tokenAddress === null
          ? null
          : goldRushTransfersProvider.id,
    },

    coverage: {
      analyzedTransactionCount:
        transactionResult.data
          .transactions.length,

      analyzedTransferCount:
        transferCount,

      tokenAddress,

      nextTransactionCursor:
        transactionResult.data
          .nextCursor,

      nextTransferCursor,
    },

    intelligence,
  });
}
