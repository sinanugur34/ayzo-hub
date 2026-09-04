export type VisualEvidenceGraphStatus =
  | "complete"
  | "limited"
  | "unavailable";

export type VisualEvidenceNodeKind =
  | "root_wallet"
  | "root_token"
  | "wallet"
  | "funding_source"
  | "transaction"
  | "evidence";

export type VisualEvidenceEdgeKind =
  | "transaction"
  | "token_transfer"
  | "funding"
  | "holder_position"
  | "direct_interaction"
  | "transaction_cooccurrence"
  | "address_history"
  | "canonical_evidence";

export type VisualEvidenceEdgeDirection =
  | "forward"
  | "bidirectional"
  | "observed";

export type VisualEvidenceNode = {
  id: string;
  kind: VisualEvidenceNodeKind;
  label: string;
  detail: string | null;
  evidenceState: "SUPPORTED";
};

export type VisualEvidenceEdge = {
  id: string;

  source:
    string;

  target:
    string;

  kind:
    VisualEvidenceEdgeKind;

  direction:
    VisualEvidenceEdgeDirection;

  label:
    string;

  evidenceState:
    "SUPPORTED";

  evidenceCount:
    number;

  evidenceRefs:
    readonly string[];
};

export type VisualEvidenceGraph = {
  status:
    VisualEvidenceGraphStatus;

  nodes:
    readonly VisualEvidenceNode[];

  edges:
    readonly VisualEvidenceEdge[];

  limitation:
    string | null;

  coverage: {
    maxNodes:
      number;

    maxEdges:
      number;

    ownershipInference:
      false;
  };
};

const DEFAULT_MAX_NODES = 8;
const DEFAULT_MAX_EDGES = 12;

function bounded(
  value:
    number | undefined,
  fallback:
    number,
  maximum:
    number
) {
  return Math.min(
    maximum,
    Math.max(
      1,
      value ??
        fallback
    )
  );
}

function lower(
  value:
    string
) {
  return value.toLowerCase();
}

function nodeId(
  prefix:
    string,
  value:
    string
) {
  return `${prefix}:${value}`;
}

function pushNode(
  nodes:
    VisualEvidenceNode[],
  seen:
    Set<string>,
  node:
    VisualEvidenceNode,
  maxNodes:
    number
) {
  if (
    nodes.length >=
      maxNodes ||
    seen.has(
      node.id
    )
  ) {
    return false;
  }

  nodes.push(
    node
  );

  seen.add(
    node.id
  );

  return true;
}


/* =================================================
   EVM
================================================= */

type EvmVisualGraphInput = {
  rootAddress:
    string;

  graph:
    | {
        nodes:
          readonly {
            address:
              string;

            depth:
              number;

            degree:
              number;

            interactionCount:
              number;
          }[];

        edges?:
          readonly {
            id:
              string;

            addressA:
              string;

            addressB:
              string;

            direction:
              | "a_to_b"
              | "b_to_a"
              | "bidirectional";

            interactionCount:
              number;

            transactionCount:
              number;

            transferCount:
              number;

            evidenceTransactionHashes?:
              readonly string[];
          }[];

        coverage?:
          {
            includesOwnershipInference?:
              false;

            limitation?:
              string | null;
          };
      }
    | null;

  funding:
    | {
        sources:
          readonly {
            sourceAddress:
              string;

            fundingObservationCount:
              number;

            evidenceTransactionCount:
              number;

            evidenceTransactionHashes?:
              readonly string[];
          }[];
      }
    | null;

  maxNodes?:
    number;

  maxEdges?:
    number;
};

