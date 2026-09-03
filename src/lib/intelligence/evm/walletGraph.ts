import {
  resolveEvmEntityAttribution,
  type EvmEntityAttribution,
  type EvmEntityEvidence,
} from "./entityAttribution";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

const TX_HASH =
  /^0x[0-9a-fA-F]{64}$/;

export const MAX_EVM_GRAPH_HOPS = 3;
export const MAX_EVM_GRAPH_NODES = 100;
export const MAX_EVM_GRAPH_EDGES = 200;

export type EvmWalletGraphEvidenceKind =
  | "evm_transaction"
  | "erc20_transfer";

export type EvmWalletGraphDirection =
  | "a_to_b"
  | "b_to_a"
  | "bidirectional";

type EvmWalletGraphObservationBase = {
  transactionHash: string;
  blockNumber: number | null;
  timestamp: string | null;
  from: string;
  to: string;
};

export type EvmTransactionGraphObservation =
  EvmWalletGraphObservationBase & {
    kind: "evm_transaction";
    rawValue: string | null;
  };

export type EvmTransferGraphObservation =
  EvmWalletGraphObservationBase & {
    kind: "erc20_transfer";
    tokenAddress: string;
    rawValue: string;
  };

export type EvmWalletGraphObservation =
  | EvmTransactionGraphObservation
  | EvmTransferGraphObservation;

export type EvmTransactionGraphInput = {
  hash: string;
  blockNumber: number | null;
  timestamp: string | null;
  from: string | null;
  to: string | null;
  value: string | null;
};

export type EvmTransferGraphInput = {
  transactionHash: string;
  blockNumber: number | null;
  timestamp: string | null;
  from: string;
  to: string;
  tokenAddress: string;
  value: string;
};

export type EvmWalletGraphEvidenceCoverage = {
  includesEvmTransactions: boolean;
  includesErc20Transfers: boolean;

  includesOwnershipInference: false;

  limitation: string;
};

export type EvmWalletGraphCoverage =
  EvmWalletGraphEvidenceCoverage & {
    traversal:
      "undirected_shortest_path";

    maxHops: number;
    maxNodes: number;
    maxEdges: number;

    hopLimitReached: boolean;
    nodeLimitReached: boolean;
    edgeLimitReached: boolean;

    truncated: boolean;
  };

export type EvmWalletGraphNode = {
  rank: number;

  address: string;

  depth: number;

  isRoot: boolean;

  parentAddress:
    string | null;

  discoveryEdgeId:
    string | null;

  attribution:
    EvmEntityAttribution;

  degree: number;

  interactionCount: number;

  evidenceTransactionHashes:
    readonly string[];

  observedTokenAddresses:
    readonly string[];
};

export type EvmWalletGraphEdge = {
  rank: number;

  id: string;

  addressA: string;
  addressB: string;

  direction:
    EvmWalletGraphDirection;

  aToBInteractionCount: number;
  bToAInteractionCount: number;

  interactionCount: number;

  transactionCount: number;
  transferCount: number;

  evidenceKinds:
    readonly EvmWalletGraphEvidenceKind[];

  evidenceObservationCount:
    number;

  evidenceTransactionHashes:
    readonly string[];

  observedTokenAddresses:
    readonly string[];

  firstSeen:
    string | null;

  lastSeen:
    string | null;
};

export type EvmWalletGraph = {
  rootAddress: string;

  nodeCount: number;
  edgeCount: number;

  maxDepthReached: number;

  inputEvidenceCount: number;

  normalizedEvidenceCount: number;

  graphEvidenceCount: number;

  excludedEvidenceCount: number;

  duplicateEvidenceCount: number;

  ignoredEvidenceCount: number;

  graphTransactionObservationCount:
    number;

  graphTransferObservationCount:
    number;

  uniqueEvidenceTransactionCount:
    number;

  firstSeen:
    string | null;

  lastSeen:
    string | null;

  nodes:
    readonly EvmWalletGraphNode[];

  edges:
    readonly EvmWalletGraphEdge[];

  coverage:
    EvmWalletGraphCoverage;
};

export type AnalyzeEvmWalletGraphRequest = {
  rootAddress: string;

  observations:
    readonly EvmWalletGraphObservation[];

  maxHops: number;
  maxNodes: number;
  maxEdges: number;

  evidenceCoverage:
    EvmWalletGraphEvidenceCoverage;

  entityEvidence?:
    readonly EvmEntityEvidence[];
};

