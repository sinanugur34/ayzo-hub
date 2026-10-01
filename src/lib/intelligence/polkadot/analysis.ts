import type {
  PolkadotAnalysisPolicy,
} from "./policy";

import type {
  PolkadotEvidence,
} from "./types";

export type PolkadotDerivedAnalysis = {
  flow: {
    incomingCount:
      number;

    outgoingCount:
      number;

    incomingPlanck:
      string;

    outgoingPlanck:
      string;

    transfers:
      readonly {
        direction:
          "incoming" |
          "outgoing";

        counterparty:
          string;

        amountPlanck:
          string | null;

        extrinsicHash:
          string | null;

        extrinsicIndex:
          string | null;

        timestamp:
          string | null;
      }[];
  };

  counterparties: {
    count:
      number;

    items:
      readonly {
        address:
          string;

        incomingCount:
          number;

        outgoingCount:
          number;

        observationCount:
          number;

        evidenceRefs:
          readonly string[];
      }[];
  };

  observedFunding:
    | {
        sourceAddress:
          string;

        amountPlanck:
          string | null;

        extrinsicHash:
          string | null;

        timestamp:
          string | null;
      }
    | null;

  staking: {
    observed:
      boolean;

    status:
      string | null;

    bondedPlanck:
      string | null;

    controllerAddress:
      string | null;

    rewardAddress:
      string | null;
  };

  proxy: {
    observedCount:
      number;
  };

  multisig: {
    observedCount:
      number;
  };

  timeline: {
    events:
      readonly {
        id:
          string;

        timestamp:
          string | null;

        direction:
          "incoming" |
          "outgoing";

        counterparty:
          string;

        amountPlanck:
          string | null;

        evidenceRef:
          string | null;
      }[];
  };

  graph: {
    nodes:
      readonly {
        id:
          string;

        kind:
          "root" |
          "counterparty";

        label:
          string;
      }[];

    edges:
      readonly {
        id:
          string;

        source:
          string;

        target:
          string;

        direction:
          "incoming" |
          "outgoing";

        evidenceCount:
          number;
      }[];
  };
};

function add(
  left:
    string,
  right:
    string | null
) {
  if (
    !right ||
    !/^\d+$/.test(
      right
    )
  ) {
    return left;
  }

  return (
    BigInt(left) +
    BigInt(right)
  ).toString();
}