export function buildEvmVisualEvidenceGraph(
  input:
    EvmVisualGraphInput
): VisualEvidenceGraph {
  const maxNodes =
    bounded(
      input.maxNodes,
      DEFAULT_MAX_NODES,
      12
    );

  const maxEdges =
    bounded(
      input.maxEdges,
      DEFAULT_MAX_EDGES,
      20
    );

  const nodes:
    VisualEvidenceNode[] = [];

  const edges:
    VisualEvidenceEdge[] = [];

  const seenNodes =
    new Set<string>();

  const rootAddress =
    lower(
      input.rootAddress
    );

  const rootId =
    nodeId(
      "evm",
      rootAddress
    );

  const fundingSources =
    new Map(
      (
        input.funding
          ?.sources ??
        []
      ).map(
        source => [
          lower(
            source.sourceAddress
          ),
          source,
        ]
      )
    );

  pushNode(
    nodes,
    seenNodes,
    {
      id:
        rootId,

      kind:
        "root_wallet",

      label:
        input.rootAddress,

      detail:
        "Analyzed address",

      evidenceState:
        "SUPPORTED",
    },
    maxNodes
  );

  const graphNodes = [
    ...(
      input.graph
        ?.nodes ??
      []
    ),
  ]
    .filter(
      node =>
        lower(
          node.address
        ) !==
        rootAddress
    )
    .sort(
      (
        left,
        right
      ) =>
        left.depth -
          right.depth ||
        right.interactionCount -
          left.interactionCount
    );

  for (
    const graphNode of
    graphNodes
  ) {
    const normalized =
      lower(
        graphNode.address
      );

    pushNode(
      nodes,
      seenNodes,
      {
        id:
          nodeId(
            "evm",
            normalized
          ),

        kind:
          fundingSources.has(
            normalized
          )
            ? "funding_source"
            : "wallet",

        label:
          graphNode.address,

        detail:
          `${graphNode.interactionCount} interaction(s) · depth ${graphNode.depth}`,

        evidenceState:
          "SUPPORTED",
      },
      maxNodes
    );
  }

  const includedAddresses =
    new Set(
      nodes
        .filter(
          node =>
            node.id.startsWith(
              "evm:"
            )
        )
        .map(
          node =>
            node.id.slice(
              4
            )
        )
    );

  for (
    const edge of
    input.graph?.edges ??
    []
  ) {
    if (
      edges.length >=
      maxEdges
    ) {
      break;
    }

    let sourceAddress =
      lower(
        edge.addressA
      );

    let targetAddress =
      lower(
        edge.addressB
      );

    let direction:
      VisualEvidenceEdgeDirection =
        "forward";

    if (
      edge.direction ===
      "b_to_a"
    ) {
      [
        sourceAddress,
        targetAddress,
      ] = [
        targetAddress,
        sourceAddress,
      ];
    } else if (
      edge.direction ===
      "bidirectional"
    ) {
      direction =
        "bidirectional";
    }

    if (
      !includedAddresses.has(
        sourceAddress
      ) ||
      !includedAddresses.has(
        targetAddress
      )
    ) {
      continue;
    }

    const kind:
      VisualEvidenceEdgeKind =
        edge.transferCount >
        0
          ? "token_transfer"
          : "transaction";

    edges.push({
      id:
        `evm-edge:${edge.id}`,

      source:
        nodeId(
          "evm",
          sourceAddress
        ),

      target:
        nodeId(
          "evm",
          targetAddress
        ),

      kind,

      direction,

      label:
        edge.transferCount >
        0
          ? `${edge.interactionCount} interaction(s) · ${edge.transferCount} token transfer(s)`
          : `${edge.transactionCount} transaction(s)`,

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        Math.max(
          1,
          edge.interactionCount
        ),

      evidenceRefs:
        edge
          .evidenceTransactionHashes ??
        [],
    });
  }

  /*
   * Some direct funding sources may not survive the
   * bounded graph-node ranking. Add them only while
   * there is remaining graph capacity.
   */
  for (
    const source of
    input.funding
      ?.sources ??
    []
  ) {
    if (
      nodes.length >=
        maxNodes ||
      edges.length >=
        maxEdges
    ) {
      break;
    }

    const normalized =
      lower(
        source.sourceAddress
      );

    const sourceId =
      nodeId(
        "evm",
        normalized
      );

    const alreadyIncluded =
      seenNodes.has(
        sourceId
      );

    if (
      !alreadyIncluded
    ) {
      pushNode(
        nodes,
        seenNodes,
        {
          id:
            sourceId,

          kind:
            "funding_source",

          label:
            source.sourceAddress,

          detail:
            `${source.fundingObservationCount} funding observation(s)`,

          evidenceState:
            "SUPPORTED",
        },
        maxNodes
      );
    }

    const existingEdge =
      edges.some(
        edge =>
          (
            edge.source ===
              sourceId &&
            edge.target ===
              rootId
          ) ||
          (
            edge.target ===
              sourceId &&
            edge.source ===
              rootId
          )
      );

    if (
      seenNodes.has(
        sourceId
      ) &&
      !existingEdge
    ) {
      edges.push({
        id:
          `evm-funding:${normalized}`,

        source:
          sourceId,

        target:
          rootId,

        kind:
          "funding",

        direction:
          "forward",

        label:
          `${source.fundingObservationCount} funding observation(s)`,

        evidenceState:
          "SUPPORTED",

        evidenceCount:
          Math.max(
            1,
            source.evidenceTransactionCount
          ),

        evidenceRefs:
          source
            .evidenceTransactionHashes ??
          [],
      });
    }
  }

  const hasEvidence =
    edges.length >
    0;

  return {
    status:
      hasEvidence
        ? "limited"
        : input.graph ||
            input.funding
          ? "limited"
          : "unavailable",

    nodes,

    edges,

    limitation:
      hasEvidence
        ? [
            "Graph is bounded to evidence already collected by AYZO.",
            input.graph
              ?.coverage
              ?.limitation ??
              null,
            "Graph proximity does not establish common ownership, identity, intent or control.",
          ]
            .filter(
              Boolean
            )
            .join(
              " "
            )
        : "No supported relationship or funding edges were available for visual graph construction.",

    coverage: {
      maxNodes,
      maxEdges,
      ownershipInference:
        false,
    },
  };
}


