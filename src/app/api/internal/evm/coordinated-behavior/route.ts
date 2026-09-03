import {
  isInternalApiRequest,
} from "@/lib/apiSecurity";

import {
  analyzeEvmCoordinatedWalletBehavior,
  evmTransactionsToCoordinationObservations,
  evmTransfersToCoordinationObservations,
  type EvmCoordinationCoverage,
  type EvmCoordinationObservation,
} from "@/lib/intelligence/evm/coordinatedWalletBehavior";

import {
  getEvmNetworkContext,
} from "@/lib/intelligence/evm/engine";

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

const MIN_WALLETS = 2;
const MAX_WALLETS = 5;

const DEFAULT_TRANSACTION_PAGES =
  1;

const MAX_TRANSACTION_PAGES =
  3;

const DEFAULT_TRANSFER_PAGES =
  1;

const MAX_TRANSFER_PAGES =
  2;

function providerStatus(
  code: string
): number {
  if (
    code === "INVALID_ADDRESS" ||
    code ===
      "INVALID_TOKEN_ADDRESS"
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

function parseBoundedInteger(
  value: unknown,
  defaultValue: number,
  maximum: number
): number | null {
  if (value === undefined) {
    return defaultValue;
  }

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > maximum
  ) {
    return null;
  }

  return value;
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

  if (
    !Array.isArray(
      body.walletAddresses
    )
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_WALLETS",
        error:
          "walletAddresses must be an array.",
      },
      { status: 400 }
    );
  }

  const normalizedWallets =
    body.walletAddresses
      .map(
        value =>
          typeof value ===
            "string"
            ? value
                .trim()
                .toLowerCase()
            : null
      );

  if (
    normalizedWallets.some(
      wallet =>
        wallet === null ||
        !EVM_ADDRESS.test(
          wallet
        )
    )
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_WALLETS",
        error:
          "Every wallet must be a valid EVM address.",
      },
      { status: 400 }
    );
  }

  const wallets =
    [
      ...new Set(
        normalizedWallets as
          string[]
      ),
    ].sort();

  if (
    wallets.length <
      MIN_WALLETS ||
    wallets.length >
      MAX_WALLETS
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_WALLET_COUNT",
        error:
          `Expected between ${MIN_WALLETS} and ${MAX_WALLETS} unique wallets.`,
      },
      { status: 400 }
    );
  }

  const tokenAddress =
    body.tokenAddress ===
        undefined ||
      body.tokenAddress ===
        null ||
      body.tokenAddress ===
        ""
      ? null
      : typeof body.tokenAddress ===
          "string"
        ? body.tokenAddress
            .trim()
            .toLowerCase()
        : "__INVALID__";

  if (
    tokenAddress ===
      "__INVALID__" ||
    (
      tokenAddress !== null &&
      !EVM_ADDRESS.test(
        tokenAddress
      )
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

  const transactionPages =
    parseBoundedInteger(
      body.transactionPages,
      DEFAULT_TRANSACTION_PAGES,
      MAX_TRANSACTION_PAGES
    );

  if (
    transactionPages ===
      null
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_TRANSACTION_PAGES",
        error:
          `transactionPages must be an integer between 1 and ${MAX_TRANSACTION_PAGES}.`,
      },
      { status: 400 }
    );
  }

  const transferPages =
    parseBoundedInteger(
      body.transferPages,
      DEFAULT_TRANSFER_PAGES,
      MAX_TRANSFER_PAGES
    );

  if (
    transferPages === null
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_TRANSFER_PAGES",
        error:
          `transferPages must be an integer between 1 and ${MAX_TRANSFER_PAGES}.`,
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

  const observations:
    EvmCoordinationObservation[] =
      [];

  const walletScans = [];

  for (
    const wallet of wallets
  ) {
    let transactionCursor:
      string | null = null;

    let transactionPageCount =
      0;

    let observedTransactionCount =
      0;

    let transactionHistoryExhausted =
      false;

    for (
      let page = 0;
      page <
        transactionPages;
      page += 1
    ) {
      const result =
        await goldRushTransactionsProvider
          .getTransactions({
            network,
            address:
              wallet,
            cursor:
              transactionCursor,
          });

      if (!result.ok) {
        return Response.json(
          {
            ok: false,
            network:
              networkId,
            wallet,
            provider:
              goldRushTransactionsProvider.id,
            result,
          },
          {
            status:
              providerStatus(
                result.code
              ),
          }
        );
      }

      transactionPageCount +=
        1;

      observedTransactionCount +=
        result.data
          .transactions.length;

      observations.push(
        ...evmTransactionsToCoordinationObservations(
          result.data
            .transactions
        )
      );

      transactionCursor =
        result.data
          .nextCursor;

      if (
        transactionCursor ===
          null
      ) {
        transactionHistoryExhausted =
          true;
        break;
      }
    }

    let transferCursor:
      string | null = null;

    let transferPageCount =
      0;

    let observedTransferCount =
      0;

    let transferHistoryExhausted =
      tokenAddress === null;

    if (
      tokenAddress !== null
    ) {
      for (
        let page = 0;
        page <
          transferPages;
        page += 1
      ) {
        const result =
          await goldRushTransfersProvider
            .getTokenTransfers({
              network,
              address:
                wallet,
              tokenAddress,
              limit:
                100,
              cursor:
                transferCursor,
            });

        if (!result.ok) {
          return Response.json(
            {
              ok: false,
              network:
                networkId,
              wallet,
              provider:
                goldRushTransfersProvider.id,
              result,
            },
            {
              status:
                providerStatus(
                  result.code
                ),
            }
          );
        }

        transferPageCount +=
          1;

        observedTransferCount +=
          result.data
            .transfers.length;

        observations.push(
          ...evmTransfersToCoordinationObservations(
            result.data
              .transfers
          )
        );

        transferCursor =
          result.data
            .nextCursor;

        if (
          transferCursor ===
            null
        ) {
          transferHistoryExhausted =
            true;
          break;
        }
      }
    }

    walletScans.push({
      wallet,

      transactions: {
        pages:
          transactionPageCount,

        observed:
          observedTransactionCount,

        exhausted:
          transactionHistoryExhausted,

        nextCursor:
          transactionCursor,
      },

      transfers: {
        enabled:
          tokenAddress !== null,

        tokenAddress,

        pages:
          transferPageCount,

        observed:
          observedTransferCount,

        exhausted:
          transferHistoryExhausted,

        nextCursor:
          transferCursor,
      },
    });
  }

  const limitationParts = [
    "Coordination signals describe observed on-chain relationships and do not establish common ownership, identity, intent, or control.",
    "Temporal-correlation scoring is not included in this phase.",
    `Transaction evidence is bounded to at most ${transactionPages} page(s) per wallet for this request.`,
  ];

  if (
    tokenAddress === null
  ) {
    limitationParts.push(
      "ERC-20 transfer and shared-token activity evidence was not requested."
    );
  } else {
    limitationParts.push(
      `ERC-20 evidence is limited to token ${tokenAddress} and at most ${transferPages} transfer page(s) per wallet.`
    );
  }

  const coverage:
    EvmCoordinationCoverage = {
    includesEvmTransactions:
      true,

    includesErc20Transfers:
      tokenAddress !== null,

    includesSharedFunding:
      true,

    includesSharedCounterparties:
      true,

    includesDirectInteractions:
      true,

    includesSameTransaction:
      true,

    includesSharedTokenActivity:
      tokenAddress !== null,

    includesTemporalCorrelation:
      false,

    includesOwnershipInference:
      false,

    limitation:
      limitationParts.join(
        " "
      ),
  };

  const intelligence =
    analyzeEvmCoordinatedWalletBehavior({
      walletAddresses:
        wallets,

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

    request: {
      wallets,

      tokenAddress,

      transactionPages,

      transferPages:
        tokenAddress === null
          ? 0
          : transferPages,
    },

    scan: {
      rawObservationCount:
        observations.length,

      wallets:
        walletScans,
    },

    intelligence,
  });
}