export function buildPolkadotDerivedAnalysis(
  {
    address,
    evidence,
    policy,
  }: {
    address:
      string;

    evidence:
      PolkadotEvidence;

    policy:
      PolkadotAnalysisPolicy;
  }
): PolkadotDerivedAnalysis {
  let incomingPlanck =
    "0";

  let outgoingPlanck =
    "0";

  const transfers:
    {
      direction:
        "incoming" |
        "outgoing";

      counterparty:
        string;

      amountPlanck:
        string | null;

      extrinsicHash:
        string | null;

      extrinsicIndex:
        string | null;

      timestamp:
        string | null;
    }[] = [];

  const peers =
    new Map<
      string,
      {
        incoming:
          number;

        outgoing:
          number;

        refs:
          Set<string>;
      }
    >();

  for (
    const transfer of
    evidence.transfers
  ) {
    let direction:
      "incoming" |
      "outgoing" |
      null =
        null;

    let counterparty:
      string | null =
        null;

    if (
      transfer.to ===
        address &&
      transfer.from &&
      transfer.from !==
        address
    ) {
      direction =
        "incoming";

      counterparty =
        transfer.from;

      incomingPlanck =
        add(
          incomingPlanck,
          transfer
            .amountPlanck
        );
    } else if (
      transfer.from ===
        address &&
      transfer.to &&
      transfer.to !==
        address
    ) {
      direction =
        "outgoing";

      counterparty =
        transfer.to;

      outgoingPlanck =
        add(
          outgoingPlanck,
          transfer
            .amountPlanck
        );
    }

    if (
      !direction ||
      !counterparty
    ) {
      continue;
    }

    const ref =
      transfer
        .extrinsicHash ??
      transfer
        .extrinsicIndex;

    transfers.push({
      direction,
      counterparty,

      amountPlanck:
        transfer
          .amountPlanck,

      extrinsicHash:
        transfer
          .extrinsicHash,

      extrinsicIndex:
        transfer
          .extrinsicIndex,

      timestamp:
        transfer
          .timestamp,
    });

    const state =
      peers.get(
        counterparty
      ) ?? {
        incoming:
          0,

        outgoing:
          0,

        refs:
          new Set<string>(),
      };

    if (
      direction ===
        "incoming"
    ) {
      state.incoming +=
        1;
    } else {
      state.outgoing +=
        1;
    }

    if (ref) {
      state.refs.add(
        ref
      );
    }

    peers.set(
      counterparty,
      state
    );
  }

  const counterparties =
    [...peers.entries()]
      .map(
        (
          [
            peer,
            state,
          ]
        ) => ({
          address:
            peer,

          incomingCount:
            state.incoming,

          outgoingCount:
            state.outgoing,

          observationCount:
            state.incoming +
            state.outgoing,

          evidenceRefs:
            [...state.refs],
        })
      )
      .sort(
        (
          left,
          right
        ) =>
          right
            .observationCount -
          left
            .observationCount
      );

  const fundingTransfer =
    [...transfers]
      .filter(
        transfer =>
          transfer.direction ===
            "incoming"
      )
      .sort(
        (
          left,
          right
        ) =>
          (
            left.timestamp ??
            ""
          ).localeCompare(
            right.timestamp ??
            ""
          )
      )[0] ??
    null;

  const graphPeers =
    counterparties.slice(
      0,
      Math.max(
        0,
        policy
          .graphMaxNodes -
          1
      )
    );

  return {
    flow: {
      incomingCount:
        transfers.filter(
          item =>
            item.direction ===
              "incoming"
        ).length,

      outgoingCount:
        transfers.filter(
          item =>
            item.direction ===
              "outgoing"
        ).length,

      incomingPlanck,
      outgoingPlanck,
      transfers,
    },

    counterparties: {
      count:
        counterparties
          .length,

      items:
        counterparties,
    },

    observedFunding:
      fundingTransfer
        ? {
            sourceAddress:
              fundingTransfer
                .counterparty,

            amountPlanck:
              fundingTransfer
                .amountPlanck,

            extrinsicHash:
              fundingTransfer
                .extrinsicHash,

            timestamp:
              fundingTransfer
                .timestamp,
          }
        : null,

    staking: {
      observed:
        evidence
          .staking !==
        null,

      status:
        evidence
          .staking
          ?.status ??
        null,

      bondedPlanck:
        evidence
          .staking
          ?.bondedPlanck ??
        null,

      controllerAddress:
        evidence
          .staking
          ?.controllerAddress ??
        null,

      rewardAddress:
        evidence
          .staking
          ?.rewardAddress ??
        null,
    },

    proxy: {
      observedCount:
        evidence
          .proxies
          .length,
    },

    multisig: {
      observedCount:
        evidence
          .multisig
          .length,
    },

    timeline: {
      events:
        transfers
          .slice(
            0,
            policy
              .timelineMaxEvents
          )
          .map(
            (
              transfer,
              index
            ) => ({
              id:
                `polkadot:${transfer.extrinsicHash ?? transfer.extrinsicIndex ?? index}`,

              timestamp:
                transfer.timestamp,

              direction:
                transfer.direction,

              counterparty:
                transfer.counterparty,

              amountPlanck:
                transfer.amountPlanck,

              evidenceRef:
                transfer.extrinsicHash ??
                transfer.extrinsicIndex,
            })
          ),
    },

    graph: {
      nodes: [
        {
          id:
            `polkadot:${address}`,

          kind:
            "root",

          label:
            address,
        },

        ...graphPeers.map(
          peer => ({
            id:
              `polkadot:${peer.address}`,

            kind:
              "counterparty" as const,

            label:
              peer.address,
          })
        ),
      ],

      edges:
        graphPeers
          .slice(
            0,
            policy
              .graphMaxEdges
          )
          .map(
            (
              peer,
              index
            ) => {
              const incomingOnly =
                peer
                  .incomingCount >
                  0 &&
                peer
                  .outgoingCount ===
                  0;

              return {
                id:
                  `polkadot-edge:${index}:${peer.address}`,

                source:
                  incomingOnly
                    ? `polkadot:${peer.address}`
                    : `polkadot:${address}`,

                target:
                  incomingOnly
                    ? `polkadot:${address}`
                    : `polkadot:${peer.address}`,

                direction:
                  incomingOnly
                    ? "incoming" as const
                    : "outgoing" as const,

                evidenceCount:
                  peer
                    .observationCount,
              };
            }
          ),
    },
  };
}
