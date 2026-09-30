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
  AptosIntelligence,
} from "./engine";

function formatOctas(
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
      100_000_000n;

    const fraction =
      (
        raw %
        100_000_000n
      )
        .toString()
        .padStart(
          8,
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

export function buildAptosActivityTimeline(
  data:
    AptosIntelligence
): ActivityTimeline {
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
              `aptos:${transfer.transactionHash}:${index}`,

            timestamp:
              transfer.timestamp,

            blockNumber:
              null,

            kind:
              "native_transfer",

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
              null,

            rawValue:
              transfer.amount,

            formattedValue:
              formatOctas(
                transfer.amount
              ),

            transactionHash:
              transfer
                .transactionHash,

            evidenceState:
              "SUPPORTED",

            whyItMatters:
              "Observed explicit Aptos transfer evidence in the bounded transaction window.",
          })
        );

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

    events:
      events.slice(
        0,
        maxEvents
      ),

    limitation:
      "Aptos transfer timeline uses only explicit sender, payload-recipient and address-scoped transfer event evidence. It is bounded and may not represent lifetime activity.",

    evidenceWindow: {
      transactionCount:
        data.history
          .transactions
          .length,

      transferCount:
        events.length,

      maxEvents,
    },
  };
}

export function buildAptosVisualEvidenceGraph(
  data:
    AptosIntelligence
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
    `aptos:${data.address}`;

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
          "Analyzed Aptos account",

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
      `aptos:${item.address}`;

    if (
      !seen.has(
        nodeId
      )
    ) {
      nodes.push({
        id:
          nodeId,

        kind:
          data.derived
            .observedFunding
            ?.sourceAddress ===
          item.address
            ? "funding_source"
            : "wallet",

        label:
          item.address,

        detail:
          `${item.observationCount} explicit Aptos transfer observation(s)`,

        evidenceState:
          "SUPPORTED",
      });

      seen.add(
        nodeId
      );
    }

    edges.push({
      id:
        `aptos-edge:${item.address}`,

      source:
        item.incomingCount >
          0 &&
        item.outgoingCount ===
          0
          ? nodeId
          : rootId,

      target:
        item.incomingCount >
          0 &&
        item.outgoingCount ===
          0
          ? rootId
          : nodeId,

      kind:
        data.derived
          .observedFunding
          ?.sourceAddress ===
        item.address
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
        `${item.observationCount} explicit transfer(s)`,

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        item.observationCount,

      evidenceRefs:
        item
          .transactionHashes,
    });
  }

  return {
    status:
      edges.length >
        0
        ? "limited"
        : "unavailable",

    nodes,

    edges,

    limitation:
      "Aptos graph contains only explicit transfer counterparties observed in bounded transaction evidence. Move module interaction alone is not treated as ownership, identity or wallet relationship.",

    coverage: {
      maxNodes,

      maxEdges,

      ownershipInference:
        false,
    },
  };
}
