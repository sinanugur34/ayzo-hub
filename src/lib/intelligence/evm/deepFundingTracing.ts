import type {
  EvmProviderResult,
  EvmTransactionsPage,
} from "./types";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

const TX_HASH =
  /^0x[0-9a-fA-F]{64}$/;

export const MAX_DEEP_FUNDING_HOPS =
  4;

export const MAX_DEEP_FUNDING_NODES =
  32;

export const MAX_DEEP_FUNDING_PROVIDER_REQUESTS =
  40;

export type EvmDeepFundingEdge = {
  from: string;
  to: string;

  depth: number;

  transactionHash:
    string;

  blockNumber:
    number | null;

  timestamp:
    string | null;

  rawValue:
    string;
};

export type EvmDeepFundingNode = {
  address: string;

  depth: number;

  incomingFundingEdgeCount:
    number;
};

export type EvmDeepFundingPath = {
  sourceAddress:
    string;

  hopCount:
    number;

  addresses:
    readonly string[];

  evidenceTransactionHashes:
    readonly string[];
};

export type EvmDeepFundingCoverage = {
  maxHops: number;
  maxNodes: number;
  transactionPagesPerNode:
    number;
  providerRequestBudget:
    number;

  providerRequestCount:
    number;

  queriedNodeCount:
    number;
  discoveredNodeCount:
    number;

  providerRequestBudgetReached:
    boolean;

  nodeLimitReached:
    boolean;

  hopLimitReached:
    boolean;

  providerFailureCount:
    number;

  truncated:
    boolean;

  includesNativeTransactions:
    true;

  includesErc20Transfers:
    false;

  includesOwnershipInference:
    false;

  includesUltimateOriginInference:
    false;

  limitation:
    string;
};

export type EvmDeepFundingTracing = {
  rootAddress: string;

  nodeCount: number;
  edgeCount: number;
  pathCount: number;

  maxDepthReached:
    number;

  evidenceTransactionHashes:
    readonly string[];

  nodes:
    readonly EvmDeepFundingNode[];

  edges:
    readonly EvmDeepFundingEdge[];

  paths:
    readonly EvmDeepFundingPath[];

  coverage:
    EvmDeepFundingCoverage;
};

export type EvmDeepFundingFetchTransactions =
  (
    address: string,
    cursor: string | null
  ) => Promise<
    EvmProviderResult<
      EvmTransactionsPage
    >
  >;

export type AnalyzeEvmDeepFundingTracingRequest = {
  rootAddress:
    string;

  maxHops:
    number;

  maxNodes:
    number;

  transactionPagesPerNode:
    number;

  providerRequestBudget:
    number;

  getTransactions:
    EvmDeepFundingFetchTransactions;
};

type QueueItem = {
  address: string;
  depth: number;

  pathAddresses:
    readonly string[];

  pathHashes:
    readonly string[];
};

function normalizeAddress(
  value: string
): string | null {
  const normalized =
    value.trim().toLowerCase();

  return EVM_ADDRESS.test(
    normalized
  )
    ? normalized
    : null;
}

function normalizeHash(
  value: string
): string | null {
  const normalized =
    value.trim().toLowerCase();

  return TX_HASH.test(
    normalized
  )
    ? normalized
    : null;
}

