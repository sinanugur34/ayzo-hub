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
  NearIntelligence,
} from "./engine";

function formatNear(
  value:
    string | null
) {
  if (!value) {
    return null;
  }

  try {
    const raw =
      BigInt(value);

    const divisor =
      10n ** 24n;

    const whole =
      raw /
      divisor;

    const fraction =
      (
        raw %
        divisor
      )
        .toString()
        .padStart(
          24,
          "0"
        )
        .replace(
          /0+$/,
          ""
        )
        .slice(
          0,
          6
        );

    return fraction
      ? `${whole}.${fraction}`
      : whole.toString();
  } catch {
    return null;
  }
}

export function buildNearActivityTimeline(
  data:
    NearIntelligence
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
              `near:${transfer.transactionHash}:${transfer.receiptId ?? index}`,

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
              "NEAR",

            assetAddress:
              null,

            rawValue:
              transfer
                .amountYoctoNear,

            formattedValue:
              formatNear(
                transfer
                  .amountYoctoNear
              ),

            transactionHash:
              transfer
                .transactionHash,

            evidenceState:
              "SUPPORTED",

            whyItMatters:
              transfer.source ===
                "receipt"
                ? "Observed native NEAR action in receipt-level evidence."
                : "Observed native NEAR action in bounded transaction evidence.",
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
      "NEAR timeline is bounded indexed transaction/receipt evidence. Receipts are not treated as independent EVM-style transactions.",

    events:
      events.slice(
        0,
        maxEvents
      ),

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

export function buildNearVisualEvidenceGraph(
  data:
    NearIntelligence
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
    `near:${data.address}`;

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
          "Analyzed NEAR account",

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
      item.accountId ===
        data.address
    ) {
      continue;
    }

    const nodeId =
      `near:${item.accountId}`;

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
            ?.sourceAccountId ===
          item.accountId
            ? "funding_source"
            : "wallet",

        label:
          item.accountId,

        detail:
          `${item.observationCount} explicit NEAR interaction(s)`,

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
        `near-edge:${item.accountId}`,

      source:
        incomingOnly
          ? nodeId
          : rootId,

      target:
        incomingOnly
          ? rootId
          : nodeId,

      kind:
        data.derived
          .observedFunding
          ?.sourceAccountId ===
        item.accountId
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
        `${item.observationCount} observed interaction(s)`,

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        item.observationCount,

      evidenceRefs:
        item.evidenceRefs,
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
      "NEAR graph contains only explicitly observed transaction/action/receipt counterparties. It does not infer ownership, identity or common control.",

    coverage: {
      maxNodes,
      maxEdges,
      ownershipInference:
        false,
    },
  };
}
