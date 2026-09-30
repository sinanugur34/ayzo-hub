import {
  normalizeAptosAddress,
} from "./address";

import type {
  AptosEvidence,
  AptosObservedTransaction,
} from "./types";

export type AptosTransferEvidence = {
  transactionHash:
    string;

  direction:
    "incoming" |
    "outgoing";

  counterparty:
    string;

  amount:
    string | null;

  asset:
    string;

  timestamp:
    string | null;
};

export type AptosDerivedAnalysis = {
  activity: {
    observedTransactionCount:
      number;

    successfulTransactionCount:
      number;

    failedTransactionCount:
      number;
  };

  move: {
    resourceCount:
      number;

    observedModuleCount:
      number;

    observedFunctionCount:
      number;
  };

  flow: {
    incomingTransferCount:
      number;

    outgoingTransferCount:
      number;

    incomingOctas:
      string;

    outgoingOctas:
      string;

    transfers:
      readonly AptosTransferEvidence[];
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

        transactionHashes:
          readonly string[];
      }[];
  };

  assets: {
    fungibleAssetCount:
      number;

    ownedObjectCount:
      number;
  };

  observedFunding:
    | {
        sourceAddress:
          string;

        transactionHash:
          string;

        amountOctas:
          string | null;

        timestamp:
          string | null;
      }
    | null;
};

function stringData(
  value:
    unknown
) {
  return typeof value ===
    "string"
    ? value
    : null;
}

function amountFromEvents(
  transaction:
    AptosObservedTransaction,
  root:
    string,
  direction:
    "incoming" |
    "outgoing"
) {
  let total =
    0n;

  let found =
    false;

  for (
    const event of
    transaction.events
  ) {
    const type =
      event.type ??
      "";

    const account =
      event.accountAddress
        ? normalizeAptosAddress(
            event.accountAddress
          )
        : null;

    if (
      account !== root
    ) {
      continue;
    }

    const relevant =
      direction ===
        "incoming"
        ? (
            type.includes(
              "DepositEvent"
            ) ||
            type.includes(
              "Deposit"
            )
          )
        : (
            type.includes(
              "WithdrawEvent"
            ) ||
            type.includes(
              "Withdraw"
            )
          );

    if (!relevant) {
      continue;
    }

    const amount =
      stringData(
        event.data
          ?.amount
      );

    if (!amount) {
      continue;
    }

    try {
      total +=
        BigInt(
          amount
        );

      found =
        true;
    } catch {
      // Ignore malformed numeric evidence.
    }
  }

  return found
    ? total
    : null;
}

function explicitRecipient(
  transaction:
    AptosObservedTransaction
) {
  const fn =
    transaction.functionName
      ?.toLowerCase();

  if (
    fn !== "transfer" &&
    fn !== "transfer_coins" &&
    fn !== "transfer_fungible_asset"
  ) {
    return null;
  }

  const first =
    transaction
      .payloadArguments[0];

  if (
    typeof first !==
      "string"
  ) {
    return null;
  }

  return normalizeAptosAddress(
    first
  );
}

