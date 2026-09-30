import type {
  ActivityTimeline,
  ActivityTimelineEvent,
} from "@/lib/intelligence/activityTimeline";

import type {
  VisualEvidenceGraph,
  VisualEvidenceEdge,
  VisualEvidenceNode,
} from "@/lib/intelligence/visualEvidenceGraph";

import type {
  TonIntelligence,
} from "./engine";

export function buildTonActivityTimeline(
  data:
    TonIntelligence
): ActivityTimeline {
  const events:
    ActivityTimelineEvent[] =
      [];

  for (
    const transaction of
    data.history
      .transactions
  ) {
    const incoming =
      transaction.inbound;

    if (
      incoming &&
      incoming.source &&
      incoming.destination
    ) {
      events.push({
        id:
          `ton:${transaction.transactionHash}:in`,

        timestamp:
          transaction.timestamp,

        blockNumber:
          null,

        kind:
          "native_transfer",

        direction:
          "incoming",

        from:
          incoming.source,

        to:
          incoming.destination,

        counterparty:
          incoming.source,

        asset:
          "TON",

        assetAddress:
          null,

        rawValue:
          incoming.valueNano,

        formattedValue:
          incoming.valueNano,

        transactionHash:
          transaction
            .transactionHash,

        evidenceState:
          "SUPPORTED",

        whyItMatters:
          "Observed inbound TON message in bounded indexed evidence.",
      });
    }

    for (
      const [
        index,
        outbound,
      ] of
      transaction
        .outbound
        .entries()
    ) {
      if (
        !outbound.destination
      ) {
        continue;
      }

      events.push({
        id:
          `ton:${transaction.transactionHash}:out:${index}`,

        timestamp:
          transaction.timestamp,

        blockNumber:
          null,

        kind:
          "native_transfer",

        direction:
          "outgoing",

        from:
          data.address,

        to:
          outbound.destination,

        counterparty:
          outbound.destination,

        asset:
          "TON",

        assetAddress:
          null,

        rawValue:
          outbound.valueNano,

        formattedValue:
          outbound.valueNano,

        transactionHash:
          transaction
            .transactionHash,

        evidenceState:
          "SUPPORTED",

        whyItMatters:
          "Observed outbound TON message in bounded indexed evidence.",
      });
    }
  }

  return {
    status:
      events.length >
        0
        ? "limited"
        : "unavailable",

    limitation:
      `TON timeline is bounded to ${data.evidenceCoverage.historyLimit} indexed account transactions.`,

    events:
      events.slice(
        0,
        data.analysisPlan ===
          "advanced"
          ? 32
          : data.analysisPlan ===
              "pro"
            ? 16
            : 8
      ),

    evidenceWindow: {
      transactionCount:
        data.history
          .transactions
          .length,

      transferCount:
        events.length,

      maxEvents:
        data.analysisPlan ===
          "advanced"
          ? 32
          : data.analysisPlan ===
              "pro"
            ? 16
            : 8,
    },
  };
}

export function buildTonVisualEvidenceGraph(
  data:
    TonIntelligence
): VisualEvidenceGraph {
  const maxNodes =
    data.analysisPlan ===
      "advanced"
      ? 28
      : data.analysisPlan ===
          "pro"
        ? 14
        : 8;

  const maxEdges =
    data.analysisPlan ===
      "advanced"
      ? 48
      : data.analysisPlan ===
          "pro"
        ? 24
        : 12;

  const rootId =
    `ton:${data.address}`;

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
          `TON account · ${data.account.status ?? "unknown status"}`,

        evidenceState:
          "SUPPORTED",
      },
    ];

  const edges:
    VisualEvidenceEdge[] =
      [];

  const seen =
    new Set<string>([
      rootId,
    ]);

  if (
    data.derived
      .observedFunding
  ) {
    const funding =
      data.derived
        .observedFunding;

    const id =
      `ton:${funding.sourceAddress}`;

    nodes.push({
      id,

      kind:
        "funding_source",

      label:
        funding.sourceAddress,

      detail:
        "Observed early inbound TON source",

      evidenceState:
        "SUPPORTED",
    });

    seen.add(
      id
    );

    edges.push({
      id:
        `ton-funding:${funding.transactionHash}`,

      source:
        id,

      target:
        rootId,

      kind:
        "funding",

      direction:
        "forward",

      label:
        "Observed inbound TON",

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        1,

      evidenceRefs: [
        funding
          .transactionHash,
      ],
    });
  }

  for (
    const item of
    data.derived
      .counterparties
      .items
  ) {
    if (
      nodes.length >=
        maxNodes ||
      edges.length >=
        maxEdges
    ) {
      break;
    }

    const id =
      `ton:${item.address}`;

    if (
      seen.has(
        id
      )
    ) {
      continue;
    }

    seen.add(
      id
    );

    nodes.push({
      id,

      kind:
        "wallet",

      label:
        item.address,

      detail:
        `${item.interactionCount} direct TON/Jetton interaction signal(s)`,

      evidenceState:
        "SUPPORTED",
    });

    edges.push({
      id:
        `ton-edge:${item.address}`,

      source:
        rootId,

      target:
        id,

      kind:
        "direct_interaction",

      direction:
        item.incomingCount >
          0 &&
        item.outgoingCount >
          0
          ? "bidirectional"
          : "observed",

      label:
        "Observed TON relationship",

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        item
          .interactionCount,

      evidenceRefs:
        item
          .evidenceTransactionHashes,
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
      "TON graph uses direct indexed message and Jetton-transfer evidence only. Message relationships do not establish common ownership or identity.",

    coverage: {
      maxNodes,
      maxEdges,
      ownershipInference:
        false,
    },
  };
}
