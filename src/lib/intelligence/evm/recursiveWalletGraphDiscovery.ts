import {
  evmTransactionsToGraphObservations,
  MAX_EVM_GRAPH_EDGES,
  MAX_EVM_GRAPH_HOPS,
  MAX_EVM_GRAPH_NODES,
  type EvmWalletGraphObservation,
} from "./walletGraph";

import {
  rankEvmWalletGraphNeighbors,
} from "./walletGraphDiscovery";

import type {
  EvmProviderResult,
  EvmTransaction,
  EvmTransactionsPage,
} from "./types";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

export const MAX_RECURSIVE_GRAPH_NEIGHBORS_PER_NODE =
  12;

export const MAX_RECURSIVE_GRAPH_TRANSACTION_PAGES_PER_NODE =
  3;

export const MAX_RECURSIVE_GRAPH_PROVIDER_REQUESTS =
  40;

type QueueItem = {
  address: string;
  depth: number;
};

export type EvmRecursiveGraphScan = {
  address: string;
  depth: number;

  transactionPages:
    number;

  transactionCount:
    number;

  historyExhausted:
    boolean;

  nextCursor:
    string | null;

  providerFailure:
    boolean;

  discoveredNeighborCount:
    number;

  selectedNeighborCount:
    number;
};

export type EvmRecursiveWalletGraphDiscovery = {
  observations:
    readonly EvmWalletGraphObservation[];

  expansionTransactions:
    readonly EvmTransaction[];

  discoveredNodeCount:
    number;

  providerQueriedNodeCount:
    number;

  discoveryTreeEdgeCount:
    number;

  maxDepthDiscovered:
    number;

  providerRequestCount:
    number;

  successfulProviderRequestCount:
    number;

  providerFailureCount:
    number;

  providerRequestBudgetReached:
    boolean;

  nodeLimitReached:
    boolean;

  edgeLimitReached:
    boolean;

  hopLimitReached:
    boolean;

  neighborLimitReached:
    boolean;

  truncated:
    boolean;

  scans:
    readonly EvmRecursiveGraphScan[];

  limitation:
    string;
};

export type AnalyzeEvmRecursiveWalletGraphDiscoveryRequest = {
  rootAddress: string;

  /*
   * Root evidence is supplied by the caller.
   * In the unified orchestrator this allows
   * reuse of the root evidence that was
   * already fetched for the main analysis.
   */
  rootObservations:
    readonly EvmWalletGraphObservation[];

  maxHops: number;
  maxNodes: number;
  maxEdges: number;

  maxNeighborsPerNode:
    number;

  transactionPagesPerNode:
    number;

  providerRequestBudget:
    number;

  getTransactions: (
    address: string,
    cursor: string | null
  ) => Promise<
    EvmProviderResult<
      EvmTransactionsPage
    >
  >;
};

function normalizeAddress(
  value: string
): string | null {
  const normalized =
    value
      .trim()
      .toLowerCase();

  return EVM_ADDRESS.test(
    normalized
  )
    ? normalized
    : null;
}

function validateBounds(
  request:
    AnalyzeEvmRecursiveWalletGraphDiscoveryRequest
) {
  if (
    !Number.isSafeInteger(
      request.maxHops
    ) ||
    request.maxHops < 1 ||
    request.maxHops >
      MAX_EVM_GRAPH_HOPS
  ) {
    throw new Error(
      `maxHops must be an integer between 1 and ${MAX_EVM_GRAPH_HOPS}.`
    );
  }

  if (
    !Number.isSafeInteger(
      request.maxNodes
    ) ||
    request.maxNodes < 2 ||
    request.maxNodes >
      MAX_EVM_GRAPH_NODES
  ) {
    throw new Error(
      `maxNodes must be an integer between 2 and ${MAX_EVM_GRAPH_NODES}.`
    );
  }

  if (
    !Number.isSafeInteger(
      request.maxEdges
    ) ||
    request.maxEdges < 1 ||
    request.maxEdges >
      MAX_EVM_GRAPH_EDGES
  ) {
    throw new Error(
      `maxEdges must be an integer between 1 and ${MAX_EVM_GRAPH_EDGES}.`
    );
  }

  if (
    !Number.isSafeInteger(
      request
        .maxNeighborsPerNode
    ) ||
    request
      .maxNeighborsPerNode <
      1 ||
    request
      .maxNeighborsPerNode >
      MAX_RECURSIVE_GRAPH_NEIGHBORS_PER_NODE
  ) {
    throw new Error(
      `maxNeighborsPerNode must be an integer between 1 and ${MAX_RECURSIVE_GRAPH_NEIGHBORS_PER_NODE}.`
    );
  }

  if (
    !Number.isSafeInteger(
      request
        .transactionPagesPerNode
    ) ||
    request
      .transactionPagesPerNode <
      1 ||
    request
      .transactionPagesPerNode >
      MAX_RECURSIVE_GRAPH_TRANSACTION_PAGES_PER_NODE
  ) {
    throw new Error(
      `transactionPagesPerNode must be an integer between 1 and ${MAX_RECURSIVE_GRAPH_TRANSACTION_PAGES_PER_NODE}.`
    );
  }

  if (
    !Number.isSafeInteger(
      request
        .providerRequestBudget
    ) ||
    request
      .providerRequestBudget <
      1 ||
    request
      .providerRequestBudget >
      MAX_RECURSIVE_GRAPH_PROVIDER_REQUESTS
  ) {
    throw new Error(
      `providerRequestBudget must be an integer between 1 and ${MAX_RECURSIVE_GRAPH_PROVIDER_REQUESTS}.`
    );
  }
}

