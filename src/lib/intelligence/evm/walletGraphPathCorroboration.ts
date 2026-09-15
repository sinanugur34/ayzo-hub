import type {
  EvmWalletGraph,
  EvmWalletGraphObservation,
} from "./walletGraph";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

const TX_HASH =
  /^0x[0-9a-fA-F]{64}$/;

export type EvmDirectedPathEvidence = {
  walletAddress: string;

  hopCount: number;

  addresses:
    readonly string[];

  evidenceTransactionHashes:
    readonly string[];
};

export type EvmMultiHopPathCorroboration = {
  sourceAddress: string;

  wallets:
    readonly string[];

  pathCount: number;

  maxPathHops: number;

  evidenceTransactionHashes:
    readonly string[];

  paths:
    readonly EvmDirectedPathEvidence[];
};

export type AnalyzeEvmMultiHopPathCorroborationRequest = {
  graph:
    EvmWalletGraph;

  targetWallets:
    readonly string[];

  observations:
    readonly EvmWalletGraphObservation[];

  maxPathHops:
    number;
};

type DirectedEdgeEvidence = {
  from: string;
  to: string;

  evidenceTransactionHashes:
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

function canonicalPairKey(
  left: string,
  right: string
): string {
  return left.localeCompare(
    right
  ) <= 0
    ? `${left}|${right}`
    : `${right}|${left}`;
}

function directedKey(
  from: string,
  to: string
): string {
  return `${from}>${to}`;
}

function buildDirectedEvidence(
  graph: EvmWalletGraph,
  observations:
    readonly EvmWalletGraphObservation[]
): Map<string, DirectedEdgeEvidence> {
  const selectedNodes =
    new Set(
      graph.nodes.map(
        node =>
          node.address
            .toLowerCase()
      )
    );

  const selectedPairs =
    new Set(
      graph.edges.map(
        edge =>
          canonicalPairKey(
            edge.addressA
              .toLowerCase(),
            edge.addressB
              .toLowerCase()
          )
      )
    );

  const directed =
    new Map<
      string,
      DirectedEdgeEvidence
    >();

  for (
    const observation of
      observations
  ) {
    const from =
      normalizeAddress(
        observation.from
      );

    const to =
      normalizeAddress(
        observation.to
      );

    const hash =
      normalizeHash(
        observation.transactionHash
      );

    if (
      !from ||
      !to ||
      !hash ||
      from === to ||
      !selectedNodes.has(from) ||
      !selectedNodes.has(to) ||
      !selectedPairs.has(
        canonicalPairKey(
          from,
          to
        )
      )
    ) {
      continue;
    }

    const key =
      directedKey(
        from,
        to
      );

    const edge =
      directed.get(key) ?? {
        from,
        to,

        evidenceTransactionHashes:
          new Set<string>(),
      };

    edge
      .evidenceTransactionHashes
      .add(hash);

    directed.set(
      key,
      edge
    );
  }

  return directed;
}

function findShortestDirectedPath(
  source: string,
  target: string,
  targetSet: ReadonlySet<string>,
  adjacency:
    ReadonlyMap<
      string,
      readonly DirectedEdgeEvidence[]
    >,
  maxPathHops: number
): EvmDirectedPathEvidence | null {
  type QueueItem = {
    address: string;

    addresses:
      readonly string[];

    evidenceTransactionHashes:
      readonly string[];
  };

  const queue:
    QueueItem[] = [
      {
        address:
          source,

        addresses: [
          source,
        ],

        evidenceTransactionHashes:
          [],
      },
    ];

  const visitedDepth =
    new Map<
      string,
      number
    >();

  visitedDepth.set(
    source,
    0
  );

  let index = 0;

  while (
    index <
    queue.length
  ) {
    const current =
      queue[index];

    index += 1;

    const hops =
      current.addresses
        .length - 1;

    if (
      current.address ===
        target
    ) {
      return {
        walletAddress:
          target,

        hopCount:
          hops,

        addresses:
          current.addresses,

        evidenceTransactionHashes:
          [
            ...new Set(
              current
                .evidenceTransactionHashes
            ),
          ].sort(),
      };
    }

    if (
      hops >=
      maxPathHops
    ) {
      continue;
    }

    const outgoing =
      adjacency.get(
        current.address
      ) ?? [];

    for (
      const edge of
        outgoing
    ) {
      /*
       * A path to one target may not pass through another
       * coordination target and then claim that second
       * wallet as an independently corroborated branch.
       */
      if (
        targetSet.has(
          edge.to
        ) &&
        edge.to !==
          target
      ) {
        continue;
      }

      if (
        current.addresses
          .includes(
            edge.to
          )
      ) {
        continue;
      }

      const nextDepth =
        hops + 1;

      const previousDepth =
        visitedDepth.get(
          edge.to
        );

      if (
        previousDepth !==
          undefined &&
        previousDepth <
          nextDepth
      ) {
        continue;
      }

      visitedDepth.set(
        edge.to,
        nextDepth
      );

      queue.push({
        address:
          edge.to,

        addresses: [
          ...current.addresses,
          edge.to,
        ],

        evidenceTransactionHashes: [
          ...current
            .evidenceTransactionHashes,
          ...edge
            .evidenceTransactionHashes,
        ],
      });
    }
  }

  return null;
}

export function analyzeEvmMultiHopPathCorroboration(
  request:
    AnalyzeEvmMultiHopPathCorroborationRequest
): readonly EvmMultiHopPathCorroboration[] {
  if (
    !Number.isSafeInteger(
      request.maxPathHops
    ) ||
    request.maxPathHops <
      2 ||
    request.maxPathHops >
      request.graph.coverage
        .maxHops
  ) {
    throw new Error(
      "maxPathHops must be an integer between 2 and the graph maxHops."
    );
  }

  const targetWallets =
    [
      ...new Set(
        request
          .targetWallets
          .map(
            normalizeAddress
          )
          .filter(
            (
              address
            ): address is string =>
              address !== null
          ),
      ),
    ].sort();

  if (
    targetWallets.length <
      2
  ) {
    return [];
  }

  const selectedNodeSet =
    new Set(
      request.graph.nodes.map(
        node =>
          node.address
            .toLowerCase()
      )
    );

  const boundedTargets =
    targetWallets.filter(
      wallet =>
        selectedNodeSet.has(
          wallet
        )
    );

  if (
    boundedTargets.length <
      2
  ) {
    return [];
  }

  const targetSet =
    new Set(
      boundedTargets
    );

  const directedEvidence =
    buildDirectedEvidence(
      request.graph,
      request.observations
    );

  const adjacency =
    new Map<
      string,
      DirectedEdgeEvidence[]
    >();

  for (
    const edge of
      directedEvidence
        .values()
  ) {
    const list =
      adjacency.get(
        edge.from
      ) ?? [];

    list.push(edge);

    adjacency.set(
      edge.from,
      list
    );
  }

  for (
    const edges of
      adjacency.values()
  ) {
    edges.sort(
      (left, right) =>
        left.to.localeCompare(
          right.to
        )
    );
  }

  const candidates =
    request.graph.nodes
      .map(
        node =>
          node.address
            .toLowerCase()
      )
      .filter(
        address =>
          !targetSet.has(
            address
          )
      )
      .sort();

  const corroborations:
    EvmMultiHopPathCorroboration[] =
      [];

  for (
    const sourceAddress of
      candidates
  ) {
    const paths =
      boundedTargets
        .map(
          target =>
            findShortestDirectedPath(
              sourceAddress,
              target,
              targetSet,
              adjacency,
              request.maxPathHops
            )
        )
        .filter(
          (
            path
          ): path is
            EvmDirectedPathEvidence =>
              path !== null
        );

    if (
      paths.length < 2
    ) {
      continue;
    }

    /*
     * Pure one-hop shared counterparties/funders are already
     * represented by existing coordination signals. V2.2 is
     * specifically for evidence that adds multi-hop context.
     */
    if (
      !paths.some(
        path =>
          path.hopCount >=
          2
      )
    ) {
      continue;
    }

    const evidenceHashes =
      new Set<string>();

    for (
      const path of
        paths
    ) {
      for (
        const hash of
          path
            .evidenceTransactionHashes
      ) {
        evidenceHashes.add(
          hash
        );
      }
    }

    corroborations.push({
      sourceAddress,

      wallets:
        paths
          .map(
            path =>
              path.walletAddress
          )
          .sort(),

      pathCount:
        paths.length,

      maxPathHops:
        Math.max(
          ...paths.map(
            path =>
              path.hopCount
          )
        ),

      evidenceTransactionHashes:
        [
          ...evidenceHashes,
        ].sort(),

      paths:
        paths.sort(
          (
            left,
            right
          ) =>
            left.hopCount -
              right.hopCount ||
            left.walletAddress
              .localeCompare(
                right
                  .walletAddress
              )
        ),
    });
  }

  return corroborations
    .sort(
      (
        left,
        right
      ) =>
        right.wallets.length -
          left.wallets.length ||
        right
          .evidenceTransactionHashes
          .length -
          left
            .evidenceTransactionHashes
            .length ||
        left.sourceAddress
          .localeCompare(
            right
              .sourceAddress
          )
    );
}
