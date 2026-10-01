import {
  normalizeZcashTransparentAddress,
} from "./address";

import type {
  ZcashAnalysisPolicy,
} from "./policy";

import type {
  ZcashCanonicalTransaction,
  ZcashEvidence,
} from "./types";

export type ZcashFlowEvidence = {
  txid:
    string;

  height:
    number | null;

  timestamp:
    string | null;

  direction:
    "incoming" |
    "outgoing";

  counterparty:
    string;

  amountZatoshis:
    string | null;

  evidence:
    "explicit-transparent-input"
    | "explicit-transparent-output";
};

export type ZcashDerivedAnalysis = {
  flow: {
    incomingTransactionCount:
      number;

    outgoingTransactionCount:
      number;

    incomingZatoshis:
      string;

    explicitOutgoingZatoshis:
      string;

    transfers:
      readonly ZcashFlowEvidence[];
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

        transactionIds:
          readonly string[];
      }[];
  };

  observedFunding:
    | {
        sourceAddress:
          string;

        txid:
          string;

        amountZatoshis:
          string;

        height:
          number | null;

        timestamp:
          string | null;
      }
    | null;

  privacyBoundary: {
    transactionsWithUnresolvedInputs:
      number;

    transactionsWithUnresolvedOutputs:
      number;

    unresolvedInputCount:
      number;

    unresolvedOutputCount:
      number;
  };

  timeline: {
    events:
      readonly {
        txid:
          string;

        height:
          number | null;

        timestamp:
          string | null;

        subjectInput:
          boolean;

        subjectOutput:
          boolean;

        externalTransparentInputs:
          number;

        externalTransparentOutputs:
          number;

        unresolvedInputs:
          number;

        unresolvedOutputs:
          number;
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

        txid:
          string;

        amountZatoshis:
          string | null;

        evidence:
          string;
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

function uniqueStrings(
  values:
    readonly (
      string |
      null
    )[]
) {
  return [
    ...new Set(
      values.filter(
        (
          value
        ): value is string =>
          value !== null
      )
    ),
  ];
}

function transactionOrder(
  transaction:
    ZcashCanonicalTransaction
) {
  return (
    transaction.height ??
    Number.MAX_SAFE_INTEGER
  );
}

export function buildZcashDerivedAnalysis({
  address,
  evidence,
  policy,
}: {
  address:
    string;

  evidence:
    ZcashEvidence;

  policy:
    ZcashAnalysisPolicy;
}): ZcashDerivedAnalysis {
  const root =
    normalizeZcashTransparentAddress(
      address
    );

  if (!root) {
    throw new Error(
      "Zcash analysis received invalid transparent root address."
    );
  }

  const transfers:
    ZcashFlowEvidence[] =
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

  let incomingZatoshis =
    0n;

  let explicitOutgoingZatoshis =
    0n;

  let incomingTransactionCount =
    0;

  let outgoingTransactionCount =
    0;

  let transactionsWithUnresolvedInputs =
    0;

  let transactionsWithUnresolvedOutputs =
    0;

  let unresolvedInputCount =
    0;

  let unresolvedOutputCount =
    0;

  type FundingCandidate = {
    sourceAddress:
      string;

    txid:
      string;

    amountZatoshis:
      string;

    height:
      number | null;

    timestamp:
      string | null;
  };

  const fundingCandidates:
    FundingCandidate[] =
      [];

  function observe(
    counterparty:
      string,
    direction:
      "incoming" |
      "outgoing",
    txid:
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

    current
      .transactionIds
      .add(
        txid
      );

    relationships.set(
      counterparty,
      current
    );
  }

  for (
    const transaction of
    evidence
      .canonicalTransactions
  ) {
    const rootInputs =
      transaction.inputs
        .filter(
          input =>
            input.address ===
              root
        );

    const rootOutputs =
      transaction.outputs
        .filter(
          output =>
            output.address ===
              root
        );

    const externalInputs =
      transaction.inputs
        .filter(
          input =>
            input.address &&
            input.address !==
              root
        );

    const externalOutputs =
      transaction.outputs
        .filter(
          output =>
            output.address &&
            output.address !==
              root
        );

    const unresolvedInputs =
      transaction.inputs
        .filter(
          input =>
            input.address ===
              null
        ).length;

    const unresolvedOutputs =
      transaction.outputs
        .filter(
          output =>
            output.address ===
              null
        ).length;

    unresolvedInputCount +=
      unresolvedInputs;

    unresolvedOutputCount +=
      unresolvedOutputs;

    if (
      unresolvedInputs >
      0
    ) {
      transactionsWithUnresolvedInputs +=
        1;
    }

    if (
      unresolvedOutputs >
      0
    ) {
      transactionsWithUnresolvedOutputs +=
        1;
    }

    const incomingAmount =
      rootOutputs.reduce(
        (
          total,
          output
        ) =>
          total +
          bigintOrZero(
            output
              .valueZatoshis
          ),
        0n
      );

    /*
     * A root output is inbound only when the
     * analyzed address is not also spending
     * an input in the same transaction.
     *
     * If root appears in both inputs and
     * outputs, the root output may be
     * self/change evidence. AYZO must not
     * count it as fresh inbound funding.
     */
    if (
      rootInputs.length ===
        0 &&
      rootOutputs.length >
        0 &&
      incomingAmount >
        0n
    ) {
      incomingZatoshis +=
        incomingAmount;

      incomingTransactionCount +=
        1;

      const sources =
        uniqueStrings(
          externalInputs
            .map(
              input =>
                input.address
            )
        );

      const fullyTransparentSourceSet =
        unresolvedInputs ===
          0 &&
        rootInputs.length ===
          0 &&
        transaction.coinbase !==
          true;

      for (
        const source of
        sources
      ) {
        const attributableAmount =
          (
            fullyTransparentSourceSet &&
            sources.length ===
              1
          )
            ? incomingAmount
                .toString()
            : null;

        transfers.push({
          txid:
            transaction.txid,

          height:
            transaction.height,

          timestamp:
            transaction
              .timestamp,

          direction:
            "incoming",

          counterparty:
            source,

          amountZatoshis:
            attributableAmount,

          evidence:
            "explicit-transparent-input",
        });

        observe(
          source,
          "incoming",
          transaction.txid
        );
      }

      if (
        fullyTransparentSourceSet &&
        sources.length ===
          1
      ) {
        fundingCandidates.push({
          sourceAddress:
            sources[0]!,

          txid:
            transaction.txid,

          amountZatoshis:
            incomingAmount
              .toString(),

          height:
            transaction.height,

          timestamp:
            transaction
              .timestamp,
        });
      }
    }

    if (
      rootInputs.length >
        0 &&
      externalOutputs.length >
        0
    ) {
      outgoingTransactionCount +=
        1;

      for (
        const output of
        externalOutputs
      ) {
        const counterparty =
          output.address;

        if (!counterparty) {
          continue;
        }

        const amount =
          output
            .valueZatoshis;

        explicitOutgoingZatoshis +=
          bigintOrZero(
            amount
          );

        transfers.push({
          txid:
            transaction.txid,

          height:
            transaction.height,

          timestamp:
            transaction
              .timestamp,

          direction:
            "outgoing",

          counterparty,

          amountZatoshis:
            amount,

          evidence:
            "explicit-transparent-output",
        });

        observe(
          counterparty,
          "outgoing",
          transaction.txid
        );
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

  const funding =
    [...fundingCandidates]
      .sort(
        (
          left,
          right
        ) =>
          (
            left.height ??
            Number.MAX_SAFE_INTEGER
          ) -
          (
            right.height ??
            Number.MAX_SAFE_INTEGER
          )
      )[0] ??
    null;

  const timeline =
    [...evidence
      .canonicalTransactions]
      .sort(
        (
          left,
          right
        ) =>
          transactionOrder(
            left
          ) -
          transactionOrder(
            right
          )
      )
      .slice(
        0,
        policy
          .timelineMaxEvents
      )
      .map(
        transaction => {
          const subjectInput =
            transaction.inputs
              .some(
                input =>
                  input.address ===
                    root
              );

          const subjectOutput =
            transaction.outputs
              .some(
                output =>
                  output.address ===
                    root
              );

          return {
            txid:
              transaction.txid,

            height:
              transaction.height,

            timestamp:
              transaction
                .timestamp,

            subjectInput,

            subjectOutput,

            externalTransparentInputs:
              uniqueStrings(
                transaction.inputs
                  .filter(
                    input =>
                      input.address !==
                        root
                  )
                  .map(
                    input =>
                      input.address
                  )
              ).length,

            externalTransparentOutputs:
              uniqueStrings(
                transaction.outputs
                  .filter(
                    output =>
                      output.address !==
                        root
                  )
                  .map(
                    output =>
                      output.address
                  )
              ).length,

            unresolvedInputs:
              transaction.inputs
                .filter(
                  input =>
                    input.address ===
                      null
                ).length,

            unresolvedOutputs:
              transaction.outputs
                .filter(
                  output =>
                    output.address ===
                      null
                ).length,
          };
        }
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
            transfer
              .counterparty
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

          txid:
            transfer.txid,

          amountZatoshis:
            transfer
              .amountZatoshis,

          evidence:
            transfer.evidence,
        })
      );

  return {
    flow: {
      incomingTransactionCount,

      outgoingTransactionCount,

      incomingZatoshis:
        incomingZatoshis
          .toString(),

      explicitOutgoingZatoshis:
        explicitOutgoingZatoshis
          .toString(),

      transfers,
    },

    counterparties: {
      count:
        counterparties.length,

      items:
        counterparties,
    },

    observedFunding:
      funding,

    privacyBoundary: {
      transactionsWithUnresolvedInputs,

      transactionsWithUnresolvedOutputs,

      unresolvedInputCount,

      unresolvedOutputCount,
    },

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
