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
  HyperliquidIntelligence,
} from "./engine";

function sameHyperliquidAddress(
  left:
    string | null,
  right:
    string
) {
  return (
    typeof left ===
      "string" &&
    left.toLowerCase() ===
      right.toLowerCase()
  );
}

function validHyperliquidAddress(
  value:
    string | null
) {
  return (
    typeof value ===
      "string" &&
    /^0x[0-9a-fA-F]{40}$/.test(
      value
    )
  );
}

function ledgerDirection(
  subject:
    string,
  user:
    string | null,
  destination:
    string | null
) {
  const fromSubject =
    sameHyperliquidAddress(
      user,
      subject
    );

  const toSubject =
    sameHyperliquidAddress(
      destination,
      subject
    );

  if (
    fromSubject &&
    toSubject
  ) {
    return "self" as const;
  }

  if (
    toSubject &&
    validHyperliquidAddress(
      user
    )
  ) {
    return "incoming" as const;
  }

  if (
    fromSubject &&
    validHyperliquidAddress(
      destination
    )
  ) {
    return "outgoing" as const;
  }

  return "observed" as const;
}

export function buildHyperliquidActivityTimeline(
  data:
    HyperliquidIntelligence
): ActivityTimeline {
  const events:
    ActivityTimelineEvent[] =
      [];

  for (
    const fill of
    data
      .executionSurfaces
      .hyperCore
      .fills
  ) {
    events.push({
      id:
        `hl-fill:${fill.transactionId}`,

      timestamp:
        fill.timestamp,

      blockNumber:
        null,

      kind:
        "transaction",

      direction:
        "observed",

      from:
        null,

      to:
        null,

      counterparty:
        null,

      asset:
        fill.coin,

      assetAddress:
        null,

      rawValue:
        fill.size,

      formattedValue:
        `${fill.size} @ ${fill.price}`,

      transactionHash:
        fill.hash ??
        `hypercore-fill:${fill.transactionId}`,

      evidenceState:
        "SUPPORTED",

      whyItMatters:
        "Observed HyperCore trade execution. This is exchange execution evidence, not peer-to-peer wallet transfer evidence.",
    });
  }

  for (
    const [
      index,
      funding,
    ] of
    data
      .executionSurfaces
      .hyperCore
      .fundingPayments
      .entries()
  ) {
    events.push({
      id:
        `hl-funding:${funding.hash ?? index}`,

      timestamp:
        funding.timestamp,

      blockNumber:
        null,

      kind:
        "transaction",

      direction:
        "observed",

      from:
        null,

      to:
        null,

      counterparty:
        null,

      asset:
        funding.coin,

      assetAddress:
        null,

      rawValue:
        funding.usdc,

      formattedValue:
        funding.usdc,

      transactionHash:
        funding.hash ??
        `hypercore-funding:${index}`,

      evidenceState:
        "SUPPORTED",

      whyItMatters:
        "Observed HyperCore perpetual funding-rate payment. It is not wallet funding provenance.",
    });
  }

  for (
    const [
      index,
      ledger
    ] of
    data
      .executionSurfaces
      .hyperCore
      .nonFundingLedger
      .entries()
  ) {
    const direction =
      ledgerDirection(
        data.address,
        ledger.user,
        ledger.destination
      );

    const counterparty =
      direction ===
        "incoming"
        ? ledger.user
        : direction ===
            "outgoing"
          ? ledger.destination
          : null;

    const type =
      ledger.type
        .trim()
        .toLowerCase();

    const asset =
      ledger.token ??
      (
        ledger.usdc !==
          null
          ? "USDC"
          : null
      );

    const rawValue =
      ledger.amount ??
      ledger.usdc;

    const from =
      direction ===
        "incoming"
        ? ledger.user
        : direction ===
            "outgoing"
          ? data.address
          : direction ===
              "self"
            ? data.address
            : ledger.user;

    const to =
      direction ===
        "incoming"
        ? data.address
        : direction ===
            "outgoing"
          ? ledger.destination
          : direction ===
              "self"
            ? data.address
            : ledger.destination;

    events.push({
      id:
        `hl-ledger:${ledger.hash ?? index}`,

      timestamp:
        ledger.timestamp,

      blockNumber:
        null,

      kind:
        asset
          ? "token_transfer"
          : "transaction",

      direction,

      from,

      to,

      counterparty,

      asset,

      assetAddress:
        null,

      rawValue,

      formattedValue:
        rawValue,

      transactionHash:
        ledger.hash ??
        `hypercore-ledger:${index}`,

      evidenceState:
        "SUPPORTED",

      whyItMatters:
        type.includes(
          "deposit"
        )
          ? "Observed HyperCore non-funding deposit ledger evidence."
          : type.includes(
              "withdraw"
            )
            ? "Observed HyperCore non-funding withdrawal ledger evidence."
            : type.includes(
                "transfer"
              )
              ? "Observed HyperCore non-funding transfer ledger evidence."
              : `Observed HyperCore non-funding ledger event (${ledger.type}). AYZO does not invent semantics beyond the provider-supplied delta type.`,
    });
  }

  events.sort(
    (
      left,
      right
    ) => {
      const leftTime =
        left.timestamp
          ? Date.parse(
              left.timestamp
            )
          : -1;

      const rightTime =
        right.timestamp
          ? Date.parse(
              right.timestamp
            )
          : -1;

      return (
        rightTime -
        leftTime
      );
    }
  );

  const maxEvents =
    data.analysisPlan ===
      "advanced"
      ? 32
      : data.analysisPlan ===
          "pro"
        ? 16
        : 8;

  return {
    status:
      events.length >
        0
        ? "limited"
        : "unavailable",

    limitation:
      "Timeline combines bounded HyperCore fills, perpetual funding-rate payments and non-funding ledger updates. Ledger transfers use explicit address fields only. It is not indexed HyperEVM address history and does not establish ultimate wallet-funding provenance.",

    events:
      events.slice(
        0,
        maxEvents
      ),

    evidenceWindow: {
      transactionCount:
        data
          .executionSurfaces
          .hyperCore
          .fills
          .length,

      transferCount:
        data
          .executionSurfaces
          .hyperCore
          .nonFundingLedger
          .length,

      maxEvents,
    },
  };
}

