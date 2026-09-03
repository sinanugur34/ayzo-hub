import {
  isInternalApiRequest,
} from "@/lib/apiSecurity";

import {
  analyzeEvmDeveloperHistory,
  type EvmDeveloperDeploymentObservation,
  type EvmDeveloperHistoryCoverage,
} from "@/lib/intelligence/evm/developerHistory";

import {
  getEvmNetworkContext,
} from "@/lib/intelligence/evm/engine";

import {
  alchemyEvmProvider,
} from "@/lib/intelligence/evm/providers/alchemy";

import {
  goldRushTransactionsProvider,
} from "@/lib/intelligence/evm/providers/goldrushTransactions";

import type {
  EvmTransaction,
} from "@/lib/intelligence/evm/types";

import {
  isNetworkId,
} from "@/lib/networks/registry";

import {
  readJsonObjectBody,
} from "@/lib/requestBody";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

const DEFAULT_MAX_PAGES = 3;
const MAX_MAX_PAGES = 5;

const RECEIPT_CHECK_LIMIT =
  12;

function providerStatus(
  code: string
): number {
  if (
    code ===
      "INVALID_ADDRESS" ||
    code ===
      "INVALID_TRANSACTION_HASH"
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

  const contractAddress =
    typeof body.contractAddress ===
      "string"
      ? body.contractAddress
          .trim()
          .toLowerCase()
      : "";

  const maxPages =
    body.maxPages === undefined
      ? DEFAULT_MAX_PAGES
      : body.maxPages;

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
    !EVM_ADDRESS.test(
      contractAddress
    )
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_ADDRESS",
        error:
          "Invalid EVM contract address.",
      },
      { status: 400 }
    );
  }

  if (
    typeof maxPages !==
      "number" ||
    !Number.isSafeInteger(
      maxPages
    ) ||
    maxPages < 1 ||
    maxPages >
      MAX_MAX_PAGES
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_MAX_PAGES",
        error:
          `maxPages must be an integer between 1 and ${MAX_MAX_PAGES}.`,
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

  const deploymentResult =
    await alchemyEvmProvider
      .getContractDeployment({
        network,
        address:
          contractAddress,
      });

  if (!deploymentResult.ok) {
    return Response.json(
      {
        ok: false,
        network:
          networkId,
        provider:
          alchemyEvmProvider.id,
        result:
          deploymentResult,
      },
      {
        status:
          providerStatus(
            deploymentResult.code
          ),
      }
    );
  }

  const target =
    deploymentResult.data;

  if (!target.isContract) {
    return Response.json({
      ok: true,
      network:
        networkId,
      targetDeployment:
        target,
      developerHistory:
        null,
      reason:
        "NOT_CONTRACT",
    });
  }

  if (!target.deployment) {
    return Response.json({
      ok: true,
      network:
        networkId,
      targetDeployment:
        target,
      developerHistory:
        null,
      reason:
        "DEPLOYMENT_EVIDENCE_NOT_COVERED",
    });
  }

  const deployerAddress =
    target.deployment
      .deployerAddress
      .toLowerCase();

  const transactions:
    EvmTransaction[] = [];

  let cursor:
    string | null = null;

  let scannedPages = 0;
  let historyExhausted =
    false;

  for (
    let page = 0;
    page < maxPages;
    page += 1
  ) {
    const result =
      await goldRushTransactionsProvider
        .getTransactions({
          network,
          address:
            deployerAddress,
          cursor,
        });

    if (!result.ok) {
      return Response.json(
        {
          ok: false,
          network:
            networkId,
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

    scannedPages += 1;

    transactions.push(
      ...result.data
        .transactions
    );

    cursor =
      result.data
        .nextCursor;

    if (cursor === null) {
      historyExhausted =
        true;
      break;
    }
  }

  const candidateByHash =
    new Map<
      string,
      EvmTransaction
    >();

  for (
    const transaction of
      transactions
  ) {
    const from =
      transaction.from
        ?.toLowerCase() ??
      null;

    if (
      from !==
        deployerAddress ||
      transaction.to !== null
    ) {
      continue;
    }

    candidateByHash.set(
      transaction.hash
        .toLowerCase(),
      transaction
    );
  }

  const candidates =
    [...candidateByHash.values()]
      .sort(
        (a, b) =>
          (
            a.blockNumber ??
            Number.MAX_SAFE_INTEGER
          ) -
            (
              b.blockNumber ??
              Number.MAX_SAFE_INTEGER
            ) ||
          a.hash.localeCompare(
            b.hash
          )
      );

  const receiptCheckLimited =
    candidates.length >
      RECEIPT_CHECK_LIMIT;

  const candidatesToCheck =
    candidates.slice(
      0,
      RECEIPT_CHECK_LIMIT
    );

  const observedDeployments:
    EvmDeveloperDeploymentObservation[] =
      [];

  let receiptVerificationFailureCount =
    0;

  for (
    const transaction of
      candidatesToCheck
  ) {
    const receiptResult =
      await alchemyEvmProvider
        .getTransactionReceipt({
          network,
          transactionHash:
            transaction.hash,
        });

    if (!receiptResult.ok) {
      if (
        receiptResult.code ===
          "RATE_LIMITED" ||
        receiptResult.code ===
          "TIMEOUT"
      ) {
        return Response.json(
          {
            ok: false,
            network:
              networkId,
            provider:
              alchemyEvmProvider.id,
            result:
              receiptResult,
          },
          {
            status:
              providerStatus(
                receiptResult.code
              ),
          }
        );
      }

      receiptVerificationFailureCount +=
        1;

      continue;
    }

    const receipt =
      receiptResult.data;

    if (
      receipt.success === false ||
      receipt.to !== null ||
      receipt.contractAddress ===
        null ||
      receipt.from
        .toLowerCase() !==
        deployerAddress
    ) {
      continue;
    }

    observedDeployments.push({
      contractAddress:
        receipt.contractAddress,

      deployerAddress:
        receipt.from,

      transactionHash:
        receipt.transactionHash,

      blockNumber:
        receipt.blockNumber,

      timestamp:
        transaction.timestamp,

      creationKind:
        "top_level_create",

      evidenceKind:
        "transaction_receipt",
    });
  }

  const limitationParts = [
    "Only top-level CREATE deployments verified by transaction receipts are included.",
    "Internal CREATE and CREATE2 deployments are not included because trace evidence is not yet enabled.",
  ];

  if (!historyExhausted) {
    limitationParts.push(
      `Developer transaction history was bounded to ${maxPages} GoldRush page(s); older activity may exist.`
    );
  }

  if (receiptCheckLimited) {
    limitationParts.push(
      `Only the first ${RECEIPT_CHECK_LIMIT} top-level creation candidates in the scanned window were receipt-verified.`
    );
  }

  if (
    receiptVerificationFailureCount >
      0
  ) {
    limitationParts.push(
      `${receiptVerificationFailureCount} candidate receipt verification request(s) failed and were excluded.`
    );
  }

  const coverage:
    EvmDeveloperHistoryCoverage = {
    transactionHistorySource:
      "goldrush_transactions_v3",

    requestedMaxPages:
      maxPages,

    scannedPages,

    historyExhausted,

    receiptCheckLimit:
      RECEIPT_CHECK_LIMIT,

    receiptCheckLimited,

    receiptVerificationFailureCount,

    includesTopLevelCreate:
      true,

    includesInternalCreate:
      false,

    includesCreate2:
      false,

    limitation:
      limitationParts.join(
        " "
      ),
  };

  const developerHistory =
    analyzeEvmDeveloperHistory({
      targetContractAddress:
        contractAddress,

      targetDeployment: {
        contractAddress:
          target.deployment
            .contractAddress,

        deployerAddress:
          target.deployment
            .deployerAddress,

        transactionHash:
          target.deployment
            .transactionHash,

        blockNumber:
          target.deployment
            .blockNumber,

        timestamp:
          target.deployment
            .timestamp,

        creationKind:
          "top_level_create",

        evidenceKind:
          "transaction_receipt",
      },

      observedDeployments,

      coverage,
    });

  return Response.json({
    ok: true,

    network:
      networkId,

    providers: {
      deployment:
        alchemyEvmProvider.id,

      transactionHistory:
        goldRushTransactionsProvider.id,

      receipts:
        alchemyEvmProvider.id,
    },

    scan: {
      observedTransactionCount:
        transactions.length,

      candidateCreationTransactionCount:
        candidates.length,

      receiptCheckedCount:
        candidatesToCheck.length,

      receiptVerificationFailureCount,

      nextCursor:
        cursor,
    },

    targetDeployment:
      target,

    developerHistory,
  });
}
