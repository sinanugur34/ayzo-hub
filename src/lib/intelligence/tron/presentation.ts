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

import {
  tronAddressToHex,
} from "./address";

import type {
  TronIntelligence,
} from "./engine";

function normalizeHex(
  value:
    string | null
) {
  return value
    ?.trim()
    .toLowerCase() ??
    null;
}

function formatSun(
  value:
    string | null
) {
  if (!value) {
    return null;
  }

  try {
    const sun =
      BigInt(value);

    const whole =
      sun /
      1_000_000n;

    const fraction =
      (
        sun %
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

function successful(
  value:
    string | null
) {
  return (
    value
      ?.trim()
      .toUpperCase() ===
    "SUCCESS"
  );
}

export function buildTronActivityTimeline(
  data:
    TronIntelligence
): ActivityTimeline {
  const target =
    tronAddressToHex(
      data.address
    );

  const maxEvents =
    data.analysisPlan ===
      "advanced"
      ? 20
      : data.analysisPlan ===
          "pro"
        ? 10
        : 5;

  const events:
    ActivityTimelineEvent[] =
      data.canonicalTransactions.map(
        (
          transaction,
          index
        ) => {
          const contract =
            transaction.contract;

          const from =
            normalizeHex(
              contract
                ?.ownerAddressHex ??
              null
            );

          const to =
            normalizeHex(
              contract
                ?.toAddressHex ??
              contract
                ?.contractAddressHex ??
              null
            );

          const fromTarget =
            target !==
              null &&
            from ===
              target;

          const toTarget =
            target !==
              null &&
            to ===
              target;

          const direction =
            fromTarget &&
            toTarget
              ? "self" as const
              : toTarget
                ? "incoming" as const
                : fromTarget
                  ? "outgoing" as const
                  : "observed" as const;

          const type =
            contract
              ?.type ??
            null;

          const nativeRaw =
            successful(
              transaction.executionResult
            )
              ? type ===
                  "TransferContract"
                ? contract
                    ?.amountSun ??
                  null
                : type ===
                    "TriggerSmartContract"
                  ? contract
                      ?.callValueSun ??
                    null
                  : null
              : null;

          const hasNative =
            nativeRaw !==
              null &&
            nativeRaw !==
              "0";

          return {
            id:
              `tron:${transaction.transactionHash}:${index}`,

            timestamp:
              transaction.timestamp,

            blockNumber:
              transaction.blockHeight,

            kind:
              hasNative
                ? "native_transfer"
                : "transaction",

            direction,

            from,

            to,

            counterparty:
              direction ===
                "incoming"
                ? from
                : direction ===
                    "outgoing"
                  ? to
                  : null,

            asset:
              hasNative
                ? "TRX"
                : null,

            assetAddress:
              null,

            rawValue:
              hasNative
                ? nativeRaw
                : null,

            formattedValue:
              hasNative
                ? formatSun(
                    nativeRaw
                  )
                : null,

            transactionHash:
              transaction.transactionHash,

            evidenceState:
              "SUPPORTED",

            whyItMatters:
              !successful(
                transaction.executionResult
              )
                ? "Canonical TRON transaction observed, but execution was not successful; it is not counted as executed TRX flow."
                : hasNative &&
                    direction ===
                      "incoming"
                  ? "Observed inbound TRX supported by successful canonical contract evidence."
                  : hasNative &&
                      direction ===
                        "outgoing"
                    ? "Observed outbound TRX supported by successful canonical contract evidence."
                    : type ===
                        "TriggerSmartContract"
                      ? "Observed successful TRON smart-contract interaction."
                      : "Canonical TRON transaction evidence observed.",
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
      "TRON timeline is bounded to plan-aware solidified canonical samples. Failed execution is not counted as executed TRX flow.",

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

export function buildTronWalletTrackRecord(
  data:
    TronIntelligence
): WalletTrackRecord {
  const times =
    data.canonicalTransactions
      .map(
        transaction =>
          transaction.timestamp
      )
      .filter(
        (
          value
        ): value is string =>
          value !==
            null &&
          Number.isFinite(
            Date.parse(
              value
            )
          )
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
    times[0] ??
    null;

  const last =
    times[
      times.length -
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
              Date.parse(last) -
              Date.parse(first)
            ) /
              86_400_000
          )
        )
      : null;

  return {
    status:
      data.canonicalTransactions.length >
        0
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
          "tron-history",

        label:
          "History sampled",

        value:
          String(
            data.history
              .transactions
              .length
          ),

        detail:
          "Bounded confirmed TRON address-history records.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "tron-canonical",

        label:
          "Canonical verified",

        value:
          `${data.derived.canonicalCoverage.verified}/${data.derived.canonicalCoverage.requested}`,

        detail:
          "Solidified canonical transaction samples successfully verified.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "tron-counterparties",

        label:
          "Counterparties",

        value:
          String(
            data.derived
              .counterparties
              .count
          ),

        detail:
          "Explicit owner/destination relationships from canonical contract evidence.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "tron-incoming",

        label:
          "Incoming TRX activity",

        value:
          String(
            data.derived.flow
              .incomingTransactionCount
          ),

        detail:
          "Successful canonical inbound native TRX observations.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "tron-outgoing",

        label:
          "Outgoing TRX activity",

        value:
          String(
            data.derived.flow
              .outgoingTransactionCount
          ),

        detail:
          "Successful canonical outbound native TRX observations.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "tron-contracts",

        label:
          "Contract interactions",

        value:
          String(
            data.derived.flow
              .contractInteractionCount
          ),

        detail:
          "Canonical smart-contract interaction observations.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "tron-fees",

        label:
          "Observed fees",

        value:
          `${
            formatSun(
              data.derived
                .resources
                .feeSun
            ) ??
            "0"
          } TRX`,

        detail:
          "Total fee evidence from the bounded canonical sample.",

        evidenceState:
          "SUPPORTED",
      },
    ],

    limitation:
      "Track Record is bounded to TRON history and canonical evidence collected for the current analysis plan.",

    methodology:
      "AYZO uses explicit solidified contract evidence and does not infer identity, ownership, intent, or unobserved relationships.",

    evidenceState:
      "SUPPORTED",
  };
}

export function buildTronVisualEvidenceGraph(
  data:
    TronIntelligence
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

  const addNode =
    (
      node:
        VisualEvidenceNode
    ) => {
      if (
        seen.has(
          node.id
        ) ||
        nodes.length >=
          maxNodes
      ) {
        return false;
      }

      seen.add(
        node.id
      );

      nodes.push(
        node
      );

      return true;
    };

  const rootId =
    `tron-wallet:${data.address}`;

  addNode({
    id:
      rootId,

    kind:
      "root_wallet",

    label:
      data.address,

    detail:
      "Analyzed TRON address",

    evidenceState:
      "SUPPORTED",
  });

  for (
    const transaction of
    data.canonicalTransactions
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
      `tron-tx:${transaction.transactionHash}`;

    if (
      addNode({
        id,

        kind:
          "transaction",

        label:
          transaction.transactionHash,

        detail:
          successful(
            transaction.executionResult
          )
            ? "Solidified successful transaction"
            : "Solidified transaction evidence",

        evidenceState:
          "SUPPORTED",
      })
    ) {
      edges.push({
        id:
          `tron-canonical:${transaction.transactionHash}`,

        source:
          rootId,

        target:
          id,

        kind:
          "canonical_evidence",

        direction:
          "observed",

        label:
          "Solidified canonical evidence",

        evidenceState:
          "SUPPORTED",

        evidenceCount:
          1,

        evidenceRefs: [
          transaction.transactionHash,
        ],
      });
    }
  }

  for (
    const counterparty of
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
      `tron-wallet:${counterparty.addressHex}`;

    const isFunding =
      data.derived
        .observedFunding
        ?.sourceAddressHex ===
      counterparty.addressHex;

    if (
      !addNode({
        id,

        kind:
          isFunding
            ? "funding_source"
            : "wallet",

        label:
          counterparty.addressHex,

        detail:
          `${counterparty.observationCount} explicit relationship observation(s)`,

        evidenceState:
          "SUPPORTED",
      })
    ) {
      continue;
    }

    const incomingOnly =
      counterparty.incomingCount >
        0 &&
      counterparty.outgoingCount ===
        0;

    edges.push({
      id:
        `tron-counterparty:${counterparty.addressHex}`,

      source:
        incomingOnly
          ? id
          : rootId,

      target:
        incomingOnly
          ? rootId
          : id,

      kind:
        isFunding
          ? "funding"
          : "direct_interaction",

      direction:
        counterparty.incomingCount >
          0 &&
        counterparty.outgoingCount >
          0
          ? "bidirectional"
          : "forward",

      label:
        isFunding
          ? "Observed inbound TRX funding"
          : "Explicit TRON relationship",

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        Math.max(
          1,
          counterparty
            .observationCount
        ),

      evidenceRefs:
        [],
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
      "TRON graph contains only solidified canonical transaction evidence and explicit owner/destination relationships. Identity and ownership are not inferred.",

    coverage: {
      maxNodes,

      maxEdges,

      ownershipInference:
        false,
    },
  };
}