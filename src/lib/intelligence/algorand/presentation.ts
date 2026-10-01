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
  AlgorandIntelligence,
} from "./engine";

function formatAlgo(
  value:
    string | null
) {
  if (!value) {
    return null;
  }

  try {
    const raw =
      BigInt(value);

    const whole =
      raw /
      1_000_000n;

    const fraction =
      (
        raw %
        1_000_000n
      )
        .toString()
        .padStart(
          6,
          "0"
        )
        .replace(
          /0+$/,
          ""
        );

    return fraction
      ? `${whole}.${fraction}`
      : whole.toString();
  } catch {
    return null;
  }
}

function timestampFromRoundTime(
  value:
    number | null
) {
  if (
    value === null ||
    !Number.isFinite(
      value
    )
  ) {
    return null;
  }

  try {
    return new Date(
      value * 1000
    ).toISOString();
  } catch {
    return null;
  }
}

export function buildAlgorandActivityTimeline(
  data:
    AlgorandIntelligence
): ActivityTimeline {
  const events:
    ActivityTimelineEvent[] =
      [];

  for (
    const [
      index,
      transfer,
    ] of data.derived
      .flow
      .transfers
      .entries()
  ) {
    /*
     * Do not invent transaction references.
     * A transfer without a canonical transaction ID
     * is omitted from the transaction timeline.
     */
    if (
      !transfer.transactionId
    ) {
      continue;
    }

    const native =
      transfer.asset ===
        "ALGO";

    events.push({
      id:
        `algorand:${transfer.transactionId}:${index}`,

      timestamp:
        timestampFromRoundTime(
          transfer.roundTime
        ),

      blockNumber:
        transfer.confirmedRound,

      kind:
        native
          ? "native_transfer"
          : "token_transfer",

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
        transfer.asset,

      assetAddress:
        native
          ? null
          : transfer.asset,

      rawValue:
        transfer.amount,

      formattedValue:
        native
          ? formatAlgo(
              transfer.amount
            )
          : transfer.amount,

      transactionHash:
        transfer.transactionId,

      evidenceState:
        "SUPPORTED",

      whyItMatters:
        native
          ? "Explicit Algorand payment evidence observed in the bounded account history."
          : "Explicit Algorand Standard Asset transfer evidence observed in the bounded account history.",
    });
  }

  const maxEvents =
    data.analysisPlan ===
      "advanced"
      ? 48
      : data.analysisPlan ===
          "pro"
        ? 24
        : 12;

  return {
    status:
      events.length >
        0
        ? "limited"
        : "unavailable",

    limitation:
      "Timeline is bounded to explicit Algorand payment and ASA transfer evidence returned by the selected plan. Application calls, rekeys and inner transactions remain separate protocol evidence and are not converted into transfer claims.",

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

export function buildAlgorandVisualEvidenceGraph(
  data:
    AlgorandIntelligence
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
    `algorand:${data.address}`;

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
          "Analyzed Algorand account",

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

  const fundingSource =
    data.derived
      .observedFunding
      ?.sourceAddress ??
    null;

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

    if (
      item.address ===
        data.address
    ) {
      continue;
    }

    const nodeId =
      `algorand:${item.address}`;

    if (
      !seen.has(
        nodeId
      )
    ) {
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
          `${item.observationCount} explicit Algorand transfer observation(s)`,

        evidenceState:
          "SUPPORTED",
      });

      seen.add(
        nodeId
      );
    }

    const incomingOnly =
      item.incomingCount >
        0 &&
      item.outgoingCount ===
        0;

    edges.push({
      id:
        `algorand-edge:${item.address}`,

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
        `${item.observationCount} explicit transfer observation(s)`,

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        item.observationCount,

      evidenceRefs:
        item.transactionIds,
    });
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
      "Graph contains only explicit Algorand transfer counterparties in the bounded evidence window. Rekey, ASA authority and application evidence do not establish beneficial ownership, identity, intent or common control.",

    coverage: {
      maxNodes,

      maxEdges,

      ownershipInference:
        false,
    },
  };
}
