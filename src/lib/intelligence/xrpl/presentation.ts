import type {
  ActivityTimeline,
  ActivityTimelineEvent,
} from "@/lib/intelligence/activityTimeline";

import type {
  WalletTrackRecord,
} from "@/lib/intelligence/walletTrackRecord";

import type {
  VisualEvidenceGraph,
  VisualEvidenceNode,
  VisualEvidenceEdge,
} from "@/lib/intelligence/visualEvidenceGraph";

import type {
  XrplIntelligence,
} from "./engine";

function lower(
  value:
    string
) {
  return value.toLowerCase();
}

function directionFor(
  address:
    string,
  source:
    string | null,
  destination:
    string | null
) {
  const target =
    lower(address);

  const fromTarget =
    source?.toLowerCase() ===
    target;

  const toTarget =
    destination?.toLowerCase() ===
    target;

  if (
    fromTarget &&
    toTarget
  ) {
    return "self" as const;
  }

  if (
    toTarget
  ) {
    return "incoming" as const;
  }

  if (
    fromTarget
  ) {
    return "outgoing" as const;
  }

  return "observed" as const;
}

function formatDrops(
  drops:
    string | null
) {
  if (!drops) {
    return null;
  }

  try {
    const value =
      BigInt(drops);

    const whole =
      value / 1_000_000n;

    const fraction =
      (value % 1_000_000n)
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

export function buildXrplActivityTimeline(
  data:
    XrplIntelligence
): ActivityTimeline {
  const events:
    ActivityTimelineEvent[] =
      data.history.transactions.map(
        (
          transaction,
          index
        ) => {
          const direction =
            directionFor(
              data.address,
              transaction.source,
              transaction.destination
            );

          const counterparty =
            direction ===
              "incoming"
              ? transaction.source
              : direction ===
                  "outgoing"
                ? transaction.destination
                : null;

          return {
            id:
              `xrpl:${transaction.transactionHash}:${index}`,

            timestamp:
              transaction.timestamp,

            blockNumber:
              transaction.ledgerIndex,

            kind:
              transaction.issuedAmount
                ? "token_transfer"
                : transaction.amountDrops
                  ? "native_transfer"
                  : "transaction",

            direction,

            from:
              transaction.source,

            to:
              transaction.destination,

            counterparty,

            asset:
              transaction.issuedAmount
                ? transaction.issuedAmount.currency
                : transaction.amountDrops
                  ? "XRP"
                  : null,

            assetAddress:
              transaction.issuedAmount
                ? transaction.issuedAmount.issuer
                : null,

            rawValue:
              transaction.issuedAmount
                ? transaction.issuedAmount.value
                : transaction.amountDrops,

            formattedValue:
              transaction.issuedAmount
                ? transaction.issuedAmount.value
                : formatDrops(
                    transaction.amountDrops
                  ),

            transactionHash:
              transaction.transactionHash,

            evidenceState:
              "SUPPORTED",

            whyItMatters:
              direction ===
                "incoming"
                ? "Observed inbound XRP Ledger activity."
                : direction ===
                    "outgoing"
                  ? "Observed outbound XRP Ledger activity."
                  : "Observed transaction in the bounded XRP Ledger evidence window.",
          };
        }
      );

  return {
    status:
      data.account.exists
        ? "limited"
        : "unavailable",

    limitation:
      `Timeline is bounded to ${data.evidenceCoverage.historyLimit} XRP Ledger transaction records for the current ${data.analysisPlan} analysis depth.`,

    events:
      events.slice(
        0,
        25
      ),

    evidenceWindow: {
      transactionCount:
        data.history.transactions.length,

      transferCount:
        data.history.transactions.filter(
          transaction =>
            transaction.amountDrops !==
              null ||
            transaction.issuedAmount !==
              null
        ).length,

      maxEvents:
        25,
    },
  };
}

export function buildXrplWalletTrackRecord(
  data:
    XrplIntelligence
): WalletTrackRecord {
  const timestamps =
    data.history.transactions
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
          Date.parse(left) -
          Date.parse(right)
      );

  const first =
    timestamps[0] ??
    null;

  const last =
    timestamps[
      timestamps.length - 1
    ] ?? null;

  const observedSpanDays =
    first &&
    last
      ? Math.max(
          0,
          Math.floor(
            (
              Date.parse(last) -
              Date.parse(first)
            ) /
              86_400_000
          )
        )
      : null;

  return {
    status:
      data.account.exists
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
          "xrpl-transactions",

        label:
          "Observed transactions",

        value:
          String(
            data.history.transactions.length
          ),

        detail:
          "Transactions in the bounded XRP Ledger evidence window.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "xrpl-counterparties",

        label:
          "Counterparties",

        value:
          String(
            data.derived.counterparties.counterpartyCount
          ),

        detail:
          "Observed direct transaction and trust-line relationships.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "xrpl-trust-lines",

        label:
          "Trust lines",

        value:
          String(
            data.derived.trustLines.trustLineCount
          ),

        detail:
          "Observed XRPL trust-line relationships.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "xrpl-incoming",

        label:
          "Incoming activity",

        value:
          String(
            data.derived.flow.incomingCount
          ),

        detail:
          "Observed inbound activity in the bounded evidence window.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "xrpl-outgoing",

        label:
          "Outgoing activity",

        value:
          String(
            data.derived.flow.outgoingCount
          ),

        detail:
          "Observed outbound activity in the bounded evidence window.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "xrpl-account-objects",

        label:
          "Account objects",

        value:
          String(
            data.derived.accountObjects.objectCount
          ),

        detail:
          "Observed XRP Ledger account objects.",

        evidenceState:
          "SUPPORTED",
      },
    ],

    limitation:
      "XRPL Track Record is bounded to the ledger evidence collected for this AYZO analysis. It is not exhaustive lifetime history.",

    methodology:
      "AYZO reports observed XRP Ledger evidence without inferring real-world identity, ownership, intent or future performance.",

    evidenceState:
      "SUPPORTED",
  };
}

