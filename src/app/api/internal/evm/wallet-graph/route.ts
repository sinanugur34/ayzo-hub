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
  goldRushTransfersProvider,
} from "@/lib/intelligence/evm/providers/goldrushTransfers";

import {
  analyzeEvmWalletGraph,
  evmTransactionsToGraphObservations,
  evmTransfersToGraphObservations,
  MAX_EVM_GRAPH_EDGES,
  MAX_EVM_GRAPH_HOPS,
  MAX_EVM_GRAPH_NODES,
  type EvmWalletGraphEvidenceCoverage,
  type EvmWalletGraphObservation,
} from "@/lib/intelligence/evm/walletGraph";

import {
  rankEvmWalletGraphNeighbors,
} from "@/lib/intelligence/evm/walletGraphDiscovery";

import {
  isNetworkId,
} from "@/lib/networks/registry";

import {
  readJsonObjectBody,
} from "@/lib/requestBody";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

const DEFAULT_MAX_HOPS = 2;

const DEFAULT_MAX_NODES = 12;
const ENDPOINT_MAX_NODES = 20;

const DEFAULT_MAX_EDGES = 24;
const ENDPOINT_MAX_EDGES = 50;

const DEFAULT_TRANSACTION_PAGES_PER_NODE =
  1;

const MAX_TRANSACTION_PAGES_PER_NODE =
  2;

const DEFAULT_TRANSFER_PAGES_PER_NODE =
  1;

const MAX_TRANSFER_PAGES_PER_NODE =
  2;

const DEFAULT_PROVIDER_REQUEST_BUDGET =
  24;

const MAX_PROVIDER_REQUEST_BUDGET =
  40;

type QueueItem = {
  address: string;
  depth: number;
};

