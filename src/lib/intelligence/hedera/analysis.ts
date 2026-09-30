import type {
  HederaMirrorEvidence,
} from "./types";

import type {
  HederaSpecialistEvidence,
} from "./providers/specialist";

export type HederaFlowEvidence = {
  transactionId:
    string;

  consensusTimestamp:
    string | null;

  direction:
    "incoming" |
    "outgoing";

  counterparty:
    string;

  amountTinybar:
    string;

  asset:
    "HBAR";
};

export type HederaDerivedAnalysis = {
  flow: {
    incomingTransferCount:
      number;

    outgoingTransferCount:
      number;

    incomingTinybar:
      string;

    outgoingTinybar:
      string;

    transfers:
      readonly HederaFlowEvidence[];
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

        transactionIds:
          readonly string[];
      }[];
  };

  assets: {
    tokenRelationshipCount:
      number;

    nftCount:
      number;

    tokenMetadataCount:
      number;

    tokensWithControlKeys:
      number;
  };

  staking: {
    stakedAccountId:
      string | null;

    stakedNodeId:
      string | null;

    pendingRewardTinybar:
      string | null;

    declineReward:
      boolean | null;

    observedRewardCount:
      number;
  };

  observedFunding:
    | {
        sourceAccountId:
          string;

        transactionId:
          string;

        amountTinybar:
          string;

        timestamp:
          string | null;
      }
    | null;
};

function bigintOrZero(
  value:
    string
) {
  try {
    return BigInt(
      value
    );
  } catch {
    return 0n;
  }
}

export function buildHederaDerivedAnalysis({
  accountId,
  evidence,
  specialist,
}: {
  accountId:
    string;

  evidence:
    HederaMirrorEvidence;

  specialist:
    HederaSpecialistEvidence | null;
}): HederaDerivedAnalysis {
  const transfers:
    HederaFlowEvidence[] =
      [];

  let incoming =
    0n;

  let outgoing =
    0n;

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

  function observe(
    counterparty:
      string,
    direction:
      "incoming" |
      "outgoing",
    transactionId:
      string
  ) {
    if (
      counterparty ===
        accountId
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
        transactionId
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
    const transactionId =
      transaction
        .transactionId ??
      transaction
        .consensusTimestamp ??
      "hedera-transaction";

    const root =
      transaction
        .transfers
        .find(
          transfer =>
            transfer
              .accountId ===
            accountId
        );

    if (!root) {
      continue;
    }

    let rootAmount:
      bigint;

    try {
      rootAmount =
        BigInt(
          root.amountTinybar
        );
    } catch {
      continue;
    }

    if (
      rootAmount > 0n
    ) {
      incoming +=
        rootAmount;

      const sources =
        transaction
          .transfers
          .filter(
            transfer =>
              transfer.accountId !==
                accountId &&
              bigintOrZero(
                transfer
                  .amountTinybar
              ) < 0n
          );

      for (
        const source of sources
      ) {
        transfers.push({
          transactionId,

          consensusTimestamp:
            transaction
              .consensusTimestamp,

          direction:
            "incoming",

          counterparty:
            source
              .accountId,

          amountTinybar:
            rootAmount
              .toString(),

          asset:
            "HBAR",
        });

        observe(
          source.accountId,
          "incoming",
          transactionId
        );
      }

      continue;
    }

    if (
      rootAmount < 0n
    ) {
      const absolute =
        -rootAmount;

      outgoing +=
        absolute;

      const targets =
        transaction
          .transfers
          .filter(
            transfer =>
              transfer.accountId !==
                accountId &&
              bigintOrZero(
                transfer
                  .amountTinybar
              ) > 0n
          );

      for (
        const target of targets
      ) {
        transfers.push({
          transactionId,

          consensusTimestamp:
            transaction
              .consensusTimestamp,

          direction:
            "outgoing",

          counterparty:
            target
              .accountId,

          amountTinybar:
            absolute
              .toString(),

          asset:
            "HBAR",
        });

        observe(
          target.accountId,
          "outgoing",
          transactionId
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
          accountId:
            counterparty,

          incomingCount:
            item.incoming,

          outgoingCount:
            item.outgoing,

          observationCount:
            item.incoming +
            item.outgoing,

          transactionIds:
            [...item.transactionIds],
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

  const orderedIncoming =
    transfers
      .filter(
        item =>
          item.direction ===
            "incoming"
      )
      .sort(
        (
          left,
          right
        ) =>
          (
            left
              .consensusTimestamp ??
            ""
          ).localeCompare(
            right
              .consensusTimestamp ??
            ""
          )
      );

  const earliest =
    orderedIncoming[0] ??
    null;

  const controlled =
    specialist
      ?.tokenMetadata
      .filter(
        token =>
          Object.values(
            token.controls
          ).some(
            key =>
              key !== null
          )
      ).length ??
    0;

  return {
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

      incomingTinybar:
        incoming.toString(),

      outgoingTinybar:
        outgoing.toString(),

      transfers,
    },

    counterparties: {
      count:
        counterparties.length,

      items:
        counterparties,
    },

    assets: {
      tokenRelationshipCount:
        evidence
          .tokenRelationships
          .length,

      nftCount:
        evidence.nfts
          .length,

      tokenMetadataCount:
        specialist
          ?.tokenMetadata
          .length ??
        0,

      tokensWithControlKeys:
        controlled,
    },

    staking: {
      stakedAccountId:
        evidence.account
          .stakedAccountId,

      stakedNodeId:
        evidence.account
          .stakedNodeId,

      pendingRewardTinybar:
        evidence.account
          .pendingRewardTinybar,

      declineReward:
        evidence.account
          .declineReward,

      observedRewardCount:
        specialist
          ?.stakingRewards
          .length ??
        0,
    },

    observedFunding:
      earliest
        ? {
            sourceAccountId:
              earliest.counterparty,

            transactionId:
              earliest
                .transactionId,

            amountTinybar:
              earliest
                .amountTinybar,

            timestamp:
              earliest
                .consensusTimestamp,
          }
        : null,
  };
}