export function buildXrplVisualEvidenceGraph(
  data:
    XrplIntelligence
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

  const pushNode =
    (
      node:
        VisualEvidenceNode
    ) => {
      if (
        seen.has(node.id) ||
        nodes.length >=
          maxNodes
      ) {
        return false;
      }

      seen.add(node.id);
      nodes.push(node);

      return true;
    };

  const rootId =
    `xrpl:${data.address}`;

  pushNode({
    id:
      rootId,

    kind:
      "root_wallet",

    label:
      data.address,

    detail:
      "Analyzed XRP Ledger account",

    evidenceState:
      "SUPPORTED",
  });

  if (
    data.firstObservedFunding
  ) {
    const fundingId =
      `xrpl:${data.firstObservedFunding.source}`;

    if (
      pushNode({
        id:
          fundingId,

        kind:
          "funding_source",

        label:
          data.firstObservedFunding.source,

        detail:
          "Observed early inbound funding source",

        evidenceState:
          "SUPPORTED",
      })
    ) {
      edges.push({
        id:
          `xrpl-funding:${data.firstObservedFunding.transactionHash}`,

        source:
          fundingId,

        target:
          rootId,

        kind:
          "funding",

        direction:
          "forward",

        label:
          "Observed inbound funding",

        evidenceState:
          "SUPPORTED",

        evidenceCount:
          1,

        evidenceRefs: [
          data.firstObservedFunding.transactionHash,
        ],
      });
    }
  }

  for (
    const counterparty of
    data.derived.counterparties.counterparties
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
      `xrpl:${counterparty.address}`;

    if (
      !pushNode({
        id,

        kind:
          "wallet",

        label:
          counterparty.address,

        detail:
          `${counterparty.interactionCount} observed relationship signal(s)`,

        evidenceState:
          "SUPPORTED",
      })
    ) {
      continue;
    }

    edges.push({
      id:
        `xrpl-edge:${counterparty.address}`,

      source:
        rootId,

      target:
        id,

      kind:
        "direct_interaction",

      direction:
        counterparty.incomingCount >
          0 &&
        counterparty.outgoingCount >
          0
          ? "bidirectional"
          : "observed",

      label:
        counterparty.trustLineCount >
          0
          ? "Transaction / trust-line relationship"
          : "Observed transaction relationship",

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        counterparty.interactionCount,

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
      "XRPL evidence graph is bounded to directly observed funding, transaction counterparties and trust-line relationships. Graph proximity does not establish common ownership, identity or control.",

    coverage: {
      maxNodes,
      maxEdges,
      ownershipInference:
        false,
    },
  };
}