/* =================================================
   SOLANA
================================================= */

type SolanaVisualGraphInput = {
  tokenAddress:
    string;

  holders: {
    owners:
      readonly {
        rank:
          number;

        owner:
          string;

        percentage:
          number;
      }[];
  };

  relationships:
    | {
        relations:
          readonly {
            walletA:
              string;

            walletB:
              string;

            sharedTransactionCount:
              number;

            directSolTransferCount:
              number;

            directSol:
              number;
          }[];
      }
    | null;

  funding:
    | {
        perWallet:
          readonly {
            wallet:
              string;

            recentIncomingTransfers:
              readonly {
                source:
                  string;

                sol:
                  number;

                signature:
                  string;
              }[];
          }[];
      }
    | null;

  maxNodes?:
    number;

  maxEdges?:
    number;
};

export function buildSolanaVisualEvidenceGraph(
  input:
    SolanaVisualGraphInput
): VisualEvidenceGraph {
  const maxNodes =
    bounded(
      input.maxNodes,
      DEFAULT_MAX_NODES,
      12
    );

  const maxEdges =
    bounded(
      input.maxEdges,
      DEFAULT_MAX_EDGES,
      20
    );

  const nodes:
    VisualEvidenceNode[] = [];

  const edges:
    VisualEvidenceEdge[] = [];

  const seen =
    new Set<string>();

  const tokenId =
    nodeId(
      "sol-token",
      input.tokenAddress
    );

  pushNode(
    nodes,
    seen,
    {
      id:
        tokenId,

      kind:
        "root_token",

      label:
        input.tokenAddress,

      detail:
        "Analyzed token",

      evidenceState:
        "SUPPORTED",
    },
    maxNodes
  );

  const addWallet = (
    wallet:
      string,
    detail:
      string | null =
        null
  ) => {
    const id =
      nodeId(
        "sol-wallet",
        wallet
      );

    pushNode(
      nodes,
      seen,
      {
        id,

        kind:
          "wallet",

        label:
          wallet,

        detail,

        evidenceState:
          "SUPPORTED",
      },
      maxNodes
    );

    return id;
  };

  for (
    const holder of
    input.holders.owners.slice(
      0,
      4
    )
  ) {
    const holderId =
      addWallet(
        holder.owner,
        `Holder #${holder.rank}`
      );

    if (
      !seen.has(
        holderId
      ) ||
      edges.length >=
        maxEdges
    ) {
      continue;
    }

    edges.push({
      id:
        `sol-holder:${holder.owner}`,

      source:
        tokenId,

      target:
        holderId,

      kind:
        "holder_position",

      direction:
        "observed",

      label:
        `#${holder.rank} holder · ${holder.percentage.toFixed(
          2
        )}%`,

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        1,

      evidenceRefs:
        [],
    });
  }

  for (
    const relation of
    input.relationships
      ?.relations ??
    []
  ) {
    if (
      edges.length >=
      maxEdges
    ) {
      break;
    }

    const walletA =
      addWallet(
        relation.walletA
      );

    const walletB =
      addWallet(
        relation.walletB
      );

    if (
      !seen.has(
        walletA
      ) ||
      !seen.has(
        walletB
      )
    ) {
      continue;
    }

    const direct =
      relation.directSolTransferCount >
      0;

    edges.push({
      id:
        `sol-relation:${relation.walletA}:${relation.walletB}`,

      source:
        walletA,

      target:
        walletB,

      kind:
        direct
          ? "direct_interaction"
          : "transaction_cooccurrence",

      direction:
        "observed",

      label:
        direct
          ? `${relation.directSolTransferCount} direct SOL transfer(s)`
          : `${relation.sharedTransactionCount} shared transaction(s)`,

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        Math.max(
          1,
          relation.directSolTransferCount +
            relation.sharedTransactionCount
        ),

      evidenceRefs:
        [],
    });
  }

  const fundingEdges =
    new Map<
      string,
      {
        source:
          string;

        wallet:
          string;

        count:
          number;

        totalSol:
          number;

        signatures:
          string[];
      }
    >();

  for (
    const wallet of
    input.funding
      ?.perWallet ??
    []
  ) {
    for (
      const transfer of
      wallet.recentIncomingTransfers
    ) {
      const key =
        `${transfer.source}:${wallet.wallet}`;

      const existing =
        fundingEdges.get(
          key
        );

      if (existing) {
        existing.count +=
          1;

        existing.totalSol +=
          transfer.sol;

        existing.signatures.push(
          transfer.signature
        );
      } else {
        fundingEdges.set(
          key,
          {
            source:
              transfer.source,

            wallet:
              wallet.wallet,

            count:
              1,

            totalSol:
              transfer.sol,

            signatures: [
              transfer.signature,
            ],
          }
        );
      }
    }
  }

  for (
    const funding of
    fundingEdges.values()
  ) {
    if (
      edges.length >=
      maxEdges
    ) {
      break;
    }

    const walletId =
      addWallet(
        funding.wallet
      );

    const sourceId =
      nodeId(
        "sol-funder",
        funding.source
      );

    pushNode(
      nodes,
      seen,
      {
        id:
          sourceId,

        kind:
          "funding_source",

        label:
          funding.source,

        detail:
          `${funding.count} recent funding transfer(s)`,

        evidenceState:
          "SUPPORTED",
      },
      maxNodes
    );

    if (
      !seen.has(
        walletId
      ) ||
      !seen.has(
        sourceId
      )
    ) {
      continue;
    }

    edges.push({
      id:
        `sol-funding:${funding.source}:${funding.wallet}`,

      source:
        sourceId,

      target:
        walletId,

      kind:
        "funding",

      direction:
        "forward",

      label:
        `${funding.totalSol.toLocaleString(
          "en-US",
          {
            maximumFractionDigits:
              6,
          }
        )} SOL funding`,

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        funding.count,

      evidenceRefs:
        funding.signatures,
    });
  }

  return {
    status:
      edges.length >
      0
        ? "limited"
        : "limited",

    nodes,

    edges,

    limitation:
      edges.length >
      0
        ? "Solana evidence graph is bounded to observed top-holder positions, relationship evidence and recent direct SOL funding. It does not establish common ownership, identity, intent or control."
        : "No supported Solana relationship or funding edges were observed in the bounded evidence window.",

    coverage: {
      maxNodes,
      maxEdges,
      ownershipInference:
        false,
    },
  };
}