export function buildHyperliquidVisualEvidenceGraph(
  data:
    HyperliquidIntelligence
): VisualEvidenceGraph {
  const rootId =
    `hyperliquid:${data.address}`;

  const coreId =
    "hyperliquid:evidence:hypercore";

  const evmId =
    "hyperliquid:evidence:hyperevm";

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
          "Analyzed Hyperliquid account address",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          coreId,

        kind:
          "evidence",

        label:
          "HyperCore",

        detail:
          `${data.derived.hyperCore.openPositionCount} open position(s) · ${data.derived.hyperCore.recentFillCount} bounded fill(s)`,

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          evmId,

        kind:
          "evidence",

        label:
          "HyperEVM",

        detail:
          `Chain 999 · nonce ${data.executionSurfaces.hyperEvm.transactionCount} · ${data.executionSurfaces.hyperEvm.isContract ? "contract code observed" : "no runtime contract code observed"}`,

        evidenceState:
          "SUPPORTED",
      },
    ];

  const edges:
    VisualEvidenceEdge[] = [
      {
        id:
          "hyperliquid-core-surface",

        source:
          rootId,

        target:
          coreId,

        kind:
          "canonical_evidence",

        direction:
          "observed",

        label:
          "HyperCore account evidence",

        evidenceState:
          "SUPPORTED",

        evidenceCount:
          Math.max(
            1,
            data
              .executionSurfaces
              .hyperCore
              .fills
              .length +
            data
              .executionSurfaces
              .hyperCore
              .positions
              .length
          ),

        evidenceRefs:
          data
            .executionSurfaces
            .hyperCore
            .fills
            .flatMap(
              fill =>
                fill.hash
                  ? [
                      fill.hash,
                    ]
                  : []
            )
            .slice(
              0,
              8
            ),
      },

      {
        id:
          "hyperliquid-evm-surface",

        source:
          rootId,

        target:
          evmId,

        kind:
          "canonical_evidence",

        direction:
          "observed",

        label:
          "HyperEVM latest-state evidence",

        evidenceState:
          "SUPPORTED",

        evidenceCount:
          1,

        evidenceRefs:
          [],
      },
    ];

  const maxNodes =
    data.analysisPlan ===
      "advanced"
      ? 16
      : data.analysisPlan ===
          "pro"
        ? 10
        : 6;

  const maxEdges =
    data.analysisPlan ===
      "advanced"
      ? 24
      : data.analysisPlan ===
          "pro"
        ? 14
        : 8;

  for (
    const address of
    data
      .derived
      .hyperCore
      .counterparties
      .addresses
  ) {
    if (
      nodes.length >=
        maxNodes ||
      edges.length >=
        maxEdges
    ) {
      break;
    }

    const normalized =
      address.toLowerCase();

    const nodeId =
      `hyperliquid:counterparty:${normalized}`;

    if (
      nodes.some(
        node =>
          node.id ===
          nodeId
      )
    ) {
      continue;
    }

    const evidence =
      data
        .executionSurfaces
        .hyperCore
        .nonFundingLedger
        .filter(
          ledger =>
            ledger.user
              ?.toLowerCase() ===
              normalized ||
            ledger.destination
              ?.toLowerCase() ===
              normalized
        );

    nodes.push({
      id:
        nodeId,

      kind:
        "wallet",

      label:
        address,

      detail:
        `${evidence.length} explicit non-funding ledger observation(s)`,

      evidenceState:
        "SUPPORTED",
    });

    edges.push({
      id:
        `hyperliquid-ledger-${normalized}`,

      source:
        rootId,

      target:
        nodeId,

      kind:
        "direct_interaction",

      direction:
        "observed",

      label:
        "Explicit HyperCore ledger interaction",

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        evidence.length,

      evidenceRefs:
        evidence
          .flatMap(
            item =>
              item.hash
                ? [
                    item.hash,
                  ]
                : []
          )
          .slice(
            0,
            8
          ),
    });
  }

  return {
    status:
      "limited",

    nodes,
    edges,

    limitation:
      "The graph separates HyperCore exchange evidence from HyperEVM latest-state evidence. Counterparty nodes are added only from explicit HyperCore non-funding ledger address fields. No common ownership, identity, control or ultimate wallet-funding provenance is inferred.",

    coverage: {
      maxNodes,

      maxEdges,

      ownershipInference:
        false,
    },
  };
}
