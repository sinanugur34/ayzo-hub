import type {
  ActivityTimeline,
  ActivityTimelineEvent,
} from "@/lib/intelligence/activityTimeline";

import type {
  VisualEvidenceEdge,
  VisualEvidenceGraph,
  VisualEvidenceNode,
} from "@/lib/intelligence/visualEvidenceGraph";

import type {
  CosmosSdkDerivedAnalysis,
} from "@/lib/intelligence/cosmosSdk";

type CosmosLike = {
  network:
    "cosmos" |
    "injective";

  address:
    string;

  analysisPlan:
    "free" |
    "pro" |
    "advanced";

  transactions:
    readonly unknown[];

  derived:
    CosmosSdkDerivedAnalysis;
};

export function buildCosmosSdkActivityTimeline(
  data:
    CosmosLike
): ActivityTimeline {
  const maxEvents =
    data.analysisPlan ===
      "advanced"
      ? 48
      : data.analysisPlan ===
          "pro"
        ? 24
        : 12;

  const events:
    ActivityTimelineEvent[] =
      data.derived
        .flow
        .transfers
        .map(
          (
            transfer,
            index
          ) => ({
            id:
              `${data.network}:${transfer.transactionHash}:${index}`,

            timestamp:
              transfer.timestamp,

            blockNumber:
              null,

            kind:
              transfer.kind ===
                "bank"
                ? "native_transfer" as const
                : "token_transfer" as const,

            direction:
              transfer.direction,

            from:
              transfer.direction ===
                "incoming"
                ? transfer.counterparty
                : data.address,

            to:
              transfer.direction ===
                "incoming"
                ? data.address
                : transfer.counterparty,

            counterparty:
              transfer.counterparty,

            asset:
              transfer.denom,

            assetAddress:
              null,

            rawValue:
              transfer.amount,

            formattedValue:
              transfer.amount,

            transactionHash:
              transfer
                .transactionHash,

            evidenceState:
              "SUPPORTED" as const,

            whyItMatters:
              transfer.kind ===
                "ibc"
                ? "Explicit IBC transfer message observed in the bounded native transaction window."
                : "Explicit Cosmos SDK bank transfer message observed in the bounded native transaction window.",
          })
        );

  return {
    status:
      events.length >
        0
        ? "limited"
        : "unavailable",

    limitation:
      "Timeline contains explicit bank and IBC transfer message evidence only. Delegation, exchange, CosmWasm and token-factory messages retain separate protocol semantics.",

    events:
      events.slice(
        0,
        maxEvents
      ),

    evidenceWindow: {
      transactionCount:
        data.transactions.length,

      transferCount:
        events.length,

      maxEvents,
    },
  };
}

export function buildCosmosSdkVisualEvidenceGraph(
  data:
    CosmosLike
): VisualEvidenceGraph {
  const maxNodes =
    data.analysisPlan ===
      "advanced"
      ? 32
      : data.analysisPlan ===
          "pro"
        ? 16
        : 8;

  const maxEdges =
    data.analysisPlan ===
      "advanced"
      ? 56
      : data.analysisPlan ===
          "pro"
        ? 28
        : 12;

  const rootId =
    `${data.network}:${data.address}`;

  const fundingSource =
    data.derived
      .observedFunding
      ?.sourceAddress ??
    null;

  const nodes:
    VisualEvidenceNode[] = [
      {
        id:
          rootId,

        kind:
          "root_wallet",

        label:
          data.address,

        detail:
          data.network ===
            "injective"
            ? "Analyzed Injective account"
            : "Analyzed Cosmos Hub account",

        evidenceState:
          "SUPPORTED",
      },
    ];

  const edges:
    VisualEvidenceEdge[] =
      [];

  for (
    const item of
    data.derived
      .counterparties
      .items
      .slice(
        0,
        Math.max(
          0,
          maxNodes -
            1
        )
      )
  ) {
    const nodeId =
      `${data.network}:${item.address}`;

    nodes.push({
      id:
        nodeId,

      kind:
        item.address ===
          fundingSource
          ? "funding_source"
          : "wallet",

      label:
        item.address,

      detail:
        `${item.observationCount} explicit native message relationship(s)`,

      evidenceState:
        "SUPPORTED",
    });

    const incomingOnly =
      item.incomingCount >
        0 &&
      item.outgoingCount ===
        0;

    edges.push({
      id:
        `${data.network}-edge:${item.address}`,

      source:
        incomingOnly
          ? nodeId
          : rootId,

      target:
        incomingOnly
          ? rootId
          : nodeId,

      kind:
        item.address ===
          fundingSource
          ? "funding"
          : "direct_interaction",

      direction:
        item.incomingCount >
          0 &&
        item.outgoingCount >
          0
          ? "bidirectional"
          : "forward",

      label:
        `${item.observationCount} explicit transfer relationship(s)`,

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        item.observationCount,

      evidenceRefs:
        item.transactionHashes,
    });

    if (
      edges.length >=
        maxEdges
    ) {
      break;
    }
  }

  return {
    status:
      edges.length >
        0
        ? "limited"
        : "unavailable",

    nodes:
      nodes.slice(
        0,
        maxNodes
      ),

    edges:
      edges.slice(
        0,
        maxEdges
      ),

    limitation:
      "Graph contains explicit bank or IBC transfer counterparties only. Delegation, validator, exchange, contract and module relationships do not establish identity, ownership, intent or common control.",

    coverage: {
      maxNodes,

      maxEdges,

      ownershipInference:
        false,
    },
  };
}