/* =================================================
   BITCOIN
================================================= */

type BitcoinVisualGraphInput = {
  address:
    string;

  history: {
    transactions:
      readonly {
        transactionHash:
          string;

        blockHeight:
          number | null;

        timestamp:
          string | null;
      }[];
  };

  canonicalTransaction:
    | {
        transactionHash:
          string;

        confirmed:
          boolean;

        confirmations:
          number | null;

        inputs:
          readonly unknown[];

        outputs:
          readonly unknown[];

        prevoutCoverage: {
          eligible:
            number;

          resolved:
            number;

          complete:
            boolean;
        };
      }
    | null;

  maxNodes?:
    number;

  maxEdges?:
    number;
};

export function buildBitcoinVisualEvidenceGraph(
  input:
    BitcoinVisualGraphInput
): VisualEvidenceGraph {
  const maxNodes =
    bounded(
      input.maxNodes,
      DEFAULT_MAX_NODES,
      10
    );

  const maxEdges =
    bounded(
      input.maxEdges,
      DEFAULT_MAX_EDGES,
      16
    );

  const nodes:
    VisualEvidenceNode[] = [];

  const edges:
    VisualEvidenceEdge[] = [];

  const seen =
    new Set<string>();

  const rootId =
    nodeId(
      "btc-address",
      input.address
    );

  pushNode(
    nodes,
    seen,
    {
      id:
        rootId,

      kind:
        "root_wallet",

      label:
        input.address,

      detail:
        "Analyzed Bitcoin address",

      evidenceState:
        "SUPPORTED",
    },
    maxNodes
  );

  for (
    const transaction of
    input.history.transactions.slice(
      0,
      5
    )
  ) {
    if (
      edges.length >=
      maxEdges
    ) {
      break;
    }

    const txId =
      nodeId(
        "btc-tx",
        transaction.transactionHash
      );

    pushNode(
      nodes,
      seen,
      {
        id:
          txId,

        kind:
          "transaction",

        label:
          transaction.transactionHash,

        detail:
          transaction.blockHeight ===
          null
            ? "Observed transaction"
            : `Block ${transaction.blockHeight}`,

        evidenceState:
          "SUPPORTED",
      },
      maxNodes
    );

    if (
      !seen.has(
        txId
      )
    ) {
      continue;
    }

    edges.push({
      id:
        `btc-history:${transaction.transactionHash}`,

      source:
        rootId,

      target:
        txId,

      kind:
        "address_history",

      direction:
        "observed",

      label:
        "Observed in address history",

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        1,

      evidenceRefs: [
        transaction.transactionHash,
      ],
    });
  }

  const canonical =
    input.canonicalTransaction;

  if (canonical) {
    const canonicalId =
      nodeId(
        "btc-tx",
        canonical.transactionHash
      );

    if (
      seen.has(
        canonicalId
      )
    ) {
      const summaries = [
        {
          id:
            "btc-evidence:inputs",

          label:
            "Inputs",

          detail:
            `${canonical.inputs.length} input(s) · ${canonical.prevoutCoverage.resolved}/${canonical.prevoutCoverage.eligible} prevouts resolved`,
        },

        {
          id:
            "btc-evidence:outputs",

          label:
            "Outputs",

          detail:
            `${canonical.outputs.length} output(s)`,
        },
      ];

      for (
        const summary of
        summaries
      ) {
        if (
          nodes.length >=
            maxNodes ||
          edges.length >=
            maxEdges
        ) {
          break;
        }

        pushNode(
          nodes,
          seen,
          {
            id:
              summary.id,

            kind:
              "evidence",

            label:
              summary.label,

            detail:
              summary.detail,

            evidenceState:
              "SUPPORTED",
          },
          maxNodes
        );

        edges.push({
          id:
            `${summary.id}:edge`,

          source:
            canonicalId,

          target:
            summary.id,

          kind:
            "canonical_evidence",

          direction:
            "observed",

          label:
            canonical.confirmed
              ? "Canonical confirmed evidence"
              : "Canonical evidence",

          evidenceState:
            "SUPPORTED",

          evidenceCount:
            1,

          evidenceRefs: [
            canonical.transactionHash,
          ],
        });
      }
    }
  }

  return {
    status:
      "limited",

    nodes,

    edges,

    limitation:
      edges.length >
      0
        ? "Bitcoin graph is limited to address-history membership and sampled canonical transaction evidence. Current evidence does not expose reliable counterparty addresses, so AYZO does not infer them."
        : "No Bitcoin transaction evidence was available for graph construction in the bounded history window.",

    coverage: {
      maxNodes,
      maxEdges,
      ownershipInference:
        false,
    },
  };
}
