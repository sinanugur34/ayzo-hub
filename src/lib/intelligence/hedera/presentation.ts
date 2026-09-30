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
  HederaIntelligence,
} from "./engine";

function formatHbar(
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
      100_000_000n;

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

export function buildHederaActivityTimeline(
  data:
    HederaIntelligence
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
              `hedera:${transfer.transactionId}:${index}`,

            timestamp:
              transfer.consensusTimestamp,

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
              "HBAR",

            assetAddress:
              null,

            rawValue:
              transfer.amountTinybar,

            formattedValue:
              formatHbar(
                transfer
                  .amountTinybar
              ),

            transactionHash:
              transfer
                .transactionId,

            evidenceState:
              "SUPPORTED",

            whyItMatters:
              "Observed explicit Hedera HBAR transfer entry inside bounded Mirror Node evidence.",
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
      "Hedera timeline uses bounded explicit Mirror Node transfer evidence and does not infer entity identity or ownership.",

    events:
      events.slice(
        0,
        maxEvents
      ),

    evidenceWindow: {
      transactionCount:
        data.transactions
          .length,

      transferCount:
        events.length,

      maxEvents,
    },
  };
}

export function buildHederaVisualEvidenceGraph(
  data:
    HederaIntelligence
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
    `hedera:${data.address}`;

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
          "Analyzed Hedera account",

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
      `hedera:${item.accountId}`;

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
          `${item.observationCount} explicit HBAR interaction(s)`,

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
        `hedera-edge:${item.accountId}`,

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
        `${item.observationCount} observed HBAR interaction(s)`,

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

    nodes,

    edges,

    limitation:
      "Hedera graph contains only explicit transfer counterparties. Token relationships, staking and control keys do not establish ownership or identity.",

    coverage: {
      maxNodes,
      maxEdges,
      ownershipInference:
        false,
    },
  };
}
