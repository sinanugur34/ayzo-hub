import type {
  StellarEvidence,
  StellarPaymentEvidence,
} from "./types";

export type StellarDerivedAnalysis = {
  nativeBalanceXlm:
    string;

  trustlines: {
    count:
      number;

    issuerCount:
      number;

    issuers:
      readonly string[];
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
          string | null;

        timestamp:
          string | null;

        amount:
          string | null;

        asset:
          string;
      }
    | null;

  trading: {
    openOfferCount:
      number;

    observedTradeCount:
      number;
  };
};

function paymentAsset(
  payment:
    StellarPaymentEvidence
) {
  if (
    payment.assetType ===
      "native" ||
    !payment.assetType
  ) {
    return "XLM";
  }

  if (
    payment.assetCode
  ) {
    return payment
      .assetIssuer
      ? `${payment.assetCode}:${payment.assetIssuer}`
      : payment
          .assetCode;
  }

  return payment.assetType;
}

export function buildStellarDerivedAnalysis({
  address,
  evidence,
}: {
  address:
    string;

  evidence:
    StellarEvidence;
}): StellarDerivedAnalysis {
  const native =
    evidence
      .account
      .balances
      .find(
        balance =>
          balance.assetType ===
          "native"
      );

  const trustlines =
    evidence
      .account
      .balances
      .filter(
        balance =>
          balance.assetType !==
          "native"
      );

  const issuers =
    new Set(
      trustlines
        .map(
          balance =>
            balance
              .assetIssuer
        )
        .filter(
          (
            issuer
          ): issuer is
            string =>
              issuer !== null
        )
    );

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
    candidate:
      string | null,
    direction:
      "incoming" |
      "outgoing",
    hash:
      string | null
  ) {
    if (
      !candidate ||
      candidate ===
        address
    ) {
      return;
    }

    const current =
      relationships.get(
        candidate
      ) ?? {
        address:
          candidate,

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

    if (hash) {
      current.hashes.add(
        hash
      );
    }

    relationships.set(
      candidate,
      current
    );
  }

  for (
    const payment of
    evidence.payments
  ) {
    if (
      payment.type ===
        "create_account"
    ) {
      if (
        payment.createdAccount ===
          address
      ) {
        observe(
          payment.funder,
          "incoming",
          payment
            .transactionHash
        );
      }

      continue;
    }

    if (
      payment.destination ===
        address
    ) {
      observe(
        payment.source,
        "incoming",
        payment
          .transactionHash
      );
    }

    if (
      payment.source ===
        address
    ) {
      observe(
        payment.destination,
        "outgoing",
        payment
          .transactionHash
      );
    }
  }

  let observedFunding:
    StellarDerivedAnalysis[
      "observedFunding"
    ] =
      null;

  for (
    const payment of
    evidence
      .earliestPayments
  ) {
    if (
      payment.type ===
        "create_account" &&
      payment.createdAccount ===
        address &&
      payment.funder
    ) {
      observedFunding = {
        sourceAddress:
          payment.funder,

        transactionHash:
          payment
            .transactionHash,

        timestamp:
          payment
            .createdAt,

        amount:
          payment
            .startingBalance,

        asset:
          "XLM",
      };

      break;
    }

    if (
      payment.destination ===
        address &&
      payment.source
    ) {
      observedFunding = {
        sourceAddress:
          payment.source,

        transactionHash:
          payment
            .transactionHash,

        timestamp:
          payment
            .createdAt,

        amount:
          payment.amount,

        asset:
          paymentAsset(
            payment
          ),
      };

      break;
    }
  }

  return {
    nativeBalanceXlm:
      native?.balance ??
      "0",

    trustlines: {
      count:
        trustlines.length,

      issuerCount:
        issuers.size,

      issuers:
        [
          ...issuers,
        ],
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

    observedFunding,

    trading: {
      openOfferCount:
        evidence
          .offers
          .length,

      observedTradeCount:
        evidence
          .trades
          .length,
    },
  };
}
