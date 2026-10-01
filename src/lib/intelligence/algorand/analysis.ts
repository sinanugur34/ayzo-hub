import type {
  AlgorandAnalysisPolicy,
} from "./policy";

import {
  normalizeAlgorandAddress,
} from "./address";

import type {
  AlgorandEvidence,
  AlgorandTransactionEvidence,
} from "./types";

export type AlgorandFlowEvidence = {
  transactionId:
    string | null;

  confirmedRound:
    number | null;

  roundTime:
    number | null;

  direction:
    "incoming" |
    "outgoing";

  counterparty:
    string;

  asset:
    "ALGO" |
    `ASA:${number}`;

  amount:
    string | null;

  kind:
    "payment" |
    "asset-transfer" |
    "close-remainder" |
    "asset-close";
};

export type AlgorandDerivedAnalysis = {
  activity: {
    observedTransactionCount:
      number;

    observedInnerTransactionCount:
      number;

    applicationCallCount:
      number;

    rekeyTransactionCount:
      number;
  };

  flow: {
    incomingCount:
      number;

    outgoingCount:
      number;

    incomingMicroAlgos:
      string;

    outgoingMicroAlgos:
      string;

    transfers:
      readonly AlgorandFlowEvidence[];
  };

  counterparties: {
    count:
      number;

    items:
      readonly {
        address:
          string;

        observationCount:
          number;

        incomingCount:
          number;

        outgoingCount:
          number;

        transactionIds:
          readonly string[];
      }[];
  };

  assets: {
    holdingCount:
      number;

    createdAssetCount:
      number;

    controlledAssetCount:
      number;
  };

  applications: {
    localStateCount:
      number;

    createdApplicationCount:
      number;

    observedCallCount:
      number;
  };

  authority: {
    currentAuthAddress:
      string | null;

    observedRekeys:
      readonly {
        transactionId:
          string | null;

        rekeyTo:
          string;

        confirmedRound:
          number | null;
      }[];

    assetControls:
      readonly {
        assetId:
          number;

        manager:
          string | null;

        reserve:
          string | null;

        freeze:
          string | null;

        clawback:
          string | null;
      }[];
  };

  observedFunding:
    | {
        sourceAddress:
          string;

        transactionId:
          string | null;

        amountMicroAlgos:
          string;

        confirmedRound:
          number | null;

        roundTime:
          number | null;
      }
    | null;

  timeline: {
    events:
      readonly {
        transactionId:
          string | null;

        confirmedRound:
          number | null;

        roundTime:
          number | null;

        type:
          AlgorandTransactionEvidence[
            "type"
          ];

        inner:
          boolean;

        sender:
          string | null;
      }[];
  };

  graph: {
    nodes:
      readonly {
        id:
          string;

        kind:
          "subject" |
          "counterparty";
      }[];

    edges:
      readonly {
        source:
          string;

        target:
          string;

        transactionId:
          string | null;

        asset:
          string;

        amount:
          string | null;
      }[];
  };
};

function bigintOrZero(
  value:
    string | null
) {
  if (!value) {
    return 0n;
  }

  try {
    return BigInt(
      value
    );
  } catch {
    return 0n;
  }
}

function flattened(
  transactions:
    readonly AlgorandTransactionEvidence[]
) {
  const result:
    {
      transaction:
        AlgorandTransactionEvidence;

      inner:
        boolean;
    }[] = [];

  function visit(
    transaction:
      AlgorandTransactionEvidence,
    inner:
      boolean
  ) {
    result.push({
      transaction,
      inner,
    });

    for (
      const child of
      transaction
        .innerTransactions
    ) {
      visit(
        child,
        true
      );
    }
  }

  for (
    const transaction of
    transactions
  ) {
    visit(
      transaction,
      false
    );
  }

  return result;
}

