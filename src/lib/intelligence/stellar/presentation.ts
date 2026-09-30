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
  StellarIntelligence,
} from "./engine";

export function buildStellarActivityTimeline(
  data:
    StellarIntelligence
): ActivityTimeline {
  const events:
    ActivityTimelineEvent[] =
      data.history.payments
        .map(
          (
            payment,
            index
          ) => {
            const incoming =
              payment.destination ===
                data.address ||
              payment.createdAccount ===
                data.address;

            const outgoing =
              payment.source ===
                data.address;

            const counterparty =
              incoming
                ? (
                    payment.source ??
                    payment.funder
                  )
                : outgoing
                  ? payment.destination
                  : null;

            const amount =
              payment.amount ??
              payment
                .startingBalance;

            const asset =
              payment.assetType ===
                "native" ||
              payment.type ===
                "create_account"
                ? "XLM"
                : payment.assetCode;

            return {
              id:
                `stellar:${payment.id}:${index}`,

              timestamp:
                payment.createdAt,

              blockNumber:
                null,

              kind:
                payment.type ===
                  "create_account"
                  ? "transaction"
                  : "token_transfer",

              direction:
                incoming
                  ? "incoming" as const
                  : outgoing
                    ? "outgoing" as const
                    : "observed" as const,

              from:
                payment.source ??
                payment.funder,

              to:
                payment.destination ??
                payment
                  .createdAccount,

              counterparty,

              asset,

              assetAddress:
                payment.assetIssuer,

              rawValue:
                amount,

              formattedValue:
                amount,

              transactionHash:
                payment
                  .transactionHash ??
                payment.id,

              evidenceState:
                "SUPPORTED" as const,

              whyItMatters:
                "Observed successful Stellar payment-related operation in the bounded Horizon evidence window.",
            };
          }
        );

  return {
    status:
      events.length >
        0
        ? "limited"
        : "unavailable",

    limitation:
      "Stellar timeline is plan-bounded and Horizon-retention-bounded; it is not guaranteed exhaustive lifetime history.",

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

export function buildStellarVisualEvidenceGraph(
  data:
    StellarIntelligence
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
    `stellar:${data.address}`;

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
          "Analyzed Stellar account",

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
      `stellar:${funding.sourceAddress}`;

    nodes.push({
      id,

      kind:
        "funding_source",

      label:
        funding.sourceAddress,

      detail:
        "Observed early inbound Stellar source",

      evidenceState:
        "SUPPORTED",
    });

    seen.add(
      id
    );

    edges.push({
      id:
        `stellar-funding:${funding.transactionHash ?? funding.sourceAddress}`,

      source:
        id,

      target:
        rootId,

      kind:
        "funding",

      direction:
        "forward",

      label:
        `Observed inbound ${funding.asset}`,

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        1,

      evidenceRefs:
        funding.transactionHash
          ? [
              funding
                .transactionHash,
            ]
          : [],
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
      `stellar:${item.address}`;

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
        `${item.interactionCount} observed payment relationship(s)`,

      evidenceState:
        "SUPPORTED",
    });

    edges.push({
      id:
        `stellar-edge:${item.address}`,

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
        "Observed Stellar relationship",

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

  for (
    const issuer of
    data.derived
      .trustlines
      .issuers
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
      `stellar:${issuer}`;

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
        issuer,

      detail:
        "Observed Stellar asset issuer",

      evidenceState:
        "SUPPORTED",
    });

    edges.push({
      id:
        `stellar-issuer:${issuer}`,

      source:
        rootId,

      target:
        id,

      kind:
        "direct_interaction",

      direction:
        "observed",

      label:
        "Issued-asset trustline",

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        1,

      evidenceRefs:
        [],
    });
  }

  return {
    status:
      "limited",

    nodes,
    edges,

    limitation:
      "Graph edges represent direct payment/create-account evidence or explicit asset issuer relationships. They do not establish common ownership or real-world identity.",

    coverage: {
      maxNodes,
      maxEdges,
      ownershipInference:
        false,
    },
  };
}
