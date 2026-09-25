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
  DogecoinIntelligence,
} from "./engine";

function sameAddress(
  left:
    string,
  right:
    string
) {
  return left.trim() ===
    right.trim();
}

function formatKoinu(
  value:
    string | null
) {
  if (!value) {
    return null;
  }

  try {
    const amount =
      BigInt(value);

    const whole =
      amount /
      100_000_000n;

    const fraction =
      (
        amount %
        100_000_000n
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

function unique(
  values:
    readonly string[]
) {
  return [
    ...new Set(
      values
        .map(
          value =>
            value.trim()
        )
        .filter(
          Boolean
        )
    ),
  ];
}

export function buildDogecoinActivityTimeline(
  data:
    DogecoinIntelligence
): ActivityTimeline {
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
          const inputs =
            unique(
              transaction.inputs.flatMap(
                input =>
                  input.addresses
              )
            );

          const outputs =
            unique(
              transaction.outputs.flatMap(
                output =>
                  output.addresses
              )
            );

          const targetInput =
            inputs.some(
              candidate =>
                sameAddress(
                  candidate,
                  data.address
                )
            );

          const targetOutput =
            outputs.some(
              candidate =>
                sameAddress(
                  candidate,
                  data.address
                )
            );

          const externalOutputs =
            transaction.outputs.filter(
              output =>
                output.addresses.some(
                  candidate =>
                    !sameAddress(
                      candidate,
                      data.address
                    )
                )
            );

          const onlyTargetOutputs =
            transaction.outputs.length >
              0 &&
            transaction.outputs.every(
              output =>
                output.addresses.length >
                  0 &&
                output.addresses.every(
                  candidate =>
                    sameAddress(
                      candidate,
                      data.address
                    )
                )
            );

          const direction =
            targetInput &&
            onlyTargetOutputs
              ? "self" as const
              : targetInput &&
                  externalOutputs.length >
                    0
                ? "outgoing" as const
                : !targetInput &&
                    targetOutput
                  ? "incoming" as const
                  : "observed" as const;

          const incomingValue =
            transaction.outputs
              .filter(
                output =>
                  output.addresses.some(
                    candidate =>
                      sameAddress(
                        candidate,
                        data.address
                      )
                  )
              )
              .reduce(
                (
                  total,
                  output
                ) =>
                  total +
                  BigInt(
                    output.valueKoinu
                  ),
                0n
              );

          const outgoingValue =
            externalOutputs.reduce(
              (
                total,
                output
              ) =>
                total +
                BigInt(
                  output.valueKoinu
                ),
              0n
            );

          const rawValue =
            direction ===
              "incoming"
              ? incomingValue.toString()
              : direction ===
                  "outgoing"
                ? outgoingValue.toString()
                : null;

          const from =
            direction ===
              "incoming"
              ? inputs.find(
                  candidate =>
                    !sameAddress(
                      candidate,
                      data.address
                    )
                ) ??
                null
              : direction ===
                  "outgoing"
                ? data.address
                : null;

          const to =
            direction ===
              "incoming"
              ? data.address
              : direction ===
                  "outgoing"
                ? outputs.find(
                    candidate =>
                      !sameAddress(
                        candidate,
                        data.address
                      )
                  ) ??
                  null
                : null;

          return {
            id:
              `doge:${transaction.transactionHash}:${index}`,

            timestamp:
              transaction.timestamp,

            blockNumber:
              transaction.blockHeight,

            kind:
              rawValue
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
              rawValue
                ? "DOGE"
                : null,

            assetAddress:
              null,

            rawValue,

            formattedValue:
              formatKoinu(
                rawValue
              ),

            transactionHash:
              transaction.transactionHash,

            evidenceState:
              "SUPPORTED",

            whyItMatters:
              direction ===
                "incoming"
                ? "Observed inbound DOGE supported by canonical UTXO evidence."
                : direction ===
                    "outgoing"
                  ? "Observed outbound DOGE to explicit non-target output addresses."
                  : direction ===
                      "self"
                    ? "Observed self-directed UTXO activity."
                    : "Canonical Dogecoin transaction observed; direction could not be resolved without stronger address evidence.",
          };
        }
      );

  return {
    status:
      data.canonicalTransactions.length >
        0
        ? "limited"
        : "unavailable",

    limitation:
      "Dogecoin timeline is bounded to plan-aware canonical transaction samples. Unresolved prevout addresses are not inferred.",

    events:
      events.slice(
        0,
        maxEvents
      ),

    evidenceWindow: {
      transactionCount:
        data.history.transactions.length,

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

export function buildDogecoinWalletTrackRecord(
  data:
    DogecoinIntelligence
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
          value !== null &&
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
          "doge-history",

        label:
          "History sampled",

        value:
          String(
            data.history.transactions.length
          ),

        detail:
          "Bounded Dogecoin address-history records.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "doge-canonical",

        label:
          "Canonical verified",

        value:
          `${data.derived.canonicalCoverage.verified}/${data.derived.canonicalCoverage.requested}`,

        detail:
          "Plan-aware canonical transaction samples successfully verified.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "doge-counterparties",

        label:
          "Counterparties",

        value:
          String(
            data.derived.counterparties.count
          ),

        detail:
          "Explicit input/output address relationships only.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "doge-incoming",

        label:
          "Incoming activity",

        value:
          String(
            data.derived.flow.incomingTransactionCount
          ),

        detail:
          "Canonical samples where the analyzed address appears as an output without appearing as an input.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "doge-outgoing",

        label:
          "Outgoing activity",

        value:
          String(
            data.derived.flow.outgoingTransactionCount
          ),

        detail:
          "Canonical samples with analyzed-address inputs and explicit non-target outputs.",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "doge-funding",

        label:
          "Observed funding",

        value:
          data.derived.observedFunding
            ? "Observed"
            : "Not resolved",

        detail:
          data.derived.observedFunding
            ? "Explicit source address observed in canonical input evidence."
            : "No explicit inbound source address was resolved in the bounded sample.",

        evidenceState:
          "SUPPORTED",
      },
    ],

    limitation:
      "Track Record is bounded to Dogecoin address history and canonical transactions collected for the current analysis plan.",

    methodology:
      "AYZO does not infer change ownership, unresolved prevout sources, identity, beneficial ownership or intent.",

    evidenceState:
      "SUPPORTED",
  };
}

export function buildDogecoinVisualEvidenceGraph(
  data:
    DogecoinIntelligence
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
    `doge-wallet:${data.address}`;

  addNode({
    id:
      rootId,

    kind:
      "root_wallet",

    label:
      data.address,

    detail:
      "Analyzed Dogecoin address",

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

    const txId =
      `doge-tx:${transaction.transactionHash}`;

    if (
      addNode({
        id:
          txId,

        kind:
          "transaction",

        label:
          transaction.transactionHash,

        detail:
          transaction.confirmed
            ? "Canonical confirmed transaction"
            : "Canonical transaction",

        evidenceState:
          "SUPPORTED",
      })
    ) {
      edges.push({
        id:
          `doge-history:${transaction.transactionHash}`,

        source:
          rootId,

        target:
          txId,

        kind:
          "canonical_evidence",

        direction:
          "observed",

        label:
          "Canonical UTXO evidence",

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
    data.derived.counterparties.items
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
      `doge-wallet:${counterparty.address}`;

    if (
      !addNode({
        id,

        kind:
          data.derived.observedFunding
            ?.sourceAddress ===
          counterparty.address
            ? "funding_source"
            : "wallet",

        label:
          counterparty.address,

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
        `doge-counterparty:${counterparty.address}`,

      source:
        incomingOnly
          ? id
          : rootId,

      target:
        incomingOnly
          ? rootId
          : id,

      kind:
        data.derived.observedFunding
          ?.sourceAddress ===
        counterparty.address
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
        data.derived.observedFunding
          ?.sourceAddress ===
        counterparty.address
          ? "Observed inbound funding"
          : "Explicit UTXO address relationship",

      evidenceState:
        "SUPPORTED",

      evidenceCount:
        Math.max(
          1,
          counterparty.observationCount
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
      "Dogecoin graph contains only canonical transaction evidence and explicit input/output address relationships. Change ownership, identity and unresolved prevout sources are not inferred.",

    coverage: {
      maxNodes,
      maxEdges,
      ownershipInference:
        false,
    },
  };
}
