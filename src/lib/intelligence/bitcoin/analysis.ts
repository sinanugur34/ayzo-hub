import type {
  BitcoinTransactionEvidence,
} from "./types";

export type BitcoinObservedFunding = {
  sourceAddress:
    string;

  transactionHash:
    string;

  amountSats:
    string | null;
};

export type BitcoinCounterparty = {
  address:
    string;

  incomingCount:
    number;

  outgoingCount:
    number;

  observationCount:
    number;
};

export type BitcoinDerivedAnalysis = {
  flow: {
    incomingTransactionCount:
      number;

    outgoingTransactionCount:
      number;

    selfTransactionCount:
      number;

    unresolvedTransactionCount:
      number;

    observedTransactionCount:
      number;

    incomingSats:
      string;

    outgoingNonTargetSats:
      string;
  };

  counterparties: {
    count:
      number;

    items:
      readonly BitcoinCounterparty[];
  };

  observedFunding:
    BitcoinObservedFunding | null;

  canonicalCoverage: {
    requested:
      number;

    verified:
      number;

    unavailable:
      number;

    prevoutEligible:
      number;

    prevoutResolved:
      number;

    prevoutUnavailable:
      number;

    prevoutOmitted:
      number;
  };
};

function sameAddress(
  left:
    string,
  right:
    string
) {
  return (
    left.trim() ===
    right.trim()
  );
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

export function buildBitcoinDerivedAnalysis({
  address,
  canonicalTransactions,
  requestedCanonicalCount,
}: {
  address:
    string;

  canonicalTransactions:
    readonly BitcoinTransactionEvidence[];

  requestedCanonicalCount:
    number;
}): BitcoinDerivedAnalysis {
  let incomingTransactionCount =
    0;

  let outgoingTransactionCount =
    0;

  let selfTransactionCount =
    0;

  let unresolvedTransactionCount =
    0;

  let incomingSats =
    0n;

  let outgoingNonTargetSats =
    0n;

  let prevoutEligible =
    0;

  let prevoutResolved =
    0;

  let prevoutUnavailable =
    0;

  let prevoutOmitted =
    0;

  const counterparties =
    new Map<
      string,
      {
        address:
          string;

        incomingCount:
          number;

        outgoingCount:
          number;
      }
    >();

  let observedFunding:
    BitcoinObservedFunding |
    null =
      null;

  for (
    const transaction of
    canonicalTransactions
  ) {
    prevoutEligible +=
      transaction
        .prevoutCoverage
        .eligible;

    prevoutResolved +=
      transaction
        .prevoutCoverage
        .resolved;

    prevoutUnavailable +=
      transaction
        .prevoutCoverage
        .unavailable;

    prevoutOmitted +=
      transaction
        .prevoutCoverage
        .omitted;

    const inputAddresses =
      unique(
        transaction.inputs.flatMap(
          input =>
            input.prevout
              ?.addresses ??
            []
        )
      );

    const outputAddresses =
      unique(
        transaction.outputs.flatMap(
          output =>
            output.addresses ??
            []
        )
      );

    const targetInInputs =
      inputAddresses.some(
        candidate =>
          sameAddress(
            candidate,
            address
          )
      );

    const targetInOutputs =
      outputAddresses.some(
        candidate =>
          sameAddress(
            candidate,
            address
          )
      );

    const externalOutputs =
      transaction.outputs.filter(
        output =>
          (
            output.addresses ??
            []
          ).some(
            candidate =>
              !sameAddress(
                candidate,
                address
              )
          )
      );

    const onlyTargetOutputs =
      transaction.outputs.length >
        0 &&
      transaction.outputs.every(
        output =>
          (
            output.addresses ??
            []
          ).length >
            0 &&
          (
            output.addresses ??
            []
          ).every(
            candidate =>
              sameAddress(
                candidate,
                address
              )
          )
      );

    if (
      targetInInputs &&
      onlyTargetOutputs
    ) {
      selfTransactionCount +=
        1;

      continue;
    }

    if (
      targetInInputs &&
      externalOutputs.length >
        0
    ) {
      outgoingTransactionCount +=
        1;

      for (
        const output of
        externalOutputs
      ) {
        outgoingNonTargetSats =
          addExact(
            outgoingNonTargetSats,
            output.valueSats
          );
      }

      for (
        const candidate of
        outputAddresses
      ) {
        if (
          sameAddress(
            candidate,
            address
          )
        ) {
          continue;
        }

        const current =
          counterparties.get(
            candidate
          ) ?? {
            address:
              candidate,

            incomingCount:
              0,

            outgoingCount:
              0,
          };

        current.outgoingCount +=
          1;

        counterparties.set(
          candidate,
          current
        );
      }

      continue;
    }

    if (
      !targetInInputs &&
      targetInOutputs
    ) {
      incomingTransactionCount +=
        1;

      let received =
        0n;

      for (
        const output of
        transaction.outputs
      ) {
        if (
          (
            output.addresses ??
            []
          ).some(
            candidate =>
              sameAddress(
                candidate,
                address
              )
          )
        ) {
          received =
            addExact(
              received,
              output.valueSats
            );
        }
      }

      incomingSats +=
        received;

      const sources =
        inputAddresses.filter(
          candidate =>
            !sameAddress(
              candidate,
              address
            )
        );

      for (
        const source of sources
      ) {
        const current =
          counterparties.get(
            source
          ) ?? {
            address:
              source,

            incomingCount:
              0,

            outgoingCount:
              0,
          };

        current.incomingCount +=
          1;

        counterparties.set(
          source,
          current
        );
      }

      if (
        !observedFunding &&
        sources.length >
          0
      ) {
        observedFunding = {
          sourceAddress:
            sources[0]!,

          transactionHash:
            transaction
              .transactionHash,

          amountSats:
            received >
              0n
              ? received.toString()
              : null,
        };
      }

      continue;
    }

    unresolvedTransactionCount +=
      1;
  }

  const items =
    [
      ...counterparties
        .values(),
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
          right
            .observationCount -
          left
            .observationCount
      );

  return {
    flow: {
      incomingTransactionCount,
      outgoingTransactionCount,
      selfTransactionCount,
      unresolvedTransactionCount,

      observedTransactionCount:
        canonicalTransactions.length,

      incomingSats:
        incomingSats.toString(),

      outgoingNonTargetSats:
        outgoingNonTargetSats
          .toString(),
    },

    counterparties: {
      count:
        items.length,

      items,
    },

    observedFunding,

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

      prevoutEligible,
      prevoutResolved,
      prevoutUnavailable,
      prevoutOmitted,
    },
  };
}