export function buildAlgorandDerivedAnalysis({
  address,
  evidence,
  policy,
}: {
  address:
    string;

  evidence:
    AlgorandEvidence;

  policy:
    AlgorandAnalysisPolicy;
}): AlgorandDerivedAnalysis {
  const root =
    normalizeAlgorandAddress(
      address
    );

  if (!root) {
    throw new Error(
      "Algorand analysis received invalid root address."
    );
  }

  const observations =
    flattened(
      evidence
        .transactions
    );

  const transfers:
    AlgorandFlowEvidence[] =
      [];

  const relationships =
    new Map<
      string,
      {
        incoming:
          number;

        outgoing:
          number;

        transactionIds:
          Set<string>;
      }
    >();

  let incomingMicroAlgos =
    0n;

  let outgoingMicroAlgos =
    0n;

  function observe(
    counterparty:
      string,
    direction:
      "incoming" |
      "outgoing",
    transactionId:
      string | null
  ) {
    if (
      counterparty === root
    ) {
      return;
    }

    const current =
      relationships.get(
        counterparty
      ) ?? {
        incoming:
          0,

        outgoing:
          0,

        transactionIds:
          new Set<string>(),
      };

    if (
      direction ===
        "incoming"
    ) {
      current.incoming +=
        1;
    } else {
      current.outgoing +=
        1;
    }

    if (
      transactionId
    ) {
      current
        .transactionIds
        .add(
          transactionId
        );
    }

    relationships.set(
      counterparty,
      current
    );
  }

  function addTransfer(
    transfer:
      AlgorandFlowEvidence
  ) {
    transfers.push(
      transfer
    );

    observe(
      transfer
        .counterparty,
      transfer.direction,
      transfer
        .transactionId
    );

    if (
      transfer.asset ===
        "ALGO" &&
      transfer.amount
    ) {
      if (
        transfer.direction ===
          "incoming"
      ) {
        incomingMicroAlgos +=
          bigintOrZero(
            transfer.amount
          );
      } else {
        outgoingMicroAlgos +=
          bigintOrZero(
            transfer.amount
          );
      }
    }
  }

  for (
    const {
      transaction,
    } of observations
  ) {
    const sender =
      transaction.sender;

    const payment =
      transaction.payment;

    if (
      payment
    ) {
      const receiver =
        payment.receiver;

      if (
        sender &&
        sender !== root &&
        receiver === root
      ) {
        addTransfer({
          transactionId:
            transaction.id,

          confirmedRound:
            transaction
              .confirmedRound,

          roundTime:
            transaction
              .roundTime,

          direction:
            "incoming",

          counterparty:
            sender,

          asset:
            "ALGO",

          amount:
            payment
              .amountMicroAlgos,

          kind:
            "payment",
        });
      }

      if (
        sender === root &&
        receiver &&
        receiver !== root
      ) {
        addTransfer({
          transactionId:
            transaction.id,

          confirmedRound:
            transaction
              .confirmedRound,

          roundTime:
            transaction
              .roundTime,

          direction:
            "outgoing",

          counterparty:
            receiver,

          asset:
            "ALGO",

          amount:
            payment
              .amountMicroAlgos,

          kind:
            "payment",
        });
      }

      if (
        sender &&
        sender !== root &&
        payment
          .closeRemainderTo ===
          root
      ) {
        addTransfer({
          transactionId:
            transaction.id,

          confirmedRound:
            transaction
              .confirmedRound,

          roundTime:
            transaction
              .roundTime,

          direction:
            "incoming",

          counterparty:
            sender,

          asset:
            "ALGO",

          amount:
            null,

          kind:
            "close-remainder",
        });
      }

      if (
        sender === root &&
        payment
          .closeRemainderTo &&
        payment
          .closeRemainderTo !==
          root
      ) {
        addTransfer({
          transactionId:
            transaction.id,

          confirmedRound:
            transaction
              .confirmedRound,

          roundTime:
            transaction
              .roundTime,

          direction:
            "outgoing",

          counterparty:
            payment
              .closeRemainderTo,

          asset:
            "ALGO",

          amount:
            null,

          kind:
            "close-remainder",
        });
      }
    }

    const asset =
      transaction
        .assetTransfer;

    if (
      asset &&
      asset.assetId !==
        null
    ) {
      const source:
        string | null =
          asset
            .explicitSender ??
          sender;

      const receiver =
        asset.receiver;

      const unit =
        `ASA:${asset.assetId}` as const;

      if (
        source &&
        source !== root &&
        receiver === root
      ) {
        addTransfer({
          transactionId:
            transaction.id,

          confirmedRound:
            transaction
              .confirmedRound,

          roundTime:
            transaction
              .roundTime,

          direction:
            "incoming",

          counterparty:
            source,

          asset:
            unit,

          amount:
            asset.amount,

          kind:
            "asset-transfer",
        });
      }

      if (
        source === root &&
        receiver &&
        receiver !== root
      ) {
        addTransfer({
          transactionId:
            transaction.id,

          confirmedRound:
            transaction
              .confirmedRound,

          roundTime:
            transaction
              .roundTime,

          direction:
            "outgoing",

          counterparty:
            receiver,

          asset:
            unit,

          amount:
            asset.amount,

          kind:
            "asset-transfer",
        });
      }

      if (
        source &&
        source !== root &&
        asset.closeTo ===
          root
      ) {
        addTransfer({
          transactionId:
            transaction.id,

          confirmedRound:
            transaction
              .confirmedRound,

          roundTime:
            transaction
              .roundTime,

          direction:
            "incoming",

          counterparty:
            source,

          asset:
            unit,

          amount:
            null,

          kind:
            "asset-close",
        });
      }

      if (
        source === root &&
        asset.closeTo &&
        asset.closeTo !==
          root
      ) {
        addTransfer({
          transactionId:
            transaction.id,

          confirmedRound:
            transaction
              .confirmedRound,

          roundTime:
            transaction
              .roundTime,

          direction:
            "outgoing",

          counterparty:
            asset.closeTo,

          asset:
            unit,

          amount:
            null,

          kind:
            "asset-close",
        });
      }
    }
  }

  const counterparties =
    [...relationships]
      .map(
        (
          [
            counterparty,
            item,
          ]
        ) => ({
          address:
            counterparty,

          incomingCount:
            item.incoming,

          outgoingCount:
            item.outgoing,

          observationCount:
            item.incoming +
            item.outgoing,

          transactionIds:
            [...item
              .transactionIds],
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

  const observedFunding =
    transfers
      .filter(
        transfer =>
          transfer.direction ===
            "incoming" &&
          transfer.asset ===
            "ALGO" &&
          transfer.amount !==
            null
      )
      .sort(
        (
          left,
          right
        ) =>
          (
            left.confirmedRound ??
            Number.MAX_SAFE_INTEGER
          ) -
          (
            right.confirmedRound ??
            Number.MAX_SAFE_INTEGER
          )
      )[0] ??
    null;

  const rekeys =
    observations
      .map(
        item =>
          item.transaction
      )
      .filter(
        transaction =>
          transaction
            .rekeyTo !==
          null
      )
      .map(
        transaction => ({
          transactionId:
            transaction.id,

          rekeyTo:
            transaction
              .rekeyTo!,

          confirmedRound:
            transaction
              .confirmedRound,
        })
      );

  const assetControls =
    evidence
      .createdAssets
      .filter(
        item =>
          item.manager ||
          item.reserve ||
          item.freeze ||
          item.clawback
      )
      .map(
        item => ({
          assetId:
            item.assetId,

          manager:
            item.manager,

          reserve:
            item.reserve,

          freeze:
            item.freeze,

          clawback:
            item.clawback,
        })
      );

  const timeline =
    observations
      .slice(
        0,
        policy
          .timelineMaxEvents
      )
      .map(
        item => ({
          transactionId:
            item.transaction
              .id,

          confirmedRound:
            item.transaction
              .confirmedRound,

          roundTime:
            item.transaction
              .roundTime,

          type:
            item.transaction
              .type,

          inner:
            item.inner,

          sender:
            item.transaction
              .sender,
        })
      );

  const graphCounterparties =
    counterparties
      .slice(
        0,
        Math.max(
          0,
          policy
            .graphMaxNodes -
            1
        )
      );

  const allowed =
    new Set(
      graphCounterparties
        .map(
          item =>
            item.address
        )
    );

  const graphEdges =
    transfers
      .filter(
        transfer =>
          allowed.has(
            transfer.counterparty
          )
      )
      .slice(
        0,
        policy
          .graphMaxEdges
      )
      .map(
        transfer => ({
          source:
            transfer.direction ===
              "incoming"
              ? transfer
                  .counterparty
              : root,

          target:
            transfer.direction ===
              "incoming"
              ? root
              : transfer
                  .counterparty,

          transactionId:
            transfer
              .transactionId,

          asset:
            transfer.asset,

          amount:
            transfer.amount,
        })
      );

  const appCalls =
    observations.filter(
      item =>
        item.transaction
          .applicationCall !==
        null
    ).length;

  return {
    activity: {
      observedTransactionCount:
        evidence
          .transactions
          .length,

      observedInnerTransactionCount:
        observations.filter(
          item =>
            item.inner
        ).length,

      applicationCallCount:
        appCalls,

      rekeyTransactionCount:
        rekeys.length,
    },

    flow: {
      incomingCount:
        transfers.filter(
          transfer =>
            transfer.direction ===
              "incoming"
        ).length,

      outgoingCount:
        transfers.filter(
          transfer =>
            transfer.direction ===
              "outgoing"
        ).length,

      incomingMicroAlgos:
        incomingMicroAlgos
          .toString(),

      outgoingMicroAlgos:
        outgoingMicroAlgos
          .toString(),

      transfers,
    },

    counterparties: {
      count:
        counterparties.length,

      items:
        counterparties,
    },

    assets: {
      holdingCount:
        evidence.assets.length,

      createdAssetCount:
        evidence
          .createdAssets
          .length,

      controlledAssetCount:
        assetControls.length,
    },

    applications: {
      localStateCount:
        evidence
          .appLocalStates
          .length,

      createdApplicationCount:
        evidence
          .createdApplications
          .length,

      observedCallCount:
        appCalls,
    },

    authority: {
      currentAuthAddress:
        evidence
          .authAddress,

      observedRekeys:
        rekeys,

      assetControls,
    },

    observedFunding:
      observedFunding
        ? {
            sourceAddress:
              observedFunding
                .counterparty,

            transactionId:
              observedFunding
                .transactionId,

            amountMicroAlgos:
              observedFunding
                .amount!,

            confirmedRound:
              observedFunding
                .confirmedRound,

            roundTime:
              observedFunding
                .roundTime,
          }
        : null,

    timeline: {
      events:
        timeline,
    },

    graph: {
      nodes: [
        {
          id:
            root,

          kind:
            "subject" as const,
        },

        ...graphCounterparties
          .map(
            item => ({
              id:
                item.address,

              kind:
                "counterparty" as const,
            })
          ),
      ],

      edges:
        graphEdges,
    },
  };
}
