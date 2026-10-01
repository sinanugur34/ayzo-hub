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
  ZcashIntelligence,
} from "./engine";

function formatZec(
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

export function buildZcashActivityTimeline(
  data:
    ZcashIntelligence
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
              `zcash:${transfer.txid}:${index}`,

            timestamp:
              transfer.timestamp,

            blockNumber:
              transfer.height,

            kind:
              "native_transfer" as const,

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
              "ZEC",

            assetAddress:
              null,

            rawValue:
              transfer.amountZatoshis,

            formattedValue:
              formatZec(
                transfer.amountZatoshis
              ),

            transactionHash:
              transfer.txid,

            evidenceState:
              "SUPPORTED" as const,

            whyItMatters:
              "Explicit public Zcash transparent input/output evidence observed in the bounded canonical transaction window.",
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

    limitation:
      "Timeline contains only explicit public transparent Zcash evidence. AYZO does not reconstruct hidden shielded sender, recipient or amount information.",

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

export function buildZcashVisualEvidenceGraph(
  data:
    ZcashIntelligence
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
    `zcash:${data.address}`;

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
          "Analyzed Zcash transparent address",

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
      `zcash:${item.address}`;

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
          `${item.observationCount} explicit transparent observation(s)`,

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
        `zcash-edge:${item.address}`,

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
        `${item.observationCount} explicit transparent interaction(s)`,

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
      "Graph contains only checksum-valid transparent addresses explicitly observed in bounded canonical Zcash evidence. It does not infer shielded counterparties, ownership, identity, intent or common control.",

    coverage: {
      maxNodes,

      maxEdges,

      ownershipInference:
        false,
    },
  };
}
