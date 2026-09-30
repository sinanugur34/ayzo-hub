import {
  normalizeSuiAddress,
} from "./address";

import {
  SUI_NATIVE_COIN_TYPE,
} from "./provider";

import type {
  SuiAccountEvidence,
  SuiObservedTransaction,
} from "./types";

type Counterparty = {
  address:
    string;

  interactionCount:
    number;

  incomingCount:
    number;

  outgoingCount:
    number;

  evidenceTransactionHashes:
    readonly string[];
};

export type SuiDerivedAnalysis = {
  flow: {
    incomingTransactionCount:
      number;

    outgoingTransactionCount:
      number;

    observedTransactionCount:
      number;

    incomingMist:
      string;

    outgoingMist:
      string;
  };

  counterparties: {
    count:
      number;

    items:
      readonly Counterparty[];
  };

  objectActivity: {
    created:
      number;

    deleted:
      number;

    touched:
      number;
  };

  assets: {
    observedCoinTypeCount:
      number;

    positiveBalanceCount:
      number;
  };

  observedFunding:
    | {
        observedSender:
          string;

        transactionHash:
          string;

        timestamp:
          string | null;

        amountMist:
          string;
      }
    | null;
};

function normalized(
  value:
    string | null
) {
  if (!value) {
    return null;
  }

  return (
    normalizeSuiAddress(
      value
    ) ??
    value.toLowerCase()
  );
}

function rootSuiChange(
  transaction:
    SuiObservedTransaction,
  address:
    string
) {
  const root =
    normalized(
      address
    );

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
      normalized(
        change.owner
      ) !== root ||
      change.coinType !==
        SUI_NATIVE_COIN_TYPE ||
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
      // Ignore malformed provider numeric evidence.
    }
  }

  return found
    ? total
    : null;
}

export function buildSuiDerivedAnalysis({
  address,
  evidence,
}: {
  address:
    string;

  evidence:
    SuiAccountEvidence;
}): SuiDerivedAnalysis {
  const root =
    normalizeSuiAddress(
      address
    ) ??
    address.toLowerCase();

  let incomingCount =
    0;

  let outgoingCount =
    0;

  let incomingMist =
    0n;

  let outgoingMist =
    0n;

  let created =
    0;

  let deleted =
    0;

  let touched =
    0;

  const counterparties =
    new Map<
      string,
      {
        address:
          string;

        interactionCount:
          number;

        incomingCount:
          number;

        outgoingCount:
          number;

        hashes:
          Set<string>;
      }
    >();

  function observe(
    counterparty:
      string | null,
    direction:
      "incoming" |
      "outgoing" |
      "observed",
    transactionHash:
      string
  ) {
    if (!counterparty) {
      return;
    }

    const key =
      normalized(
        counterparty
      );

    if (
      !key ||
      key === root
    ) {
      return;
    }

    const current =
      counterparties.get(
        key
      ) ?? {
        address:
          counterparty,

        interactionCount:
          0,

        incomingCount:
          0,

        outgoingCount:
          0,

        hashes:
          new Set<string>(),
      };

    current.interactionCount +=
      1;

    if (
      direction ===
      "incoming"
    ) {
      current.incomingCount +=
        1;
    }

    if (
      direction ===
      "outgoing"
    ) {
      current.outgoingCount +=
        1;
    }

    current.hashes.add(
      transactionHash
    );

    counterparties.set(
      key,
      current
    );
  }

  for (
    const transaction of
    evidence.transactions
  ) {
    const rootChange =
      rootSuiChange(
        transaction,
        root
      );

    let direction:
      "incoming" |
      "outgoing" |
      "observed" =
        "observed";

    if (
      rootChange !==
        null &&
      rootChange >
        0n
    ) {
      direction =
        "incoming";

      incomingCount +=
        1;

      incomingMist +=
        rootChange;
    } else if (
      rootChange !==
        null &&
      rootChange <
        0n
    ) {
      direction =
        "outgoing";

      outgoingCount +=
        1;

      outgoingMist +=
        -rootChange;
    }

    observe(
      transaction.sender,
      direction,
      transaction
        .transactionHash
    );

    for (
      const change of
      transaction
        .balanceChanges
    ) {
      observe(
        change.owner,
        direction,
        transaction
          .transactionHash
      );
    }

    for (
      const change of
      transaction
        .objectChanges
    ) {
      touched +=
        1;

      if (
        change.idCreated
      ) {
        created +=
          1;
      }

      if (
        change.idDeleted
      ) {
        deleted +=
          1;
      }
    }
  }

  let observedFunding:
    SuiDerivedAnalysis[
      "observedFunding"
    ] =
      null;

  for (
    const transaction of
    evidence
      .earliestTransactions
  ) {
    const change =
      rootSuiChange(
        transaction,
        root
      );

    const sender =
      normalized(
        transaction.sender
      );

    if (
      change !==
        null &&
      change >
        0n &&
      sender &&
      sender !==
        root
    ) {
      observedFunding = {
        observedSender:
          transaction.sender as string,

        transactionHash:
          transaction
            .transactionHash,

        timestamp:
          transaction
            .timestamp,

        amountMist:
          change.toString(),
      };

      break;
    }
  }

  return {
    flow: {
      incomingTransactionCount:
        incomingCount,

      outgoingTransactionCount:
        outgoingCount,

      observedTransactionCount:
        evidence
          .transactions
          .length,

      incomingMist:
        incomingMist
          .toString(),

      outgoingMist:
        outgoingMist
          .toString(),
    },

    counterparties: {
      count:
        counterparties.size,

      items:
        [
          ...counterparties
            .values(),
        ]
          .sort(
            (
              left,
              right
            ) =>
              right
                .interactionCount -
              left
                .interactionCount
          )
          .map(
            item => ({
              address:
                item.address,

              interactionCount:
                item
                  .interactionCount,

              incomingCount:
                item
                  .incomingCount,

              outgoingCount:
                item
                  .outgoingCount,

              evidenceTransactionHashes:
                [
                  ...item.hashes,
                ],
            })
          ),
    },

    objectActivity: {
      created,
      deleted,
      touched,
    },

    assets: {
      observedCoinTypeCount:
        evidence
          .balances
          .length,

      positiveBalanceCount:
        evidence
          .balances
          .filter(
            balance => {
              try {
                return (
                  BigInt(
                    balance
                      .totalBalance
                  ) >
                  0n
                );
              } catch {
                return false;
              }
            }
          )
          .length,
    },

    observedFunding,
  };
}