function positiveRawValue(
  value:
    string | null
): string | null {
  if (
    value === null ||
    !/^\d+$/.test(
      value.trim()
    )
  ) {
    return null;
  }

  try {
    const parsed =
      BigInt(
        value.trim()
      );

    return parsed > 0n
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function validateBounds(
  request:
    AnalyzeEvmDeepFundingTracingRequest
) {
  if (
    !Number.isSafeInteger(
      request.maxHops
    ) ||
    request.maxHops < 1 ||
    request.maxHops >
      MAX_DEEP_FUNDING_HOPS
  ) {
    throw new Error(
      `maxHops must be an integer between 1 and ${MAX_DEEP_FUNDING_HOPS}.`
    );
  }

  if (
    !Number.isSafeInteger(
      request.maxNodes
    ) ||
    request.maxNodes < 2 ||
    request.maxNodes >
      MAX_DEEP_FUNDING_NODES
  ) {
    throw new Error(
      `maxNodes must be an integer between 2 and ${MAX_DEEP_FUNDING_NODES}.`
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
      3
  ) {
    throw new Error(
      "transactionPagesPerNode must be an integer between 1 and 3."
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
      MAX_DEEP_FUNDING_PROVIDER_REQUESTS
  ) {
    throw new Error(
      `providerRequestBudget must be an integer between 1 and ${MAX_DEEP_FUNDING_PROVIDER_REQUESTS}.`
    );
  }
}

export async function analyzeEvmDeepFundingTracing(
  request:
    AnalyzeEvmDeepFundingTracingRequest
): Promise<
  EvmDeepFundingTracing
> {
  validateBounds(
    request
  );

  const rootAddress =
    normalizeAddress(
      request.rootAddress
    );

  if (!rootAddress) {
    throw new Error(
      "Invalid EVM deep-funding root address."
    );
  }

  const queue:
    QueueItem[] = [
      {
        address:
          rootAddress,

        depth: 0,

        pathAddresses: [
          rootAddress,
        ],

        pathHashes: [],
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

  const edges:
    EvmDeepFundingEdge[] =
      [];

  const paths:
    EvmDeepFundingPath[] =
      [];

  const evidenceHashes =
    new Set<string>();

  let queueIndex = 0;

  let providerRequestCount =
    0;

  let providerRequestBudgetReached =
    false;

  let nodeLimitReached =
    false;

  let hopLimitReached =
    false;

  let providerFailureCount =
    0;

  while (
    queueIndex <
    queue.length
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

    if (
      current.depth >=
      request.maxHops
    ) {
      continue;
    }

    let cursor:
      string | null =
        null;

    let page = 0;

    const incomingBySource =
      new Map<
        string,
        EvmDeepFundingEdge[]
      >();

    while (
      page <
      request
        .transactionPagesPerNode
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
        break;
      }

      page += 1;

      for (
        const transaction of
          result.data
            .transactions
      ) {
        const from =
          transaction.from
            ? normalizeAddress(
                transaction.from
              )
            : null;

        const to =
          transaction.to
            ? normalizeAddress(
                transaction.to
              )
            : null;

        const hash =
          normalizeHash(
            transaction.hash
          );

        const rawValue =
          positiveRawValue(
            transaction.value
          );

        if (
          !from ||
          !to ||
          !hash ||
          !rawValue ||
          from === to ||
          to !==
            current.address
        ) {
          continue;
        }

        const edge:
          EvmDeepFundingEdge = {
          from,
          to,

          depth:
            current.depth +
            1,

          transactionHash:
            hash,

          blockNumber:
            transaction
              .blockNumber,

          timestamp:
            transaction
              .timestamp,

          rawValue,
        };

        const bucket =
          incomingBySource.get(
            from
          ) ?? [];

        bucket.push(edge);

        incomingBySource.set(
          from,
          bucket
        );
      }

      cursor =
        result.data
          .nextCursor;

      if (
        cursor === null
      ) {
        break;
      }
    }

    const rankedSources =
      [
        ...incomingBySource
          .entries(),
      ]
        .sort(
          (
            [leftAddress, left],
            [
              rightAddress,
              right,
            ]
          ) =>
            right.length -
              left.length ||
            leftAddress
              .localeCompare(
                rightAddress
              )
        );

    if (
      current.depth + 1 >
      request.maxHops
    ) {
      if (
        rankedSources.length >
        0
      ) {
        hopLimitReached =
          true;
      }

      continue;
    }

    for (
      const [
        sourceAddress,
        sourceEdges,
      ] of rankedSources
    ) {
      /*
       * Every accepted edge is a direct,
       * positive-value incoming funding
       * observation for the currently
       * queried wallet.
       */
      sourceEdges.sort(
        (left, right) =>
          (
            left.blockNumber ??
            Number.MAX_SAFE_INTEGER
          ) -
            (
              right.blockNumber ??
              Number.MAX_SAFE_INTEGER
            ) ||
          left.transactionHash
            .localeCompare(
              right
                .transactionHash
            )
      );

      const nextDepth =
        current.depth + 1;

      /*
       * A funding path may not revisit an
       * address already present in its own
       * ancestry. The observed transaction
       * remains real, but it is not treated
       * as deeper upstream provenance.
       */
      if (
        current
          .pathAddresses
          .includes(
            sourceAddress
          )
      ) {
        continue;
      }

      const alreadyDiscovered =
        discoveredDepth.has(
          sourceAddress
        );

      if (
        !alreadyDiscovered &&
        discoveredDepth.size >=
          request.maxNodes
      ) {
        nodeLimitReached =
          true;
        continue;
      }

      /*
       * Boundary nodes are still discovered
       * evidence nodes even though they are
       * not queried beyond maxHops.
       */
      if (!alreadyDiscovered) {
        discoveredDepth.set(
          sourceAddress,
          nextDepth
        );
      }

      for (
        const edge of
          sourceEdges
      ) {
        edges.push(edge);

        evidenceHashes.add(
          edge.transactionHash
        );
      }

      const primaryEdge =
        sourceEdges[0];

      const nextPathAddresses =
        [
          sourceAddress,
          ...current
            .pathAddresses,
        ];

      const nextPathHashes =
        [
          primaryEdge
            .transactionHash,
          ...current
            .pathHashes,
        ];

      paths.push({
        sourceAddress,

        hopCount:
          nextDepth,

        addresses:
          nextPathAddresses,

        evidenceTransactionHashes:
          nextPathHashes,
      });

      if (
        nextDepth >=
        request.maxHops
      ) {
        hopLimitReached =
          true;
        continue;
      }

      /*
       * An address discovered through an
       * earlier branch is not queried twice.
       */
      if (alreadyDiscovered) {
        continue;
      }

      queue.push({
        address:
          sourceAddress,

        depth:
          nextDepth,

        pathAddresses:
          nextPathAddresses,

        pathHashes:
          nextPathHashes,
      });
    }

    if (
      providerRequestBudgetReached
    ) {
      break;
    }
  }

  const nodes:
    EvmDeepFundingNode[] =
      [
        ...discoveredDepth
          .entries(),
      ]
        .sort(
          (
            [leftAddress, leftDepth],
            [
              rightAddress,
              rightDepth,
            ]
          ) =>
            leftDepth -
              rightDepth ||
            leftAddress
              .localeCompare(
                rightAddress
              )
        )
        .map(
          (
            [
              address,
              depth,
            ]
          ) => ({
            address,
            depth,

            incomingFundingEdgeCount:
              edges.filter(
                edge =>
                  edge.to ===
                  address
              ).length,
          })
        );

  const maxDepthReached =
    nodes.reduce(
      (
        maximum,
        node
      ) =>
        Math.max(
          maximum,
          node.depth
        ),
      0
    );

  const truncated =
    providerRequestBudgetReached ||
    nodeLimitReached ||
    hopLimitReached ||
    providerFailureCount >
      0;

  const limitations = [
    `Deep funding tracing is bounded to ${request.maxHops} hop(s), ${request.maxNodes} node(s), ${request.transactionPagesPerNode} transaction page(s) per queried node, and ${request.providerRequestBudget} logical provider request(s).`,
    "Only positive-value native EVM transactions directed into the currently traced wallet are treated as funding evidence.",
    "ERC-20 upstream funding is not included in Deep Funding V1.",
    "Observed funding paths do not establish ownership, identity, control, intent, or ultimate origin of funds.",
  ];

  if (
    providerRequestBudgetReached
  ) {
    limitations.push(
      "The provider request budget was reached before all discovered upstream wallets could be queried."
    );
  }

  if (
    nodeLimitReached
  ) {
    limitations.push(
      "Additional upstream wallets were excluded by the node limit."
    );
  }

  if (
    hopLimitReached
  ) {
    limitations.push(
      "Additional upstream funding may exist beyond the configured hop depth."
    );
  }

  if (
    providerFailureCount >
    0
  ) {
    limitations.push(
      `${providerFailureCount} provider request(s) failed and were excluded from deeper traversal.`
    );
  }

  return {
    rootAddress,

    nodeCount:
      nodes.length,

    edgeCount:
      edges.length,

    pathCount:
      paths.length,

    maxDepthReached,

    evidenceTransactionHashes:
      [
        ...evidenceHashes,
      ].sort(),

    nodes,

    edges:
      edges.sort(
        (left, right) =>
          left.depth -
            right.depth ||
          left.from.localeCompare(
            right.from
          ) ||
          left.to.localeCompare(
            right.to
          ) ||
          left.transactionHash
            .localeCompare(
              right
                .transactionHash
            )
      ),

    paths:
      paths.sort(
        (left, right) =>
          left.hopCount -
            right.hopCount ||
          left.sourceAddress
            .localeCompare(
              right
                .sourceAddress
            )
      ),

    coverage: {
      maxHops:
        request.maxHops,

      maxNodes:
        request.maxNodes,

      transactionPagesPerNode:
        request
          .transactionPagesPerNode,

      providerRequestBudget:
        request
          .providerRequestBudget,

      providerRequestCount,

      queriedNodeCount:
        queriedAddresses.size,

      discoveredNodeCount:
        discoveredDepth.size,

      providerRequestBudgetReached,

      nodeLimitReached,

      hopLimitReached,

      providerFailureCount,

      truncated,

      includesNativeTransactions:
        true,

      includesErc20Transfers:
        false,

      includesOwnershipInference:
        false,

      includesUltimateOriginInference:
        false,

      limitation:
        limitations.join(
          " "
        ),
    },
  };
}
