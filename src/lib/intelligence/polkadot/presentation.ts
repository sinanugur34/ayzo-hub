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
  PolkadotIntelligence,
} from "./engine";

function formatDot(
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
      10_000_000_000n;

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
          10,
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

export function buildPolkadotActivityTimeline(
  data:
    PolkadotIntelligence
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
      [];

  for (
    const [
      index,
      transfer,
    ] of data.transfers.entries()
  ) {
    const incoming =
      transfer.to ===
        data.address &&
      Boolean(
        transfer.from
      ) &&
      transfer.from !==
        data.address;

    const outgoing =
      transfer.from ===
        data.address &&
      Boolean(
        transfer.to
      ) &&
      transfer.to !==
        data.address;

    if (
      !incoming &&
      !outgoing
    ) {
      continue;
    }

    const transactionRef =
      transfer
        .extrinsicHash ??
      transfer
        .extrinsicIndex;

    if (!transactionRef) {
      continue;
    }

    const direction =
      incoming
        ? "incoming"
        : "outgoing";

    const counterparty =
      incoming
        ? transfer.from
        : transfer.to;

    events.push({
      id:
        `polkadot:${transactionRef}:${index}`,

      timestamp:
        transfer.timestamp,

      blockNumber:
        transfer.blockNumber,

      kind:
        "native_transfer",

      direction,

      from:
        transfer.from,

      to:
        transfer.to,

      counterparty,

      asset:
        "DOT",

      assetAddress:
        null,

      rawValue:
        transfer.amountPlanck,

      formattedValue:
        formatDot(
          transfer.amountPlanck
        ),

      transactionHash:
        transactionRef,

      evidenceState:
        "SUPPORTED",

      whyItMatters:
        "Explicit DOT transfer evidence observed in the bounded indexed Polkadot history.",
    });
  }

  return {
    status:
      events.length >
        0
        ? "limited"
        : "unavailable",

    limitation:
      "Polkadot activity is bounded to explicit indexed transfer evidence returned by the selected plan. Proxy, multisig and staking evidence remain separate protocol semantics.",

    events:
      events.slice(
        0,
        maxEvents
      ),

    evidenceWindow: {
      transactionCount:
        data.extrinsics.length,

      transferCount:
        events.length,

      maxEvents,
    },
  };
}

export function buildPolkadotVisualEvidenceGraph(
  data:
    PolkadotIntelligence
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
    `polkadot:${data.address}`;

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
          "Analyzed Polkadot account",

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
      `polkadot:${item.address}`;

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
        `${item.observationCount} explicit DOT transfer observation(s)`,

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
        `polkadot-edge:${item.address}`,

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
        `${item.observationCount} explicit DOT interaction(s)`,

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        item.observationCount,

      evidenceRefs:
        item.evidenceRefs,
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
      "Graph uses explicit DOT transfer counterparties only. Staking, proxy and multisig relationships do not establish beneficial ownership, identity, intent or common control.",

    coverage: {
      maxNodes,

      maxEdges,

      ownershipInference:
        false,
    },
  };
}