function providerStatus(
  code: string
): number {
  if (
    code ===
      "INVALID_ADDRESS" ||
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

function boundedInteger(
  value: unknown,
  defaultValue: number,
  minimum: number,
  maximum: number
): number | null {
  if (value === undefined) {
    return defaultValue;
  }

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
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

  const rootAddress =
    typeof body.rootAddress ===
      "string"
      ? body.rootAddress
          .trim()
          .toLowerCase()
      : "";

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

  if (
    !EVM_ADDRESS.test(
      rootAddress
    )
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_ADDRESS",
        error:
          "Invalid EVM graph root address.",
      },
      {
        status: 400,
      }
    );
  }

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
      {
        status: 400,
      }
    );
  }

  const maxHops =
    boundedInteger(
      body.maxHops,
      DEFAULT_MAX_HOPS,
      1,
      MAX_EVM_GRAPH_HOPS
    );

  const maxNodes =
    boundedInteger(
      body.maxNodes,
      DEFAULT_MAX_NODES,
      2,
      Math.min(
        ENDPOINT_MAX_NODES,
        MAX_EVM_GRAPH_NODES
      )
    );

  const maxEdges =
    boundedInteger(
      body.maxEdges,
      DEFAULT_MAX_EDGES,
      1,
      Math.min(
        ENDPOINT_MAX_EDGES,
        MAX_EVM_GRAPH_EDGES
      )
    );

  const transactionPagesPerNode =
    boundedInteger(
      body.transactionPagesPerNode,
      DEFAULT_TRANSACTION_PAGES_PER_NODE,
      1,
      MAX_TRANSACTION_PAGES_PER_NODE
    );

  const transferPagesPerNode =
    boundedInteger(
      body.transferPagesPerNode,
      DEFAULT_TRANSFER_PAGES_PER_NODE,
      1,
      MAX_TRANSFER_PAGES_PER_NODE
    );

  const providerRequestBudget =
    boundedInteger(
      body.providerRequestBudget,
      DEFAULT_PROVIDER_REQUEST_BUDGET,
      1,
      MAX_PROVIDER_REQUEST_BUDGET
    );

  if (maxHops === null) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_MAX_HOPS",
        error:
          `maxHops must be an integer between 1 and ${MAX_EVM_GRAPH_HOPS}.`,
      },
      {
        status: 400,
      }
    );
  }

  if (maxNodes === null) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_MAX_NODES",
        error:
          `maxNodes must be an integer between 2 and ${ENDPOINT_MAX_NODES}.`,
      },
      {
        status: 400,
      }
    );
  }

  if (maxEdges === null) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_MAX_EDGES",
        error:
          `maxEdges must be an integer between 1 and ${ENDPOINT_MAX_EDGES}.`,
      },
      {
        status: 400,
      }
    );
  }

  if (
    transactionPagesPerNode ===
      null
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_TRANSACTION_PAGES",
        error:
          `transactionPagesPerNode must be an integer between 1 and ${MAX_TRANSACTION_PAGES_PER_NODE}.`,
      },
      {
        status: 400,
      }
    );
  }

  if (
    transferPagesPerNode ===
      null
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_TRANSFER_PAGES",
        error:
          `transferPagesPerNode must be an integer between 1 and ${MAX_TRANSFER_PAGES_PER_NODE}.`,
      },
      {
        status: 400,
      }
    );
  }

  if (
    providerRequestBudget ===
      null
  ) {
    return Response.json(
      {
        ok: false,
        code:
          "INVALID_PROVIDER_BUDGET",
        error:
          `providerRequestBudget must be an integer between 1 and ${MAX_PROVIDER_REQUEST_BUDGET}.`,
      },
      {
        status: 400,
      }
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
      {
        status: 400,
      }
    );
  }

  const observations:
    EvmWalletGraphObservation[] =
      [];

  const queue:
    QueueItem[] = [
      {
        address:
          rootAddress,
        depth: 0,
      },
    ];

  const discoveredDepth =
    new Map<
      string,
      number
    >([
      [
        rootAddress,
        0,
      ],
    ]);

  const queriedAddresses =
    new Set<string>();

  const discoveryTreeEdges =
    new Set<string>();

  const scans = [];

  let providerRequestCount =
    0;

  let successfulTransactionRequests =
    0;

  let successfulTransferRequests =
    0;

  let providerRequestBudgetReached =
    false;

  let discoveryNodeLimitReached =
    false;

  let discoveryEdgeLimitReached =
    false;

  let discoveryHopLimitReached =
    false;

  let queueIndex = 0;

  outer:
  while (
    queueIndex <
    queue.length
  ) {
    if (
      providerRequestCount >=
      providerRequestBudget
    ) {
      providerRequestBudgetReached =
        true;
      break;
    }

    const current =
      queue[
        queueIndex
      ];

    queueIndex += 1;

    if (
      queriedAddresses.has(
        current.address
      )
    ) {
      continue;
    }

    queriedAddresses.add(
      current.address
    );

    const nodeObservations:
      EvmWalletGraphObservation[] =
        [];

    let transactionCursor:
      string | null = null;

    let transactionPages =
      0;

    let transactionCount =
      0;

    let transactionHistoryExhausted =
      false;

    for (
      let page = 0;
      page <
        transactionPagesPerNode;
      page += 1
    ) {
      if (
        providerRequestCount >=
        providerRequestBudget
      ) {
        providerRequestBudgetReached =
          true;
        break;
      }

      providerRequestCount +=
        1;

      const result =
        await goldRushTransactionsProvider
          .getTransactions({
            network,
            address:
              current.address,
            cursor:
              transactionCursor,
          });

      if (!result.ok) {
        return Response.json(
          {
            ok: false,
            network:
              networkId,
            graphAddress:
              current.address,
            graphDepth:
              current.depth,
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

      successfulTransactionRequests +=
        1;

      transactionPages +=
        1;

      transactionCount +=
        result.data
          .transactions.length;

      const normalized =
        evmTransactionsToGraphObservations(
          result.data
            .transactions
        );

      nodeObservations.push(
        ...normalized
      );

      observations.push(
        ...normalized
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

    let transferPages =
      0;

    let transferCount =
      0;

    let transferHistoryExhausted =
      tokenAddress === null;

    if (
      tokenAddress !== null
    ) {
      for (
        let page = 0;
        page <
          transferPagesPerNode;
        page += 1
      ) {
        if (
          providerRequestCount >=
          providerRequestBudget
        ) {
          providerRequestBudgetReached =
            true;
          break;
        }

        providerRequestCount +=
          1;

        const result =
          await goldRushTransfersProvider
            .getTokenTransfers({
              network,
              address:
                current.address,
              tokenAddress,
              limit: 100,
              cursor:
                transferCursor,
            });

        if (!result.ok) {
          return Response.json(
            {
              ok: false,
              network:
                networkId,
              graphAddress:
                current.address,
              graphDepth:
                current.depth,
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

        successfulTransferRequests +=
          1;

        transferPages +=
          1;

        transferCount +=
          result.data
            .transfers.length;

        const normalized =
          evmTransfersToGraphObservations(
            result.data
              .transfers
          );

        nodeObservations.push(
          ...normalized
        );

        observations.push(
          ...normalized
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

    const neighbors =
      rankEvmWalletGraphNeighbors(
        current.address,
        nodeObservations
      );

    scans.push({
      address:
        current.address,

      depth:
        current.depth,

      transactions: {
        pages:
          transactionPages,

        observed:
          transactionCount,

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
          transferPages,

        observed:
          transferCount,

        exhausted:
          transferHistoryExhausted,

        nextCursor:
          transferCursor,
      },

      discoveredNeighborCount:
        neighbors.length,
    });

    if (
      current.depth >=
      maxHops
    ) {
      if (
        neighbors.some(
          neighbor =>
            !discoveredDepth.has(
              neighbor.address
            )
        )
      ) {
        discoveryHopLimitReached =
          true;
      }

      if (
        providerRequestBudgetReached
      ) {
        break;
      }

      continue;
    }

    for (
      const neighbor of
        neighbors
    ) {
      if (
        discoveredDepth.has(
          neighbor.address
        )
      ) {
        continue;
      }

      if (
        discoveredDepth.size >=
        maxNodes
      ) {
        discoveryNodeLimitReached =
          true;
        continue;
      }

      if (
        discoveryTreeEdges.size >=
        maxEdges
      ) {
        discoveryEdgeLimitReached =
          true;
        continue;
      }

      const pair = [
        current.address,
        neighbor.address,
      ].sort();

      const discoveryEdgeId =
        pair.join(":");

      discoveryTreeEdges.add(
        discoveryEdgeId
      );

      const nextDepth =
        current.depth + 1;

      discoveredDepth.set(
        neighbor.address,
        nextDepth
      );

      queue.push({
        address:
          neighbor.address,

        depth:
          nextDepth,
      });
    }

    if (
      providerRequestBudgetReached
    ) {
      break outer;
    }
  }

  const limitationParts = [
    "This graph represents observed on-chain relationships only and does not establish common ownership, identity, intent, or control.",
    `Recursive discovery was bounded to ${maxHops} hop(s), ${maxNodes} node(s), ${maxEdges} edge(s), and ${providerRequestBudget} total provider request(s).`,
    `Each queried node used at most ${transactionPagesPerNode} transaction page(s).`,
  ];

  if (
    tokenAddress === null
  ) {
    limitationParts.push(
      "ERC-20 transfer evidence was not requested."
    );
  } else {
    limitationParts.push(
      `ERC-20 evidence was limited to token ${tokenAddress} and at most ${transferPagesPerNode} transfer page(s) per queried node.`
    );
  }

  if (
    providerRequestBudgetReached
  ) {
    limitationParts.push(
      "The provider request budget was reached before every discovered node could necessarily be queried."
    );
  }

  if (
    discoveryNodeLimitReached
  ) {
    limitationParts.push(
      "Additional discovered addresses were excluded by the node limit."
    );
  }

  if (
    discoveryEdgeLimitReached
  ) {
    limitationParts.push(
      "Additional discovery relationships were excluded by the edge limit."
    );
  }

  if (
    discoveryHopLimitReached
  ) {
    limitationParts.push(
      "Additional addresses existed beyond the requested hop depth."
    );
  }

  const evidenceCoverage:
    EvmWalletGraphEvidenceCoverage = {
    includesEvmTransactions:
      successfulTransactionRequests >
      0,

    includesErc20Transfers:
      successfulTransferRequests >
      0,

    includesOwnershipInference:
      false,

    limitation:
      limitationParts.join(
        " "
      ),
  };

  const graph =
    analyzeEvmWalletGraph({
      rootAddress,

      observations,

      maxHops,
      maxNodes,
      maxEdges,

      evidenceCoverage,
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
      rootAddress,
      tokenAddress,

      maxHops,
      maxNodes,
      maxEdges,

      transactionPagesPerNode,

      transferPagesPerNode:
        tokenAddress === null
          ? 0
          : transferPagesPerNode,

      providerRequestBudget,
    },

    discovery: {
      queriedNodeCount:
        queriedAddresses.size,

      discoveredNodeCount:
        discoveredDepth.size,

      discoveryTreeEdgeCount:
        discoveryTreeEdges.size,

      providerRequestCount,

      providerRequestBudgetReached,

      nodeLimitReached:
        discoveryNodeLimitReached,

      edgeLimitReached:
        discoveryEdgeLimitReached,

      hopLimitReached:
        discoveryHopLimitReached,

      scans,
    },

    graph,
  });
}
