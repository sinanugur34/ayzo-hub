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
      "Timeline combines bounded HyperCore fills and perpetual funding-rate payments only. It is not HyperEVM address transaction history and does not represent wallet-funding provenance.",

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
        0,

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

  return {
    status:
      "limited",

    nodes,
    edges,

    limitation:
      "The graph separates HyperCore exchange evidence from HyperEVM latest-state evidence. It intentionally contains no fabricated wallet counterparties, common-ownership links or wallet-funding provenance.",

    coverage: {
      maxNodes:
        data.analysisPlan ===
          "advanced"
          ? 16
          : data.analysisPlan ===
              "pro"
            ? 10
            : 6,

      maxEdges:
        data.analysisPlan ===
          "advanced"
          ? 24
          : data.analysisPlan ===
              "pro"
            ? 14
            : 8,

      ownershipInference:
        false,
    },
  };
}