export async function analyzeEvmRecursiveWalletGraphDiscovery(
  request:
    AnalyzeEvmRecursiveWalletGraphDiscoveryRequest
): Promise<
  EvmRecursiveWalletGraphDiscovery
> {
  const rootAddress =
    normalizeAddress(
      request.rootAddress
    );

  if (!rootAddress) {
    throw new Error(
      "Invalid EVM recursive graph root address."
    );
  }

  validateBounds(request);

  const observations:
    EvmWalletGraphObservation[] =
      [
        ...request
          .rootObservations,
      ];

  const expansionTransactions:
    EvmTransaction[] = [];

  const queue:
    QueueItem[] = [
      {
        address:
          rootAddress,

        depth:
          0,
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

  const providerQueriedAddresses =
    new Set<string>();

  const discoveryTreeEdges =
    new Set<string>();

  const scans:
    EvmRecursiveGraphScan[] =
      [];

  let queueIndex = 0;

  let providerRequestCount =
    0;

  let successfulProviderRequestCount =
    0;

  let providerFailureCount =
    0;

  let providerRequestBudgetReached =
    false;

  let nodeLimitReached =
    false;

  let edgeLimitReached =
    false;

  let hopLimitReached =
    false;

  let neighborLimitReached =
    false;

  while (
    queueIndex <
    queue.length
  ) {
    const current =
      queue[
        queueIndex
      ];

    queueIndex += 1;

    /*
     * Root evidence was already fetched by
     * the caller. Do not spend graph budget
     * fetching it again.
     */
    let nodeObservations:
      readonly EvmWalletGraphObservation[] =
        current.depth === 0
          ? request
              .rootObservations
          : [];

    if (
      current.depth >
      0
    ) {
      if (
        providerRequestCount >=
        request
          .providerRequestBudget
      ) {
        providerRequestBudgetReached =
          true;
        break;
      }

      providerQueriedAddresses.add(
        current.address
      );

      const nodeTransactions:
        EvmTransaction[] = [];

      let cursor:
        string | null =
          null;

      let transactionPages =
        0;

      let transactionCount =
        0;

      let historyExhausted =
        false;

      let providerFailure =
        false;

      for (
        let page = 0;
        page <
          request
            .transactionPagesPerNode;
        page += 1
      ) {
        if (
          providerRequestCount >=
          request
            .providerRequestBudget
        ) {
          providerRequestBudgetReached =
            true;
          break;
        }

        providerRequestCount +=
          1;

        const result =
          await request
            .getTransactions(
              current.address,
              cursor
            );

        if (!result.ok) {
          providerFailureCount +=
            1;

          providerFailure =
            true;

          break;
        }

        successfulProviderRequestCount +=
          1;

        transactionPages +=
          1;

        transactionCount +=
          result.data
            .transactions
            .length;

        nodeTransactions.push(
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

      expansionTransactions.push(
        ...nodeTransactions
      );

      const normalized =
        evmTransactionsToGraphObservations(
          nodeTransactions
        );

      observations.push(
        ...normalized
      );

      nodeObservations =
        normalized;

      const ranked =
        rankEvmWalletGraphNeighbors(
          current.address,
          nodeObservations
        );

      if (
        ranked.length >
        request
          .maxNeighborsPerNode
      ) {
        neighborLimitReached =
          true;
      }

      scans.push({
        address:
          current.address,

        depth:
          current.depth,

        transactionPages,

        transactionCount,

        historyExhausted,

        nextCursor:
          cursor,

        providerFailure,

        discoveredNeighborCount:
          ranked.length,

        selectedNeighborCount:
          Math.min(
            ranked.length,
            request
              .maxNeighborsPerNode
          ),
      });
    }

    const rankedNeighbors =
      rankEvmWalletGraphNeighbors(
        current.address,
        nodeObservations
      );

    if (
      rankedNeighbors.length >
      request
        .maxNeighborsPerNode
    ) {
      neighborLimitReached =
        true;
    }

    const neighbors =
      rankedNeighbors.slice(
        0,
        request
          .maxNeighborsPerNode
      );

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
        request.maxNodes
      ) {
        nodeLimitReached =
          true;
        continue;
      }

      if (
        discoveryTreeEdges.size >=
        request.maxEdges
      ) {
        edgeLimitReached =
          true;
        continue;
      }

      const nextDepth =
        current.depth + 1;

      if (
        nextDepth >
        request.maxHops
      ) {
        hopLimitReached =
          true;
        continue;
      }

      const pair = [
        current.address,
        neighbor.address,
      ].sort();

      discoveryTreeEdges.add(
        pair.join(":")
      );

      discoveredDepth.set(
        neighbor.address,
        nextDepth
      );

      /*
       * Boundary nodes are included in the
       * graph evidence but are intentionally
       * not queried again. This avoids paying
       * another provider request only to learn
       * what lies outside the configured graph.
       */
      if (
        nextDepth >=
        request.maxHops
      ) {
        hopLimitReached =
          true;
        continue;
      }

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
      break;
    }
  }

  const maxDepthDiscovered =
    Math.max(
      ...discoveredDepth.values()
    );

  const truncated =
    providerRequestBudgetReached ||
    nodeLimitReached ||
    edgeLimitReached ||
    hopLimitReached ||
    neighborLimitReached ||
    providerFailureCount > 0;

  const limitationParts = [
    "Recursive wallet-graph discovery represents observed on-chain relationships only and does not establish common ownership, identity, intent, or control.",
    `Advanced recursive discovery is bounded to ${request.maxHops} hop(s), ${request.maxNodes} node(s), ${request.maxEdges} graph edge(s), ${request.maxNeighborsPerNode} strongest new neighbor(s) per processed node, ${request.transactionPagesPerNode} transaction page(s) per queried node, and ${request.providerRequestBudget} logical provider request(s).`,
    "Root evidence is reused from the unified analysis instead of being fetched again.",
    "Recursive provider expansion uses native EVM transaction history only in V1; ERC-20 transfer evidence may still be present in the caller-supplied root evidence.",
  ];

  if (
    providerRequestBudgetReached
  ) {
    limitationParts.push(
      "The logical provider request budget was reached before every queued node could be queried."
    );
  }

  if (nodeLimitReached) {
    limitationParts.push(
      "Additional discovered addresses were excluded by the node limit."
    );
  }

  if (edgeLimitReached) {
    limitationParts.push(
      "Additional discovery relationships were excluded by the graph edge limit."
    );
  }

  if (neighborLimitReached) {
    limitationParts.push(
      "Lower-ranked neighbors were excluded by the per-node branching limit."
    );
  }

  if (hopLimitReached) {
    limitationParts.push(
      "Traversal reached the configured hop boundary; additional relationships may exist beyond it."
    );
  }

  if (
    providerFailureCount > 0
  ) {
    limitationParts.push(
      `${providerFailureCount} provider request(s) failed; failed evidence was excluded and the remaining graph is partial.`
    );
  }

  return {
    observations,

    expansionTransactions,

    discoveredNodeCount:
      discoveredDepth.size,

    providerQueriedNodeCount:
      providerQueriedAddresses
        .size,

    discoveryTreeEdgeCount:
      discoveryTreeEdges.size,

    maxDepthDiscovered,

    providerRequestCount,

    successfulProviderRequestCount,

    providerFailureCount,

    providerRequestBudgetReached,

    nodeLimitReached,

    edgeLimitReached,

    hopLimitReached,

    neighborLimitReached,

    truncated,

    scans,

    limitation:
      limitationParts.join(
        " "
      ),
  };
}
