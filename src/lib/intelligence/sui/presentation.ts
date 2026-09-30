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
  WalletTrackRecord,
} from "@/lib/intelligence/walletTrackRecord";

import type {
  SuiIntelligence,
} from "./engine";

const SUI_COIN =
  "0x2::sui::SUI";

function normalize(
  value:
    string | null
) {
  return value
    ?.toLowerCase() ??
    null;
}

function formatMist(
  value:
    string | null
) {
  if (!value) {
    return null;
  }

  try {
    const mist =
      BigInt(
        value
      );

    const absolute =
      mist <
        0n
        ? -mist
        : mist;

    const whole =
      absolute /
      1_000_000_000n;

    const fraction =
      (
        absolute %
        1_000_000_000n
      )
        .toString()
        .padStart(
          9,
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

function rootSuiChange(
  data:
    SuiIntelligence,
  transaction:
    SuiIntelligence[
      "history"
    ][
      "transactions"
    ][number]
) {
  let total =
    0n;

  let found =
    false;

  for (
    const change of
    transaction
      .balanceChanges
  ) {
    if (
      normalize(
        change.owner
      ) !==
        normalize(
          data.address
        ) ||
      change.coinType !==
        SUI_COIN ||
      change.amount ===
        null
    ) {
      continue;
    }

    try {
      total +=
        BigInt(
          change.amount
        );

      found =
        true;
    } catch {
      // Keep only valid numeric evidence.
    }
  }

  return found
    ? total
    : null;
}

function positiveSuiCounterparty(
  data:
    SuiIntelligence,
  transaction:
    SuiIntelligence[
      "history"
    ][
      "transactions"
    ][number]
) {
  const root =
    normalize(
      data.address
    );

  for (
    const change of
    transaction
      .balanceChanges
  ) {
    if (
      !change.owner ||
      normalize(
        change.owner
      ) === root ||
      change.coinType !==
        SUI_COIN ||
      change.amount ===
        null
    ) {
      continue;
    }

    try {
      if (
        BigInt(
          change.amount
        ) >
        0n
      ) {
        return change.owner;
      }
    } catch {
      // Ignore malformed value.
    }
  }

  return null;
}

export function buildSuiActivityTimeline(
  data:
    SuiIntelligence
): ActivityTimeline {
  const events:
    ActivityTimelineEvent[] =
      data.history.transactions.map(
        (
          transaction,
          index
        ) => {
          const rootChange =
            rootSuiChange(
              data,
              transaction
            );

          const direction =
            rootChange ===
              null
              ? "observed" as const
              : rootChange >
                  0n
                ? "incoming" as const
                : rootChange <
                    0n
                  ? "outgoing" as const
                  : "observed" as const;

          const counterparty =
            direction ===
              "incoming"
              ? transaction.sender
              : direction ===
                  "outgoing"
                ? positiveSuiCounterparty(
                    data,
                    transaction
                  )
                : transaction.sender;

          return {
            id:
              `sui:${transaction.transactionHash}:${index}`,

            timestamp:
              transaction.timestamp,

            blockNumber:
              null,

            kind:
              rootChange !==
                null &&
              rootChange !==
                0n
                ? "native_transfer"
                : "transaction",

            direction,

            from:
              direction ===
                "incoming"
                ? transaction.sender
                : direction ===
                    "outgoing"
                  ? data.address
                  : transaction.sender,

            to:
              direction ===
                "incoming"
                ? data.address
                : direction ===
                    "outgoing"
                  ? counterparty
                  : null,

            counterparty,

            asset:
              rootChange !==
                null &&
              rootChange !==
                0n
                ? "SUI"
                : null,

            assetAddress:
              rootChange !==
                null &&
              rootChange !==
                0n
                ? SUI_COIN
                : null,

            rawValue:
              rootChange !==
                null
                ? (
                    rootChange <
                      0n
                      ? -rootChange
                      : rootChange
                  ).toString()
                : null,

            formattedValue:
              rootChange !==
                null
                ? formatMist(
                    rootChange
                      .toString()
                  )
                : null,

            transactionHash:
              transaction
                .transactionHash,

            evidenceState:
              "SUPPORTED",

            whyItMatters:
              direction ===
                "incoming"
                ? "Observed positive SUI balance change for the analyzed address."
                : direction ===
                    "outgoing"
                  ? "Observed negative SUI balance change for the analyzed address."
                  : "Observed affected Sui transaction in the bounded evidence window.",
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
      `Timeline is bounded to ${data.evidenceCoverage.historyLimit} affected Sui transactions for the current ${data.analysisPlan} depth.`,

    events:
      events.slice(
        0,
        data.evidenceCoverage
          .historyLimit
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

      maxEvents:
        data.evidenceCoverage
          .historyLimit,
    },
  };
}

export function buildSuiVisualEvidenceGraph(
  data:
    SuiIntelligence
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

  const nodes:
    VisualEvidenceNode[] =
      [];

  const edges:
    VisualEvidenceEdge[] =
      [];

  const seen =
    new Set<string>();

  const rootId =
    `sui:${data.address}`;

  function push(
    node:
      VisualEvidenceNode
  ) {
    if (
      nodes.length >=
        maxNodes ||
      seen.has(
        node.id
      )
    ) {
      return false;
    }

    nodes.push(
      node
    );

    seen.add(
      node.id
    );

    return true;
  }

  push({
    id:
      rootId,

    kind:
      "root_wallet",

    label:
      data.address,

    detail:
      data.subjectObject
        .kind ===
          "package"
          ? "Analyzed Sui package/address"
          : data.subjectObject
              .kind ===
                "move_object"
            ? "Analyzed Sui object/address"
            : "Analyzed Sui address",

    evidenceState:
      "SUPPORTED",
  });

  if (
    data.derived
      .observedFunding
  ) {
    const funding =
      data.derived
        .observedFunding;

    const id =
      `sui:${funding.observedSender}`;

    if (
      push({
        id,

        kind:
          "funding_source",

        label:
          funding
            .observedSender,

        detail:
          "Observed sender on bounded inbound SUI evidence",

        evidenceState:
          "SUPPORTED",
      })
    ) {
      edges.push({
        id:
          `sui-funding:${funding.transactionHash}`,

        source:
          id,

        target:
          rootId,

        kind:
          "funding",

        direction:
          "forward",

        label:
          "Observed inbound SUI",

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

    const id =
      `sui:${item.address}`;

    if (
      !push({
        id,

        kind:
          "wallet",

        label:
          item.address,

        detail:
          `${item.interactionCount} observed affected-address signal(s)`,

        evidenceState:
          "SUPPORTED",
      })
    ) {
      continue;
    }

    edges.push({
      id:
        `sui-edge:${item.address}`,

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
        "Observed Sui transaction relationship",

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

  return {
    status:
      edges.length >
        0
        ? "limited"
        : "limited",

    nodes,

    edges,

    limitation:
      "Sui graph uses observed transaction senders and affected addresses/objects only. An address may represent an account, object or package. Graph proximity does not establish common ownership, identity or control.",

    coverage: {
      maxNodes,
      maxEdges,
      ownershipInference:
        false,
    },
  };
}

export function buildSuiWalletTrackRecord(
  data:
    SuiIntelligence
): WalletTrackRecord {
  const timestamps =
    data.history
      .transactions
      .map(
        transaction =>
          transaction.timestamp
      )
      .filter(
        (
          value
        ): value is string =>
          value !== null
      )
      .sort(
        (
          left,
          right
        ) =>
          Date.parse(
            left
          ) -
          Date.parse(
            right
          )
      );

  const first =
    timestamps[0] ??
    null;

  const last =
    timestamps[
      timestamps.length -
      1
    ] ??
    null;

  const observedSpanDays =
    first &&
    last
      ? Math.max(
          0,
          Math.floor(
            (
              Date.parse(
                last
              ) -
              Date.parse(
                first
              )
            ) /
              86_400_000
          )
        )
      : null;

  return {
    status:
      data.account
        .hasObservedState
        ? "limited"
        : "unavailable",

    firstObservedAt:
      first,

    lastObservedAt:
      last,

    observedSpanDays,

    metrics: [
      {
        id:
          "sui-transactions",

        label:
          "Affected transactions",

        value:
          String(
            data.history
              .transactions
              .length
          ),

        detail:
          "Bounded finalized/indexed Sui transaction evidence.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "sui-assets",

        label:
          "Coin balances",

        value:
          String(
            data.derived
              .assets
              .positiveBalanceCount
          ),

        detail:
          "Positive coin balance types in the bounded query.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "sui-objects",

        label:
          "Owned objects",

        value:
          String(
            data.ownedObjects
              .length
          ),

        detail:
          "Bounded current owned-object sample.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "sui-counterparties",

        label:
          "Relationship signals",

        value:
          String(
            data.derived
              .counterparties
              .count
          ),

        detail:
          "Observed transaction senders and affected addresses/objects.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "sui-incoming",

        label:
          "Incoming SUI activity",

        value:
          String(
            data.derived
              .flow
              .incomingTransactionCount
          ),

        detail:
          "Transactions with positive observed SUI balance change.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "sui-outgoing",

        label:
          "Outgoing SUI activity",

        value:
          String(
            data.derived
              .flow
              .outgoingTransactionCount
          ),

        detail:
          "Transactions with negative observed SUI balance change.",

        evidenceState:
          "SUPPORTED",
      },
    ],

    limitation:
      "Sui Track Record is bounded to the account, balance, object and transaction evidence collected for this AYZO analysis. It is not exhaustive lifetime history.",

    methodology:
      "AYZO reports observed Sui evidence without inferring real-world identity, common ownership, intent, profitability or future performance.",

    evidenceState:
      "SUPPORTED",
  };
}
