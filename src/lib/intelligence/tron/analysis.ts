import {
  tronAddressToHex,
} from "./address";

import type {
  TronTransactionEvidence,
} from "./types";

export type TronObservedFunding = {
  sourceAddressHex:
    string;

  transactionHash:
    string;

  timestamp:
    string | null;

  amountSun:
    string;
};

export type TronCounterparty = {
  addressHex:
    string;

  incomingCount:
    number;

  outgoingCount:
    number;

  contractInteractionCount:
    number;

  observationCount:
    number;
};

export type TronContractTypeSummary = {
  type:
    string;

  count:
    number;
};

export type TronDerivedAnalysis = {
  flow: {
    incomingTransactionCount:
      number;

    outgoingTransactionCount:
      number;

    selfTransactionCount:
      number;

    contractInteractionCount:
      number;

    observedTransactionCount:
      number;

    incomingSun:
      string;

    outgoingSun:
      string;
  };

  counterparties: {
    count:
      number;

    items:
      readonly TronCounterparty[];
  };

  observedFunding:
    TronObservedFunding | null;

  contractTypes:
    readonly TronContractTypeSummary[];

  resources: {
    feeSun:
      string;

    energyFeeSun:
      string;

    netFeeSun:
      string;

    energyUsageTotal:
      number;

    netUsage:
      number;

    successfulCanonicalCount:
      number;

    unsuccessfulCanonicalCount:
      number;
  };

  canonicalCoverage: {
    requested:
      number;

    verified:
      number;

    unavailable:
      number;
  };
};

function normalizedHex(
  value:
    string | null
) {
  return value
    ?.trim()
    .toLowerCase() ??
    null;
}

function addExact(
  current:
    bigint,
  value:
    string | null
) {
  if (!value) {
    return current;
  }

  try {
    return (
      current +
      BigInt(value)
    );
  } catch {
    return current;
  }
}

function addSafeNumber(
  current:
    number,
  value:
    number | null
) {
  if (
    value === null
  ) {
    return current;
  }

  const next =
    current +
    value;

  return Number.isSafeInteger(
    next
  )
    ? next
    : current;
}

function isSuccess(
  transaction:
    TronTransactionEvidence
) {
  return (
    transaction.executionResult
      ?.trim()
      .toUpperCase() ===
    "SUCCESS"
  );
}

