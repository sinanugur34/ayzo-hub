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
  CardanoIntelligence,
} from "./engine";

function formatAda(
  lovelace:
    string | null
) {
  if (!lovelace) {
    return null;
  }

  try {
    const value =
      BigInt(
        lovelace
      );

    const whole =
      value /
      1_000_000n;

    const fraction =
      (
        value %
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

function rootReceived(
  data:
    CardanoIntelligence,
  transaction:
    CardanoIntelligence[
      "canonicalTransactions"
    ][number]
) {
  let total =
    0n;

  for (
    const output of
    transaction.outputs
  ) {
    if (
      output.address !==
        data.address
    ) {
      continue;
    }

    for (
      const amount of
      output.amounts
    ) {
      if (
        amount.unit !==
          "lovelace"
      ) {
        continue;
      }

      try {
        total +=
          BigInt(
            amount.quantity
          );
      } catch {
        // Ignore malformed numeric evidence.
      }
    }
  }

  return total;
}

function rootSpent(
  data:
    CardanoIntelligence,
  transaction:
    CardanoIntelligence[
      "canonicalTransactions"
    ][number]
) {
  return transaction.inputs.some(
    input =>
      input.address ===
      data.address
  );
}

export function buildCardanoActivityTimeline(
  data:
    CardanoIntelligence
): ActivityTimeline {
  const events:
    ActivityTimelineEvent[] =
      [];

  for (
    const [
      index,
      transaction,
    ] of data
      .canonicalTransactions
      .entries()
  ) {
    const spent =
      rootSpent(
        data,
        transaction
      );

    const received =
      rootReceived(
        data,
        transaction
      );

    const incoming =
      !spent &&
      received >
        0n;

    const outgoing =
      spent &&
      transaction.outputs.some(
        output =>
          output.address &&
          output.address !==
            data.address
      );

    const counterparty =
      incoming
        ? transaction.inputs.find(
            input =>
              input.address &&
              input.address !==
                data.address
          )?.address ??
          null
        : outgoing
          ? transaction.outputs.find(
              output =>
                output.address &&
                output.address !==
                  data.address
            )?.address ??
            null
          : null;

    let rawValue:
      string | null =
        null;

    if (incoming) {
      rawValue =
        received.toString();
    }

    if (outgoing) {
      let total =
        0n;

      for (
        const output of
        transaction.outputs
      ) {
        if (
          !output.address ||
          output.address ===
            data.address
        ) {
          continue;
        }

        for (
          const amount of
          output.amounts
        ) {
          if (
            amount.unit !==
              "lovelace"
          ) {
            continue;
          }

          try {
            total +=
              BigInt(
                amount.quantity
              );
          } catch {
            // Ignore malformed numeric evidence.
          }
        }
      }

      rawValue =
        total.toString();
    }

    events.push({
      id:
        `cardano:${transaction.transactionHash}:${index}`,

      timestamp:
        transaction.blockTime,

      blockNumber:
        transaction.blockHeight,

      kind:
        incoming ||
        outgoing
          ? "native_transfer"
          : "transaction",

      direction:
        incoming
          ? "incoming"
          : outgoing
            ? "outgoing"
            : "observed",

      from:
        incoming
          ? counterparty
          : outgoing
            ? data.address
            : null,

      to:
        incoming
          ? data.address
          : outgoing
            ? counterparty
            : null,

      counterparty,

      asset:
        incoming ||
        outgoing
          ? "ADA"
          : null,

      assetAddress:
        null,

      rawValue,

      formattedValue:
        formatAda(
          rawValue
        ),

      transactionHash:
        transaction
          .transactionHash,

      evidenceState:
        "SUPPORTED",

      whyItMatters:
        "Observed canonical Cardano input/output evidence inside the bounded verification window.",
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
      `Timeline is bounded to verified Cardano canonical evidence for the ${data.analysisPlan} plan and is not exhaustive lifetime history.`,

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
        events.filter(
          event =>
            event.kind ===
            "native_transfer"
        ).length,

      maxEvents,
    },
  };
}

export function buildCardanoVisualEvidenceGraph(
  data:
    CardanoIntelligence
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
    `cardano:${data.address}`;

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
          "Analyzed Cardano payment address",

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

    if (
      funding.sourceAddress !==
        data.address
    ) {
      const nodeId =
        `cardano:${funding.sourceAddress}`;

      if (
        !seen.has(
          nodeId
        )
      ) {
        nodes.push({
          id:
            nodeId,

          kind:
            "funding_source",

          label:
            funding.sourceAddress,

          detail:
            "Observed inbound Cardano source",

          evidenceState:
            "SUPPORTED",
        });

        seen.add(
          nodeId
        );
      }

      edges.push({
        id:
          `cardano-funding:${funding.transactionHash}`,

        source:
          nodeId,

        target:
          rootId,

        kind:
          "funding",

        direction:
          "forward",

        label:
          "Observed inbound ADA",

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

    if (
      item.address ===
        data.address
    ) {
      continue;
    }

    const nodeId =
      `cardano:${item.address}`;

    if (
      !seen.has(
        nodeId
      )
    ) {
      nodes.push({
        id:
          nodeId,

        kind:
          "wallet",

        label:
          item.address,

        detail:
          `${item.observationCount} observed Cardano interaction(s)`,

        evidenceState:
          "SUPPORTED",
      });

      seen.add(
        nodeId
      );
    }

    edges.push({
      id:
        `cardano-edge:${item.address}`,

      source:
        rootId,

      target:
        nodeId,

      kind:
        "direct_interaction",

      direction:
        "bidirectional",

      label:
        `${item.observationCount} observed interaction(s)`,

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

    limitation:
      "Graph contains only explicit addresses observed in bounded canonical Cardano evidence. It does not establish ownership, identity, clustering, or common control.",

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

    coverage: {
      maxNodes,

      maxEdges,

      ownershipInference:
        false,
    },
  };
}