type SeenRange = {
  firstSeen: string | null;
  firstSeenMs: number | null;

  lastSeen: string | null;
  lastSeenMs: number | null;
};

type NormalizedObservation = {
  kind:
    EvmWalletGraphEvidenceKind;

  transactionHash: string;

  blockNumber:
    number | null;

  timestamp:
    string | null;

  from: string;
  to: string;

  tokenAddress:
    string | null;

  rawValue:
    string | null;
};

type EdgeAccumulator =
  SeenRange & {
    id: string;

    addressA: string;
    addressB: string;

    aToBInteractionCount:
      number;

    bToAInteractionCount:
      number;

    transactionCount:
      number;

    transferCount:
      number;

    evidenceKinds:
      Set<EvmWalletGraphEvidenceKind>;

    evidenceObservationKeys:
      Set<string>;

    evidenceTransactionHashes:
      Set<string>;

    observedTokenAddresses:
      Set<string>;
  };

type NodeDiscovery = {
  address: string;
  depth: number;

  parentAddress:
    string | null;

  discoveryEdgeId:
    string | null;
};

type NodeStats = {
  degree: number;

  interactionCount:
    number;

  evidenceTransactionHashes:
    Set<string>;

  observedTokenAddresses:
    Set<string>;
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

function normalizeRawValue(
  value: string | null
): string | null {
  if (value === null) {
    return null;
  }

  const normalized =
    value.trim();

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  try {
    return BigInt(
      normalized
    ).toString();
  } catch {
    return null;
  }
}

function emptySeenRange():
  SeenRange {
  return {
    firstSeen: null,
    firstSeenMs: null,

    lastSeen: null,
    lastSeenMs: null,
  };
}

function includeTimestamp(
  range: SeenRange,
  timestamp: string | null
) {
  if (!timestamp) {
    return;
  }

  const ms =
    Date.parse(timestamp);

  if (!Number.isFinite(ms)) {
    return;
  }

  if (
    range.firstSeenMs ===
      null ||
    ms < range.firstSeenMs
  ) {
    range.firstSeenMs = ms;
    range.firstSeen =
      timestamp;
  }

  if (
    range.lastSeenMs ===
      null ||
    ms > range.lastSeenMs
  ) {
    range.lastSeenMs = ms;
    range.lastSeen =
      timestamp;
  }
}

function normalizeObservation(
  observation:
    EvmWalletGraphObservation
): NormalizedObservation | null {
  const transactionHash =
    normalizeHash(
      observation.transactionHash
    );

  const from =
    normalizeAddress(
      observation.from
    );

  const to =
    normalizeAddress(
      observation.to
    );

  if (
    !transactionHash ||
    !from ||
    !to
  ) {
    return null;
  }

  if (
    observation.kind ===
      "evm_transaction"
  ) {
    const rawValue =
      observation.rawValue ===
        null
        ? null
        : normalizeRawValue(
            observation.rawValue
          );

    if (
      observation.rawValue !==
        null &&
      rawValue === null
    ) {
      return null;
    }

    return {
      kind:
        "evm_transaction",

      transactionHash,

      blockNumber:
        observation.blockNumber,

      timestamp:
        observation.timestamp,

      from,
      to,

      tokenAddress:
        null,

      rawValue,
    };
  }

  const tokenAddress =
    normalizeAddress(
      observation.tokenAddress
    );

  const rawValue =
    normalizeRawValue(
      observation.rawValue
    );

  if (
    !tokenAddress ||
    rawValue === null
  ) {
    return null;
  }

  return {
    kind:
      "erc20_transfer",

    transactionHash,

    blockNumber:
      observation.blockNumber,

    timestamp:
      observation.timestamp,

    from,
    to,

    tokenAddress,

    rawValue,
  };
}

function observationKey(
  observation:
    NormalizedObservation
): string {
  return [
    observation.kind,
    observation.transactionHash,
    observation.from,
    observation.to,
    observation.tokenAddress ??
      "",
    observation.rawValue ??
      "",
  ].join("|");
}

function canonicalPair(
  left: string,
  right: string
): readonly [
  string,
  string,
] {
  return left.localeCompare(
    right
  ) <= 0
    ? [left, right]
    : [right, left];
}

function graphEdgeId(
  addressA: string,
  addressB: string
): string {
  return (
    `evm:${addressA}:${addressB}`
  );
}

function getEdge(
  edges:
    Map<
      string,
      EdgeAccumulator
    >,
  left: string,
  right: string
): EdgeAccumulator {
  const [
    addressA,
    addressB,
  ] = canonicalPair(
    left,
    right
  );

  const id =
    graphEdgeId(
      addressA,
      addressB
    );

  const existing =
    edges.get(id);

  if (existing) {
    return existing;
  }

  const created:
    EdgeAccumulator = {
    id,

    addressA,
    addressB,

    aToBInteractionCount:
      0,

    bToAInteractionCount:
      0,

    transactionCount:
      0,

    transferCount:
      0,

    evidenceKinds:
      new Set(),

    evidenceObservationKeys:
      new Set(),

    evidenceTransactionHashes:
      new Set(),

    observedTokenAddresses:
      new Set(),

    ...emptySeenRange(),
  };

  edges.set(
    id,
    created
  );

  return created;
}

function otherAddress(
  edge:
    EdgeAccumulator,
  address: string
): string | null {
  if (
    edge.addressA ===
    address
  ) {
    return edge.addressB;
  }

  if (
    edge.addressB ===
    address
  ) {
    return edge.addressA;
  }

  return null;
}

function directionFor(
  edge:
    EdgeAccumulator
): EvmWalletGraphDirection {
  if (
    edge.aToBInteractionCount >
      0 &&
    edge.bToAInteractionCount >
      0
  ) {
    return "bidirectional";
  }

  return edge
    .aToBInteractionCount > 0
    ? "a_to_b"
    : "b_to_a";
}

function edgeStrengthSort(
  address: string
) {
  return (
    left: EdgeAccumulator,
    right: EdgeAccumulator
  ) => {
    const evidenceDifference =
      right
        .evidenceObservationKeys
        .size -
      left
        .evidenceObservationKeys
        .size;

    if (
      evidenceDifference !== 0
    ) {
      return evidenceDifference;
    }

    const transactionDifference =
      right
        .evidenceTransactionHashes
        .size -
      left
        .evidenceTransactionHashes
        .size;

    if (
      transactionDifference !==
      0
    ) {
      return transactionDifference;
    }

    const leftOther =
      otherAddress(
        left,
        address
      ) ?? "";

    const rightOther =
      otherAddress(
        right,
        address
      ) ?? "";

    return (
      leftOther.localeCompare(
        rightOther
      ) ||
      left.id.localeCompare(
        right.id
      )
    );
  };
}

function validateBounds(
  maxHops: number,
  maxNodes: number,
  maxEdges: number
) {
  if (
    !Number.isSafeInteger(
      maxHops
    ) ||
    maxHops < 1 ||
    maxHops >
      MAX_EVM_GRAPH_HOPS
  ) {
    throw new Error(
      `maxHops must be an integer between 1 and ${MAX_EVM_GRAPH_HOPS}.`
    );
  }

  if (
    !Number.isSafeInteger(
      maxNodes
    ) ||
    maxNodes < 2 ||
    maxNodes >
      MAX_EVM_GRAPH_NODES
  ) {
    throw new Error(
      `maxNodes must be an integer between 2 and ${MAX_EVM_GRAPH_NODES}.`
    );
  }

  if (
    !Number.isSafeInteger(
      maxEdges
    ) ||
    maxEdges < 1 ||
    maxEdges >
      MAX_EVM_GRAPH_EDGES
  ) {
    throw new Error(
      `maxEdges must be an integer between 1 and ${MAX_EVM_GRAPH_EDGES}.`
    );
  }
}

export function evmTransactionsToGraphObservations(
  transactions:
    readonly EvmTransactionGraphInput[]
): readonly EvmTransactionGraphObservation[] {
  const observations:
    EvmTransactionGraphObservation[] =
      [];

  for (
    const transaction of
      transactions
  ) {
    if (
      transaction.from ===
        null ||
      transaction.to === null
    ) {
      continue;
    }

    observations.push({
      kind:
        "evm_transaction",

      transactionHash:
        transaction.hash,

      blockNumber:
        transaction.blockNumber,

      timestamp:
        transaction.timestamp,

      from:
        transaction.from,

      to:
        transaction.to,

      rawValue:
        transaction.value,
    });
  }

  return observations;
}

export function evmTransfersToGraphObservations(
  transfers:
    readonly EvmTransferGraphInput[]
): readonly EvmTransferGraphObservation[] {
  return transfers.map(
    transfer => ({
      kind:
        "erc20_transfer",

      transactionHash:
        transfer.transactionHash,

      blockNumber:
        transfer.blockNumber,

      timestamp:
        transfer.timestamp,

      from:
        transfer.from,

      to:
        transfer.to,

      tokenAddress:
        transfer.tokenAddress,

      rawValue:
        transfer.value,
    })
  );
}

export function analyzeEvmWalletGraph(
  request:
    AnalyzeEvmWalletGraphRequest
): EvmWalletGraph {
  const rootAddress =
    normalizeAddress(
      request.rootAddress
    );

  if (!rootAddress) {
    throw new Error(
      "Invalid EVM graph root address."
    );
  }

  validateBounds(
    request.maxHops,
    request.maxNodes,
    request.maxEdges
  );

  const normalizedObservations:
    NormalizedObservation[] =
      [];

  const seenObservations =
    new Set<string>();

  let duplicateEvidenceCount =
    0;

  let ignoredEvidenceCount =
    0;

  for (
    const raw of
      request.observations
  ) {
    const observation =
      normalizeObservation(raw);

    if (!observation) {
      ignoredEvidenceCount +=
        1;
      continue;
    }

    if (
      observation.from ===
      observation.to
    ) {
      ignoredEvidenceCount +=
        1;
      continue;
    }

    const key =
      observationKey(
        observation
      );

    if (
      seenObservations.has(
        key
      )
    ) {
      duplicateEvidenceCount +=
        1;
      continue;
    }

    seenObservations.add(
      key
    );

    normalizedObservations.push(
      observation
    );
  }

  const edges =
    new Map<
      string,
      EdgeAccumulator
    >();

  for (
    const observation of
      normalizedObservations
  ) {
    const edge =
      getEdge(
        edges,
        observation.from,
        observation.to
      );

    const key =
      observationKey(
        observation
      );

    edge
      .evidenceObservationKeys
      .add(key);

    edge
      .evidenceTransactionHashes
      .add(
        observation.transactionHash
      );

    edge.evidenceKinds.add(
      observation.kind
    );

    if (
      observation.tokenAddress
    ) {
      edge
        .observedTokenAddresses
        .add(
          observation.tokenAddress
        );
    }

    if (
      observation.from ===
      edge.addressA
    ) {
      edge.aToBInteractionCount +=
        1;
    } else {
      edge.bToAInteractionCount +=
        1;
    }

    if (
      observation.kind ===
        "evm_transaction"
    ) {
      edge.transactionCount +=
        1;
    } else {
      edge.transferCount +=
        1;
    }

    includeTimestamp(
      edge,
      observation.timestamp
    );
  }

  const adjacency =
    new Map<
      string,
      EdgeAccumulator[]
    >();

  for (
    const edge of
      edges.values()
  ) {
    const left =
      adjacency.get(
        edge.addressA
      ) ?? [];

    left.push(edge);

    adjacency.set(
      edge.addressA,
      left
    );

    const right =
      adjacency.get(
        edge.addressB
      ) ?? [];

    right.push(edge);

    adjacency.set(
      edge.addressB,
      right
    );
  }

  for (
    const [
      address,
      adjacentEdges,
    ] of adjacency
  ) {
    adjacentEdges.sort(
      edgeStrengthSort(
        address
      )
    );
  }

  const discoveries =
    new Map<
      string,
      NodeDiscovery
    >();

  discoveries.set(
    rootAddress,
    {
      address:
        rootAddress,

      depth: 0,

      parentAddress:
        null,

      discoveryEdgeId:
        null,
    }
  );

  const queue = [
    rootAddress,
  ];

  const treeEdgeIds =
    new Set<string>();

  let queueIndex = 0;

  let hopLimitReached =
    false;

  let nodeLimitReached =
    false;

  let edgeLimitReached =
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

    const discovery =
      discoveries.get(
        current
      );

    if (!discovery) {
      continue;
    }

    const adjacentEdges =
      adjacency.get(
        current
      ) ?? [];

    if (
      discovery.depth >=
      request.maxHops
    ) {
      if (
        adjacentEdges.some(
          edge => {
            const other =
              otherAddress(
                edge,
                current
              );

            return (
              other !== null &&
              !discoveries.has(
                other
              )
            );
          }
        )
      ) {
        hopLimitReached =
          true;
      }

      continue;
    }

    for (
      const edge of
        adjacentEdges
    ) {
      const other =
        otherAddress(
          edge,
          current
        );

      if (
        !other ||
        discoveries.has(
          other
        )
      ) {
        continue;
      }

      if (
        discoveries.size >=
        request.maxNodes
      ) {
        nodeLimitReached =
          true;
        continue;
      }

      if (
        treeEdgeIds.size >=
        request.maxEdges
      ) {
        edgeLimitReached =
          true;
        continue;
      }

      discoveries.set(
        other,
        {
          address:
            other,

          depth:
            discovery.depth +
            1,

          parentAddress:
            current,

          discoveryEdgeId:
            edge.id,
        }
      );

      treeEdgeIds.add(
        edge.id
      );

      queue.push(
        other
      );
    }
  }

  const eligibleEdges =
    [...edges.values()]
      .filter(
        edge =>
          discoveries.has(
            edge.addressA
          ) &&
          discoveries.has(
            edge.addressB
          )
      );

  const selectedEdgeIds =
    new Set(
      treeEdgeIds
    );

  const extraEdges =
    eligibleEdges
      .filter(
        edge =>
          !selectedEdgeIds.has(
            edge.id
          )
      )
      .sort(
        (left, right) => {
          const leftDepth =
            Math.max(
              discoveries.get(
                left.addressA
              )?.depth ?? 0,

              discoveries.get(
                left.addressB
              )?.depth ?? 0
            );

          const rightDepth =
            Math.max(
              discoveries.get(
                right.addressA
              )?.depth ?? 0,

              discoveries.get(
                right.addressB
              )?.depth ?? 0
            );

          return (
            leftDepth -
              rightDepth ||
            right
              .evidenceObservationKeys
              .size -
              left
                .evidenceObservationKeys
                .size ||
            left.id.localeCompare(
              right.id
            )
          );
        }
      );

  for (
    const edge of
      extraEdges
  ) {
    if (
      selectedEdgeIds.size >=
      request.maxEdges
    ) {
      edgeLimitReached =
        true;
      break;
    }

    selectedEdgeIds.add(
      edge.id
    );
  }

  const selectedEdges =
    eligibleEdges
      .filter(
        edge =>
          selectedEdgeIds.has(
            edge.id
          )
      )
      .sort(
        (left, right) => {
          const leftDepth =
            Math.max(
              discoveries.get(
                left.addressA
              )?.depth ?? 0,

              discoveries.get(
                left.addressB
              )?.depth ?? 0
            );

          const rightDepth =
            Math.max(
              discoveries.get(
                right.addressA
              )?.depth ?? 0,

              discoveries.get(
                right.addressB
              )?.depth ?? 0
            );

          return (
            leftDepth -
              rightDepth ||
            right
              .evidenceObservationKeys
              .size -
              left
                .evidenceObservationKeys
                .size ||
            left.id.localeCompare(
              right.id
            )
          );
        }
      );

  const nodeStats =
    new Map<
      string,
      NodeStats
    >();

  for (
    const address of
      discoveries.keys()
  ) {
    nodeStats.set(
      address,
      {
        degree: 0,

        interactionCount:
          0,

        evidenceTransactionHashes:
          new Set(),

        observedTokenAddresses:
          new Set(),
      }
    );
  }

  const graphEvidenceHashes =
    new Set<string>();

  const graphRange =
    emptySeenRange();

  let graphEvidenceCount = 0;

  let graphTransactionObservationCount =
    0;

  let graphTransferObservationCount =
    0;

  for (
    const edge of
      selectedEdges
  ) {
    graphEvidenceCount +=
      edge
        .evidenceObservationKeys
        .size;

    graphTransactionObservationCount +=
      edge.transactionCount;

    graphTransferObservationCount +=
      edge.transferCount;

    includeTimestamp(
      graphRange,
      edge.firstSeen
    );

    includeTimestamp(
      graphRange,
      edge.lastSeen
    );

    const statsA =
      nodeStats.get(
        edge.addressA
      );

    const statsB =
      nodeStats.get(
        edge.addressB
      );

    if (
      !statsA ||
      !statsB
    ) {
      continue;
    }

    statsA.degree += 1;
    statsB.degree += 1;

    const interactionCount =
      edge
        .evidenceObservationKeys
        .size;

    statsA.interactionCount +=
      interactionCount;

    statsB.interactionCount +=
      interactionCount;

    for (
      const hash of
        edge
          .evidenceTransactionHashes
    ) {
      statsA
        .evidenceTransactionHashes
        .add(hash);

      statsB
        .evidenceTransactionHashes
        .add(hash);

      graphEvidenceHashes.add(
        hash
      );
    }

    for (
      const tokenAddress of
        edge
          .observedTokenAddresses
    ) {
      statsA
        .observedTokenAddresses
        .add(
          tokenAddress
        );

      statsB
        .observedTokenAddresses
        .add(
          tokenAddress
        );
    }
  }

  const entityEvidence =
    request.entityEvidence ??
      [];

  const nodes:
    EvmWalletGraphNode[] =
      [...discoveries.values()]
        .sort(
          (left, right) =>
            left.depth -
              right.depth ||
            left.address.localeCompare(
              right.address
            )
        )
        .map(
          (
            discovery,
            index
          ) => {
            const stats =
              nodeStats.get(
                discovery.address
              );

            return {
              rank:
                index + 1,

              address:
                discovery.address,

              depth:
                discovery.depth,

              isRoot:
                discovery.address ===
                rootAddress,

              parentAddress:
                discovery
                  .parentAddress,

              discoveryEdgeId:
                discovery
                  .discoveryEdgeId,

              attribution:
                resolveEvmEntityAttribution(
                  discovery.address,
                  entityEvidence
                ),

              degree:
                stats?.degree ??
                0,

              interactionCount:
                stats
                  ?.interactionCount ??
                0,

              evidenceTransactionHashes:
                [
                  ...(
                    stats
                      ?.evidenceTransactionHashes ??
                    new Set<string>()
                  ),
                ].sort(),

              observedTokenAddresses:
                [
                  ...(
                    stats
                      ?.observedTokenAddresses ??
                    new Set<string>()
                  ),
                ].sort(),
            };
          }
        );

  const normalizedEdges:
    EvmWalletGraphEdge[] =
      selectedEdges.map(
        (
          edge,
          index
        ) => ({
          rank:
            index + 1,

          id:
            edge.id,

          addressA:
            edge.addressA,

          addressB:
            edge.addressB,

          direction:
            directionFor(
              edge
            ),

          aToBInteractionCount:
            edge
              .aToBInteractionCount,

          bToAInteractionCount:
            edge
              .bToAInteractionCount,

          interactionCount:
            edge
              .evidenceObservationKeys
              .size,

          transactionCount:
            edge.transactionCount,

          transferCount:
            edge.transferCount,

          evidenceKinds:
            [
              ...edge
                .evidenceKinds,
            ].sort(),

          evidenceObservationCount:
            edge
              .evidenceObservationKeys
              .size,

          evidenceTransactionHashes:
            [
              ...edge
                .evidenceTransactionHashes,
            ].sort(),

          observedTokenAddresses:
            [
              ...edge
                .observedTokenAddresses,
            ].sort(),

          firstSeen:
            edge.firstSeen,

          lastSeen:
            edge.lastSeen,
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
    hopLimitReached ||
    nodeLimitReached ||
    edgeLimitReached;

  return {
    rootAddress,

    nodeCount:
      nodes.length,

    edgeCount:
      normalizedEdges.length,

    maxDepthReached,

    inputEvidenceCount:
      request.observations.length,

    normalizedEvidenceCount:
      normalizedObservations.length,

    graphEvidenceCount,

    excludedEvidenceCount:
      Math.max(
        0,
        normalizedObservations.length -
          graphEvidenceCount
      ),

    duplicateEvidenceCount,

    ignoredEvidenceCount,

    graphTransactionObservationCount,

    graphTransferObservationCount,

    uniqueEvidenceTransactionCount:
      graphEvidenceHashes.size,

    firstSeen:
      graphRange.firstSeen,

    lastSeen:
      graphRange.lastSeen,

    nodes,

    edges:
      normalizedEdges,

    coverage: {
      ...request
        .evidenceCoverage,

      traversal:
        "undirected_shortest_path",

      maxHops:
        request.maxHops,

      maxNodes:
        request.maxNodes,

      maxEdges:
        request.maxEdges,

      hopLimitReached,

      nodeLimitReached,

      edgeLimitReached,

      truncated,
    },
  };
}