export function buildTronDerivedAnalysis({
  address,
  canonicalTransactions,
  requestedCanonicalCount,
}: {
  address:
    string;

  canonicalTransactions:
    readonly TronTransactionEvidence[];

  requestedCanonicalCount:
    number;
}): TronDerivedAnalysis {
  const targetHex =
    tronAddressToHex(
      address
    );

  if (!targetHex) {
    throw new Error(
      "Invalid TRON analysis address."
    );
  }

  let incomingTransactionCount =
    0;

  let outgoingTransactionCount =
    0;

  let selfTransactionCount =
    0;

  let contractInteractionCount =
    0;

  let observedTransactionCount =
    0;

  let incomingSun =
    0n;

  let outgoingSun =
    0n;

  let feeSun =
    0n;

  let energyFeeSun =
    0n;

  let netFeeSun =
    0n;

  let energyUsageTotal =
    0;

  let netUsage =
    0;

  let successfulCanonicalCount =
    0;

  let unsuccessfulCanonicalCount =
    0;

  let observedFunding:
    TronObservedFunding |
    null =
      null;

  const counterparties =
    new Map<
      string,
      {
        addressHex:
          string;

        incomingCount:
          number;

        outgoingCount:
          number;

        contractInteractionCount:
          number;
      }
    >();

  const contractTypes =
    new Map<
      string,
      number
    >();

  const observeCounterparty =
    ({
      addressHex,
      direction,
      contractInteraction,
    }: {
      addressHex:
        string | null;

      direction:
        "incoming" |
        "outgoing";

      contractInteraction:
        boolean;
    }) => {
      const normalized =
        normalizedHex(
          addressHex
        );

      if (
        !normalized ||
        normalized ===
          targetHex
      ) {
        return;
      }

      const current =
        counterparties.get(
          normalized
        ) ?? {
          addressHex:
            normalized,

          incomingCount:
            0,

          outgoingCount:
            0,

          contractInteractionCount:
            0,
        };

      if (
        direction ===
          "incoming"
      ) {
        current.incomingCount +=
          1;
      } else {
        current.outgoingCount +=
          1;
      }

      if (
        contractInteraction
      ) {
        current.contractInteractionCount +=
          1;
      }

      counterparties.set(
        normalized,
        current
      );
    };

  for (
    const transaction of
    canonicalTransactions
  ) {
    feeSun =
      addExact(
        feeSun,
        transaction.feeSun
      );

    energyFeeSun =
      addExact(
        energyFeeSun,
        transaction.energyFeeSun
      );

    netFeeSun =
      addExact(
        netFeeSun,
        transaction.netFeeSun
      );

    energyUsageTotal =
      addSafeNumber(
        energyUsageTotal,
        transaction.energyUsageTotal
      );

    netUsage =
      addSafeNumber(
        netUsage,
        transaction.netUsage
      );

    if (
      isSuccess(
        transaction
      )
    ) {
      successfulCanonicalCount +=
        1;
    } else {
      unsuccessfulCanonicalCount +=
        1;
    }

    const contract =
      transaction.contract;

    if (!contract) {
      observedTransactionCount +=
        1;

      continue;
    }

    const contractType =
      contract.type?.trim() ||
      "UnknownContract";

    contractTypes.set(
      contractType,
      (
        contractTypes.get(
          contractType
        ) ??
        0
      ) +
        1
    );

    const owner =
      normalizedHex(
        contract.ownerAddressHex
      );

    const explicitTo =
      normalizedHex(
        contract.toAddressHex
      );

    const contractAddress =
      normalizedHex(
        contract.contractAddressHex
      );

    const destination =
      explicitTo ??
      contractAddress;

    const isContractInteraction =
      contractAddress !==
        null ||
      (
        contractType !==
          "TransferContract"
      );

    if (
      isContractInteraction
    ) {
      contractInteractionCount +=
        1;
    }

    /*
     * Failed/reverted execution is still canonical
     * transaction evidence, but it is not counted as
     * executed native TRX flow.
     */
    if (
      !isSuccess(
        transaction
      )
    ) {
      observedTransactionCount +=
        1;

      continue;
    }

    let nativeAmount:
      string | null =
        null;

    if (
      contractType ===
        "TransferContract"
    ) {
      nativeAmount =
        contract.amountSun;
    } else if (
      contractType ===
        "TriggerSmartContract"
    ) {
      nativeAmount =
        contract.callValueSun;
    }

    const targetIsOwner =
      owner ===
      targetHex;

    const targetIsDestination =
      destination ===
      targetHex;

    if (
      targetIsOwner &&
      targetIsDestination
    ) {
      selfTransactionCount +=
        1;

      continue;
    }

    if (
      targetIsOwner &&
      destination
    ) {
      outgoingTransactionCount +=
        1;

      outgoingSun =
        addExact(
          outgoingSun,
          nativeAmount
        );

      observeCounterparty({
        addressHex:
          destination,

        direction:
          "outgoing",

        contractInteraction:
          isContractInteraction,
      });

      continue;
    }

    if (
      targetIsDestination &&
      owner
    ) {
      incomingTransactionCount +=
        1;

      incomingSun =
        addExact(
          incomingSun,
          nativeAmount
        );

      observeCounterparty({
        addressHex:
          owner,

        direction:
          "incoming",

        contractInteraction:
          isContractInteraction,
      });

      if (
        !observedFunding &&
        nativeAmount &&
        nativeAmount !==
          "0"
      ) {
        observedFunding = {
          sourceAddressHex:
            owner,

          transactionHash:
            transaction.transactionHash,

          timestamp:
            transaction.timestamp,

          amountSun:
            nativeAmount,
        };
      }

      continue;
    }

    observedTransactionCount +=
      1;
  }

  const counterpartyItems =
    [
      ...counterparties.values(),
    ]
      .map(
        item => ({
          ...item,

          observationCount:
            item.incomingCount +
            item.outgoingCount,
        })
      )
      .sort(
        (
          left,
          right
        ) =>
          right.observationCount -
          left.observationCount
      );

  const contractTypeItems =
    [
      ...contractTypes.entries(),
    ]
      .map(
        ([
          type,
          count,
        ]) => ({
          type,
          count,
        })
      )
      .sort(
        (
          left,
          right
        ) =>
          right.count -
          left.count ||
          left.type.localeCompare(
            right.type
          )
      );

  return {
    flow: {
      incomingTransactionCount,

      outgoingTransactionCount,

      selfTransactionCount,

      contractInteractionCount,

      observedTransactionCount,

      incomingSun:
        incomingSun.toString(),

      outgoingSun:
        outgoingSun.toString(),
    },

    counterparties: {
      count:
        counterpartyItems.length,

      items:
        counterpartyItems,
    },

    observedFunding,

    contractTypes:
      contractTypeItems,

    resources: {
      feeSun:
        feeSun.toString(),

      energyFeeSun:
        energyFeeSun.toString(),

      netFeeSun:
        netFeeSun.toString(),

      energyUsageTotal,

      netUsage,

      successfulCanonicalCount,

      unsuccessfulCanonicalCount,
    },

    canonicalCoverage: {
      requested:
        requestedCanonicalCount,

      verified:
        canonicalTransactions.length,

      unavailable:
        Math.max(
          0,
          requestedCanonicalCount -
          canonicalTransactions.length
        ),
    },
  };
}