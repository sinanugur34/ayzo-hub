import {
  normalizeTonAddress,
} from "./address";

import type {
  TonEvidence,
} from "./types";

export type TonDerivedAnalysis = {
  flow: {
    observedTransactionCount:
      number;

    incomingMessageCount:
      number;

    outgoingMessageCount:
      number;

    incomingNano:
      string;

    outgoingNano:
      string;

    totalFeesNano:
      string;
  };

  counterparties: {
    count:
      number;

    items:
      readonly {
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
      }[];
  };

  observedFunding:
    | {
        sourceAddress:
          string;

        transactionHash:
          string;

        timestamp:
          string | null;

        amountNano:
          string;
      }
    | null;

  jettons: {
    walletCount:
      number;

    positiveBalanceCount:
      number;

    transferCount:
      number;

    masterCount:
      number;
  };
};

function same(
  left:
    string | null,
  right:
    string
) {
  if (!left) {
    return false;
  }

  return (
    normalizeTonAddress(
      left
    ) ??
    left
  ) ===
    right;
}

export function buildTonDerivedAnalysis({
  address,
  evidence,
}: {
  address:
    string;

  evidence:
    TonEvidence;
}): TonDerivedAnalysis {
  const root =
    normalizeTonAddress(
      address
    ) ??
    address;

  let incomingNano =
    0n;

  let outgoingNano =
    0n;

  let totalFees =
    0n;

  let incomingCount =
    0;

  let outgoingCount =
    0;

  const relationships =
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
    addressValue:
      string | null,
    direction:
      "incoming" |
      "outgoing",
    tx:
      string
  ) {
    if (
      !addressValue
    ) {
      return;
    }

    const normalized =
      normalizeTonAddress(
        addressValue
      ) ??
      addressValue;

    if (
      normalized ===
      root
    ) {
      return;
    }

    const current =
      relationships.get(
        normalized
      ) ?? {
        address:
          addressValue,

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
    } else {
      current.outgoingCount +=
        1;
    }

    current.hashes.add(
      tx
    );

    relationships.set(
      normalized,
      current
    );
  }

  for (
    const transaction of
    evidence.transactions
  ) {
    try {
      totalFees +=
        BigInt(
          transaction
            .totalFeesNano
        );
    } catch {
      // Keep bounded valid numeric evidence only.
    }

    const inbound =
      transaction.inbound;

    if (
      inbound &&
      same(
        inbound.destination,
        root
      ) &&
      inbound.source
    ) {
      try {
        const value =
          BigInt(
            inbound.valueNano
          );

        if (
          value >
          0n
        ) {
          incomingNano +=
            value;

          incomingCount +=
            1;
        }
      } catch {
        // Ignore malformed numeric evidence.
      }

      observe(
        inbound.source,
        "incoming",
        transaction
          .transactionHash
      );
    }

    for (
      const outbound of
      transaction.outbound
    ) {
      if (
        !same(
          outbound.source,
          root
        ) &&
        !same(
          transaction
            .inbound
            ?.destination ??
            null,
          root
        )
      ) {
        continue;
      }

      if (
        outbound.destination
      ) {
        try {
          const value =
            BigInt(
              outbound
                .valueNano
            );

          if (
            value >
            0n
          ) {
            outgoingNano +=
              value;

            outgoingCount +=
              1;
          }
        } catch {
          // Ignore malformed numeric evidence.
        }

        observe(
          outbound.destination,
          "outgoing",
          transaction
            .transactionHash
        );
      }
    }
  }

  for (
    const transfer of
    evidence
      .jettonTransfers
  ) {
    if (
      transfer.source
    ) {
      observe(
        transfer.source,
        "incoming",
        transfer
          .transactionHash
      );
    }

    if (
      transfer.destination
    ) {
      observe(
        transfer.destination,
        "outgoing",
        transfer
          .transactionHash
      );
    }
  }

  let observedFunding:
    TonDerivedAnalysis[
      "observedFunding"
    ] =
      null;

  for (
    const transaction of
    evidence
      .earliestTransactions
  ) {
    const inbound =
      transaction.inbound;

    if (
      !inbound ||
      !inbound.source ||
      !same(
        inbound.destination,
        root
      )
    ) {
      continue;
    }

    try {
      const value =
        BigInt(
          inbound.valueNano
        );

      if (
        value <=
        0n
      ) {
        continue;
      }

      observedFunding = {
        sourceAddress:
          inbound.source,

        transactionHash:
          transaction
            .transactionHash,

        timestamp:
          transaction
            .timestamp,

        amountNano:
          value.toString(),
      };

      break;
    } catch {
      // Continue to the next bounded observation.
    }
  }

  const masters =
    new Set(
      evidence
        .jettonWallets
        .map(
          item =>
            item
              .jettonMaster
        )
    );

  return {
    flow: {
      observedTransactionCount:
        evidence
          .transactions
          .length,

      incomingMessageCount:
        incomingCount,

      outgoingMessageCount:
        outgoingCount,

      incomingNano:
        incomingNano
          .toString(),

      outgoingNano:
        outgoingNano
          .toString(),

      totalFeesNano:
        totalFees
          .toString(),
    },

    counterparties: {
      count:
        relationships
          .size,

      items:
        [
          ...relationships
            .values(),
        ]
          .sort(
            (
              a,
              b
            ) =>
              b
                .interactionCount -
              a
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

    observedFunding,

    jettons: {
      walletCount:
        evidence
          .jettonWallets
          .length,

      positiveBalanceCount:
        evidence
          .jettonWallets
          .filter(
            wallet => {
              try {
                return (
                  BigInt(
                    wallet.balance
                  ) >
                  0n
                );
              } catch {
                return false;
              }
            }
          )
          .length,

      transferCount:
        evidence
          .jettonTransfers
          .length,

      masterCount:
        masters.size,
    },
  };
}
