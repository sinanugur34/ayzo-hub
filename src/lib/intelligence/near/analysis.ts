import type {
  NearIndexedEvidence,
  NearObservedAction,
  NearRpcEvidence,
} from "./types";

export type NearTransferEvidence = {
  transactionHash:
    string;

  receiptId:
    string | null;

  timestamp:
    string | null;

  direction:
    "incoming" |
    "outgoing";

  counterparty:
    string;

  amountYoctoNear:
    string | null;

  source:
    "transaction" |
    "receipt";
};

export type NearDerivedAnalysis = {
  activity: {
    transactionCount:
      number;

    receiptCount:
      number;

    actionCount:
      number;

    functionCallCount:
      number;

    transferActionCount:
      number;
  };

  flow: {
    incomingTransferCount:
      number;

    outgoingTransferCount:
      number;

    incomingYoctoNear:
      string;

    outgoingYoctoNear:
      string;

    transfers:
      readonly NearTransferEvidence[];
  };

  counterparties: {
    count:
      number;

    items:
      readonly {
        accountId:
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

  specialist: {
    accessKeyCount:
      number;

    functionCallMethods:
      readonly string[];

    receiptActionCount:
      number;
  };

  observedFunding:
    | {
        sourceAccountId:
          string;

        transactionHash:
          string;

        amountYoctoNear:
          string | null;

        timestamp:
          string | null;
      }
    | null;
};

function bigintOrZero(
  value:
    string | null
) {
  try {
    return value
      ? BigInt(value)
      : 0n;
  } catch {
    return 0n;
  }
}

function actionRef(
  action:
    NearObservedAction
) {
  return (
    action.receiptId ??
    action.transactionHash ??
    "near-action"
  );
}

export function buildNearDerivedAnalysis({
  accountId,
  rpc,
  indexed,
}: {
  accountId:
    string;

  rpc:
    NearRpcEvidence;

  indexed:
    NearIndexedEvidence | null;
}): NearDerivedAnalysis {
  const actions:
    NearObservedAction[] =
      [];

  if (
    indexed
  ) {
    for (
      const transaction of
      indexed.transactions
    ) {
      actions.push(
        ...transaction.actions
      );
    }

    for (
      const receipt of
      indexed.receipts
    ) {
      actions.push(
        ...receipt.actions
      );
    }
  }

  const relationshipMap =
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

  const transfers:
    NearTransferEvidence[] =
      [];

  const methods =
    new Set<string>();

  let incoming =
    0n;

  let outgoing =
    0n;

  function observe(
    counterparty:
      string,
    direction:
      "incoming" |
      "outgoing",
    ref:
      string
  ) {
    if (
      counterparty ===
      accountId
    ) {
      return;
    }

    const current =
      relationshipMap.get(
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
      current.incoming +=
        1;
    } else {
      current.outgoing +=
        1;
    }

    current.refs.add(
      ref
    );

    relationshipMap.set(
      counterparty,
      current
    );
  }

  for (
    const action of actions
  ) {
    if (
      action.type ===
        "FunctionCall" &&
      action.methodName
    ) {
      methods.add(
        action.methodName
      );
    }

    if (
      action.type !==
        "Transfer" &&
      action.type !==
        "FunctionCall"
    ) {
      continue;
    }

    const sender =
      action.senderId;

    const receiver =
      action.receiverId;

    const amount =
      action.depositYoctoNear;

    const ref =
      actionRef(
        action
      );

    if (
      sender ===
        accountId &&
      receiver &&
      receiver !==
        accountId
    ) {
      outgoing +=
        bigintOrZero(
          amount
        );

      transfers.push({
        transactionHash:
          action.transactionHash ??
          ref,

        receiptId:
          action.receiptId,

        timestamp:
          action.blockTimestamp,

        direction:
          "outgoing",

        counterparty:
          receiver,

        amountYoctoNear:
          amount,

        source:
          action.receiptId
            ? "receipt"
            : "transaction",
      });

      observe(
        receiver,
        "outgoing",
        ref
      );

      continue;
    }

    if (
      receiver ===
        accountId &&
      sender &&
      sender !==
        accountId
    ) {
      incoming +=
        bigintOrZero(
          amount
        );

      transfers.push({
        transactionHash:
          action.transactionHash ??
          ref,

        receiptId:
          action.receiptId,

        timestamp:
          action.blockTimestamp,

        direction:
          "incoming",

        counterparty:
          sender,

        amountYoctoNear:
          amount,

        source:
          action.receiptId
            ? "receipt"
            : "transaction",
      });

      observe(
        sender,
        "incoming",
        ref
      );
    }
  }

  const counterparties =
    [...relationshipMap]
      .map(
        (
          [
            counterparty,
            observation,
          ]
        ) => ({
          accountId:
            counterparty,

          incomingCount:
            observation
              .incoming,

          outgoingCount:
            observation
              .outgoing,

          observationCount:
            observation
              .incoming +
            observation
              .outgoing,

          evidenceRefs:
            [...observation.refs],
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

  /*
   * Observed funding must use the earliest explicit
   * inbound evidence available in the bounded window.
   */
  const inbound =
    transfers
      .filter(
        transfer =>
          transfer.direction ===
            "incoming" &&
          transfer.transactionHash
      )
      .sort(
        (
          left,
          right
        ) => {
          const l =
            left.timestamp
              ? Date.parse(
                  left.timestamp
                )
              : Number
                  .MAX_SAFE_INTEGER;

          const r =
            right.timestamp
              ? Date.parse(
                  right.timestamp
                )
              : Number
                  .MAX_SAFE_INTEGER;

          return l - r;
        }
      )[0] ??
    null;

  return {
    activity: {
      transactionCount:
        indexed
          ?.transactions
          .length ??
        0,

      receiptCount:
        indexed
          ?.receipts
          .length ??
        0,

      actionCount:
        actions.length,

      functionCallCount:
        actions.filter(
          action =>
            action.type ===
              "FunctionCall"
        ).length,

      transferActionCount:
        actions.filter(
          action =>
            action.type ===
              "Transfer"
        ).length,
    },

    flow: {
      incomingTransferCount:
        transfers.filter(
          transfer =>
            transfer.direction ===
              "incoming"
        ).length,

      outgoingTransferCount:
        transfers.filter(
          transfer =>
            transfer.direction ===
              "outgoing"
        ).length,

      incomingYoctoNear:
        incoming.toString(),

      outgoingYoctoNear:
        outgoing.toString(),

      transfers,
    },

    counterparties: {
      count:
        counterparties.length,

      items:
        counterparties,
    },

    specialist: {
      accessKeyCount:
        rpc.accessKeys
          .length,

      functionCallMethods:
        [...methods]
          .sort(),

      receiptActionCount:
        indexed
          ?.receipts
          .reduce(
            (
              total,
              receipt
            ) =>
              total +
              receipt
                .actions
                .length,
            0
          ) ??
        0,
    },

    observedFunding:
      inbound
        ? {
            sourceAccountId:
              inbound
                .counterparty,

            transactionHash:
              inbound
                .transactionHash,

            amountYoctoNear:
              inbound
                .amountYoctoNear,

            timestamp:
              inbound
                .timestamp,
          }
        : null,
  };
}
