import type {
  CardanoCanonicalTransaction,
  CardanoEvidence,
} from "./types";

export type CardanoCounterparty = {
  address:
    string;

  incomingCount:
    number;

  outgoingCount:
    number;

  observationCount:
    number;

  transactionHashes:
    readonly string[];
};

export type CardanoDerivedAnalysis = {
  flow: {
    incomingTransactionCount:
      number;

    outgoingTransactionCount:
      number;

    selfTransactionCount:
      number;

    unresolvedTransactionCount:
      number;

    incomingLovelace:
      string;

    outgoingLovelace:
      string;
  };

  counterparties: {
    count:
      number;

    items:
      readonly CardanoCounterparty[];
  };

  observedFunding:
    | {
        sourceAddress:
          string;

        transactionHash:
          string;

        amountLovelace:
          string | null;

        timestamp:
          string | null;
      }
    | null;

  assets: {
    currentNativeAssetCount:
      number;

    observedPolicyCount:
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

function addAmount(
  amounts:
    readonly {
      unit:
        string;

      quantity:
        string;
    }[],
  unit:
    string
) {
  let total =
    0n;

  for (const item of amounts) {
    if (
      item.unit !==
        unit
    ) {
      continue;
    }

    try {
      total +=
        BigInt(
          item.quantity
        );
    } catch {
      // Malformed numeric provider evidence is ignored.
    }
  }

  return total;
}

function same(
  left:
    string | null,
  right:
    string
) {
  return (
    left?.trim() ===
    right.trim()
  );
}

export function buildCardanoDerivedAnalysis({
  address,
  evidence,
}: {
  address:
    string;

  evidence:
    CardanoEvidence;
}): CardanoDerivedAnalysis {
  let incomingCount =
    0;

  let outgoingCount =
    0;

  let selfCount =
    0;

  let unresolvedCount =
    0;

  let incoming =
    0n;

  let outgoing =
    0n;

  const relationships =
    new Map<
      string,
      {
        address:
          string;

        incomingCount:
          number;

        outgoingCount:
          number;

        hashes:
          Set<string>;
      }
    >();

  let observedFunding:
    CardanoDerivedAnalysis[
      "observedFunding"
    ] =
      null;

  const observe =
    (
      candidate:
        string | null,
      direction:
        "incoming" |
        "outgoing",
      transactionHash:
        string
    ) => {
      if (
        !candidate ||
        same(
          candidate,
          address
        )
      ) {
        return;
      }

      const current =
        relationships.get(
          candidate
        ) ?? {
          address:
            candidate,

          incomingCount:
            0,

          outgoingCount:
            0,

          hashes:
            new Set<string>(),
        };

      if (
        direction ===
        "incoming"
      ) {
        current
          .incomingCount +=
          1;
      } else {
        current
          .outgoingCount +=
          1;
      }

      current.hashes.add(
        transactionHash
      );

      relationships.set(
        candidate,
        current
      );
    };

  const inspect =
    (
      tx:
        CardanoCanonicalTransaction
    ) => {
      const rootInInputs =
        tx.inputs.some(
          input =>
            same(
              input.address,
              address
            )
        );

      const rootOutputs =
        tx.outputs.filter(
          output =>
            same(
              output.address,
              address
            )
        );

      const externalInputs =
        tx.inputs.filter(
          input =>
            input.address &&
            !same(
              input.address,
              address
            )
        );

      const externalOutputs =
        tx.outputs.filter(
          output =>
            output.address &&
            !same(
              output.address,
              address
            )
        );

      if (
        rootInInputs &&
        externalOutputs.length >
          0
      ) {
        outgoingCount +=
          1;

        for (
          const output of
          externalOutputs
        ) {
          outgoing +=
            addAmount(
              output.amounts,
              "lovelace"
            );

          observe(
            output.address,
            "outgoing",
            tx.transactionHash
          );
        }

        return;
      }

      if (
        !rootInInputs &&
        rootOutputs.length >
          0
      ) {
        incomingCount +=
          1;

        let received =
          0n;

        for (
          const output of
          rootOutputs
        ) {
          received +=
            addAmount(
              output.amounts,
              "lovelace"
            );
        }

        incoming +=
          received;

        for (
          const input of
          externalInputs
        ) {
          observe(
            input.address,
            "incoming",
            tx.transactionHash
          );
        }

        if (
          !observedFunding &&
          externalInputs.length ===
            1
        ) {
          const source =
            externalInputs[0]
              ?.address;

          if (source) {
            observedFunding = {
              sourceAddress:
                source,

              transactionHash:
                tx.transactionHash,

              amountLovelace:
                received >
                  0n
                  ? received
                    .toString()
                  : null,

              timestamp:
                tx.blockTime,
            };
          }
        }

        return;
      }

      if (
        rootInInputs &&
        rootOutputs.length >
          0 &&
        externalOutputs.length ===
          0
      ) {
        selfCount +=
          1;

        return;
      }

      unresolvedCount +=
        1;
    };

  for (
    const tx of
    evidence
      .canonicalTransactions
  ) {
    inspect(tx);
  }

  const policyIds =
    new Set(
      evidence
        .addressState
        .assets
        .map(
          asset =>
            asset.policyId
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
    );

  const counterparties =
    [...relationships.values()]
      .map(item => ({
        address:
          item.address,

        incomingCount:
          item.incomingCount,

        outgoingCount:
          item.outgoingCount,

        observationCount:
          item.incomingCount +
          item.outgoingCount,

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
    flow: {
      incomingTransactionCount:
        incomingCount,

      outgoingTransactionCount:
        outgoingCount,

      selfTransactionCount:
        selfCount,

      unresolvedTransactionCount:
        unresolvedCount,

      incomingLovelace:
        incoming.toString(),

      outgoingLovelace:
        outgoing.toString(),
    },

    counterparties: {
      count:
        counterparties.length,

      items:
        counterparties,
    },

    observedFunding,

    assets: {
      currentNativeAssetCount:
        evidence
          .addressState
          .assets
          .length,

      observedPolicyCount:
        policyIds.size,
    },

    canonicalCoverage: {
      requested:
        evidence
          .coverage
          .canonicalRequested,

      verified:
        evidence
          .coverage
          .canonicalVerified,

      unavailable:
        evidence
          .coverage
          .canonicalUnavailable,
    },
  };
}