export function buildAptosDerivedAnalysis({
  address,
  evidence,
}: {
  address:
    string;

  evidence:
    AptosEvidence;
}): AptosDerivedAnalysis {
  const root =
    normalizeAptosAddress(
      address
    );

  if (!root) {
    throw new Error(
      "Aptos analysis received invalid root address."
    );
  }

  const relationships =
    new Map<
      string,
      {
        address:
          string;

        incoming:
          number;

        outgoing:
          number;

        hashes:
          Set<string>;
      }
    >();

  const modules =
    new Set<string>();

  const functions =
    new Set<string>();

  const transfers:
    AptosTransferEvidence[] =
      [];

  let successful =
    0;

  let failed =
    0;

  let incomingOctas =
    0n;

  let outgoingOctas =
    0n;

  let observedFunding:
    AptosDerivedAnalysis[
      "observedFunding"
    ] =
      null;

  function observe(
    counterparty:
      string,
    direction:
      "incoming" |
      "outgoing",
    transactionHash:
      string
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
        address:
          counterparty,

        incoming:
          0,

        outgoing:
          0,

        hashes:
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

    current.hashes.add(
      transactionHash
    );

    relationships.set(
      counterparty,
      current
    );
  }

  for (
    const transaction of
    evidence.transactions
  ) {
    if (
      transaction.success ===
        true
    ) {
      successful +=
        1;
    } else if (
      transaction.success ===
        false
    ) {
      failed +=
        1;
    }

    if (
      transaction.moduleAddress &&
      transaction.moduleName
    ) {
      modules.add(
        `${transaction.moduleAddress}::${transaction.moduleName}`
      );
    }

    if (
      transaction.moduleAddress &&
      transaction.moduleName &&
      transaction.functionName
    ) {
      functions.add(
        `${transaction.moduleAddress}::${transaction.moduleName}::${transaction.functionName}`
      );
    }

    const sender =
      transaction.sender
        ? normalizeAptosAddress(
            transaction.sender
          )
        : null;

    const recipient =
      explicitRecipient(
        transaction
      );

    /*
     * Explicit outgoing transfer:
     * subject is tx sender and payload provides recipient.
     */
    if (
      sender === root &&
      recipient &&
      recipient !== root
    ) {
      const amount =
        amountFromEvents(
          transaction,
          root,
          "outgoing"
        );

      if (amount !== null) {
        outgoingOctas +=
          amount;
      }

      transfers.push({
        transactionHash:
          transaction
            .transactionHash,

        direction:
          "outgoing",

        counterparty:
          recipient,

        amount:
          amount
            ?.toString() ??
          null,

        asset:
          "APT/FA",

        timestamp:
          transaction.timestamp,
      });

      observe(
        recipient,
        "outgoing",
        transaction
          .transactionHash
      );

      continue;
    }

    /*
     * Explicit incoming case:
     * transaction sender is another account and a deposit
     * event is explicitly scoped to the analyzed address.
     */
    if (
      sender &&
      sender !== root
    ) {
      const amount =
        amountFromEvents(
          transaction,
          root,
          "incoming"
        );

      if (amount !== null) {
        incomingOctas +=
          amount;

        transfers.push({
          transactionHash:
            transaction
              .transactionHash,

          direction:
            "incoming",

          counterparty:
            sender,

          amount:
            amount.toString(),

          asset:
            "APT/FA",

          timestamp:
            transaction.timestamp,
        });

        observe(
          sender,
          "incoming",
          transaction
            .transactionHash
        );

        if (!observedFunding) {
          observedFunding = {
            sourceAddress:
              sender,

            transactionHash:
              transaction
                .transactionHash,

            amountOctas:
              amount.toString(),

            timestamp:
              transaction.timestamp,
          };
        }
      }
    }
  }

  const counterparties =
    [...relationships.values()]
      .map(item => ({
        address:
          item.address,

        observationCount:
          item.incoming +
          item.outgoing,

        incomingCount:
          item.incoming,

        outgoingCount:
          item.outgoing,

        transactionHashes:
          [...item.hashes],
      }))
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

  return {
    activity: {
      observedTransactionCount:
        evidence
          .transactions
          .length,

      successfulTransactionCount:
        successful,

      failedTransactionCount:
        failed,
    },

    move: {
      resourceCount:
        evidence
          .resources
          .length,

      observedModuleCount:
        modules.size,

      observedFunctionCount:
        functions.size,
    },

    flow: {
      incomingTransferCount:
        transfers.filter(
          item =>
            item.direction ===
            "incoming"
        ).length,

      outgoingTransferCount:
        transfers.filter(
          item =>
            item.direction ===
            "outgoing"
        ).length,

      incomingOctas:
        incomingOctas
          .toString(),

      outgoingOctas:
        outgoingOctas
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
      fungibleAssetCount:
        evidence
          .fungibleAssets
          .length,

      ownedObjectCount:
        evidence
          .objects
          .length,
    },

    observedFunding,
  };
}
