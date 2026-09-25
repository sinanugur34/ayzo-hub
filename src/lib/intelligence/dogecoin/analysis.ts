import type {
  DogecoinTransactionEvidence,
} from "./types";

export type DogecoinObservedFunding = {
  sourceAddress:
    string;

  transactionHash:
    string;

  timestamp:
    string | null;

  amountKoinu:
    string | null;
};

export type DogecoinCounterparty = {
  address:
    string;

  incomingCount:
    number;

  outgoingCount:
    number;

  observationCount:
    number;
};

export type DogecoinDerivedAnalysis = {
  flow: {
    incomingTransactionCount:
      number;

    outgoingTransactionCount:
      number;

    selfTransactionCount:
      number;

    observedTransactionCount:
      number;

    incomingKoinu:
      string;

    outgoingNonTargetKoinu:
      string;
  };

  counterparties: {
    count:
      number;

    items:
      readonly DogecoinCounterparty[];
  };

  observedFunding:
    DogecoinObservedFunding | null;

  canonicalCoverage: {
    requested:
      number;

    verified:
      number;

    unavailable:
      number;
  };
};

function normalize(
  value:
    string
) {
  return value.trim();
}

function sameAddress(
  left:
    string,
  right:
    string
) {
  /*
   * Base58 addresses are case-sensitive.
   * Do not lowercase Dogecoin addresses.
   */
  return normalize(left) ===
    normalize(right);
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

function uniqueAddresses(
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

export function buildDogecoinDerivedAnalysis({
  address,
  canonicalTransactions,
  requestedCanonicalCount,
}: {
  address:
    string;

  canonicalTransactions:
    readonly DogecoinTransactionEvidence[];

  requestedCanonicalCount:
    number;
}): DogecoinDerivedAnalysis {
  let incomingTransactionCount =
    0;

  let outgoingTransactionCount =
    0;

  let selfTransactionCount =
    0;

  let observedTransactionCount =
    0;

  let incomingKoinu =
    0n;

  let outgoingNonTargetKoinu =
    0n;

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
    DogecoinObservedFunding |
    null =
      null;

  for (
    const transaction of
    canonicalTransactions
  ) {
    const inputAddresses =
      uniqueAddresses(
        transaction.inputs.flatMap(
          input =>
            input.addresses
        )
      );

    const outputAddresses =
      uniqueAddresses(
        transaction.outputs.flatMap(
          output =>
            output.addresses
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

    const nonTargetOutputs =
      transaction.outputs.filter(
        output =>
          output.addresses.some(
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
          output.addresses.length >
            0 &&
          output.addresses.every(
            candidate =>
              sameAddress(
                candidate,
                address
              )
          )
      );

    /*
     * UTXO direction:
     *
     * - Input owned by target + external output:
     *   observed outgoing transaction.
     * - Target only in outputs:
     *   observed incoming transaction.
     * - Target input and every known output back
     *   to target:
     *   self-directed.
     * - Otherwise:
     *   observed but direction unresolved.
     *
     * We do not infer change ownership.
     */
    if (
      targetInInputs &&
      nonTargetOutputs.length >
        0
    ) {
      outgoingTransactionCount +=
        1;

      for (
        const output of
        nonTargetOutputs
      ) {
        outgoingNonTargetKoinu =
          addExact(
            outgoingNonTargetKoinu,
            output.valueKoinu
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

      for (
        const output of
        transaction.outputs
      ) {
        if (
          output.addresses.some(
            candidate =>
              sameAddress(
                candidate,
                address
              )
          )
        ) {
          incomingKoinu =
            addExact(
              incomingKoinu,
              output.valueKoinu
            );
        }
      }

      const sources =
        inputAddresses.filter(
          candidate =>
            !sameAddress(
              candidate,
              address
            )
        );

      for (
        const candidate of
        sources
      ) {
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

        current.incomingCount +=
          1;

        counterparties.set(
          candidate,
          current
        );
      }

      /*
       * Funding is reported only when an actual
       * source address was exposed by canonical
       * input evidence. No source inference.
       */
      if (
        !observedFunding &&
        sources.length >
          0
      ) {
        const amount =
          transaction.outputs
            .filter(
              output =>
                output.addresses.some(
                  candidate =>
                    sameAddress(
                      candidate,
                      address
                    )
                )
            )
            .reduce(
              (
                total,
                output
              ) =>
                addExact(
                  total,
                  output.valueKoinu
                ),
              0n
            );

        observedFunding = {
          sourceAddress:
            sources[0],

          transactionHash:
            transaction.transactionHash,

          timestamp:
            transaction.timestamp,

          amountKoinu:
            amount.toString(),
        };
      }

      continue;
    }

    if (
      targetInInputs &&
      targetInOutputs &&
      onlyTargetOutputs
    ) {
      selfTransactionCount +=
        1;

      continue;
    }

    observedTransactionCount +=
      1;
  }

  const items =
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

  return {
    flow: {
      incomingTransactionCount,

      outgoingTransactionCount,

      selfTransactionCount,

      observedTransactionCount,

      incomingKoinu:
        incomingKoinu.toString(),

      outgoingNonTargetKoinu:
        outgoingNonTargetKoinu.toString(),
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
    },
  };
}