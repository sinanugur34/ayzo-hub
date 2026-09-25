import type {
  XrplAccountEvidence,
  XrplObservedTransaction,
} from "./types";

function lower(
  value:
    string
) {
  return value.toLowerCase();
}

function addDrops(
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

export type XrplFlowIntelligence = {
  incomingCount:
    number;

  outgoingCount:
    number;

  selfCount:
    number;

  observedNativePaymentCount:
    number;

  observedIssuedPaymentCount:
    number;

  incomingDrops:
    string;

  outgoingDrops:
    string;

  uniqueCounterpartyCount:
    number;
};

export type XrplCounterpartyIntelligence = {
  counterpartyCount:
    number;

  counterparties:
    readonly {
      address:
        string;

      incomingCount:
        number;

      outgoingCount:
        number;

      trustLineCount:
        number;

      interactionCount:
        number;
    }[];
};

export type XrplTrustLineIntelligence = {
  trustLineCount:
    number;

  currencyCount:
    number;

  issuerCount:
    number;

  frozenLineCount:
    number;

  authorizedLineCount:
    number;

  currencies:
    readonly string[];
};

export type XrplAccountObjectIntelligence = {
  objectCount:
    number;

  byType:
    Readonly<
      Record<
        string,
        number
      >
    >;
};

export type XrplSignerIntelligence = {
  signerListCount:
    number;

  signerCount:
    number;

  highestQuorum:
    number | null;

  multisignConfigured:
    boolean;
};

export type XrplDerivedAnalysis = {
  flow:
    XrplFlowIntelligence;

  counterparties:
    XrplCounterpartyIntelligence;

  trustLines:
    XrplTrustLineIntelligence;

  accountObjects:
    XrplAccountObjectIntelligence;

  signer:
    XrplSignerIntelligence;
};

function transactionCounterparty(
  address:
    string,
  tx:
    XrplObservedTransaction
) {
  const target =
    lower(address);

  const source =
    tx.source
      ? lower(
          tx.source
        )
      : null;

  const destination =
    tx.destination
      ? lower(
          tx.destination
        )
      : null;

  if (
    destination ===
      target &&
    source &&
    source !==
      target
  ) {
    return {
      direction:
        "incoming" as const,

      address:
        tx.source as string,
    };
  }

  if (
    source ===
      target &&
    destination &&
    destination !==
      target
  ) {
    return {
      direction:
        "outgoing" as const,

      address:
        tx.destination as string,
    };
  }

  return null;
}

export function buildXrplDerivedAnalysis({
  address,
  evidence,
}: {
  address:
    string;

  evidence:
    XrplAccountEvidence;
}): XrplDerivedAnalysis {
  let incomingCount =
    0;

  let outgoingCount =
    0;

  let selfCount =
    0;

  let observedNativePaymentCount =
    0;

  let observedIssuedPaymentCount =
    0;

  let incomingDrops =
    0n;

  let outgoingDrops =
    0n;

  const target =
    lower(address);

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

        trustLineCount:
          number;
      }
    >();

  for (
    const tx of
    evidence.transactions
  ) {
    const source =
      tx.source
        ? lower(tx.source)
        : null;

    const destination =
      tx.destination
        ? lower(
            tx.destination
          )
        : null;

    if (
      source === target &&
      destination === target
    ) {
      selfCount +=
        1;
    } else if (
      destination === target
    ) {
      incomingCount +=
        1;

      incomingDrops =
        addDrops(
          incomingDrops,
          tx.amountDrops
        );
    } else if (
      source === target
    ) {
      outgoingCount +=
        1;

      outgoingDrops =
        addDrops(
          outgoingDrops,
          tx.amountDrops
        );
    }

    if (
      tx.amountDrops !==
      null
    ) {
      observedNativePaymentCount +=
        1;
    }

    if (
      tx.issuedAmount !==
      null
    ) {
      observedIssuedPaymentCount +=
        1;
    }

    const counterparty =
      transactionCounterparty(
        address,
        tx
      );

    if (
      counterparty
    ) {
      const key =
        lower(
          counterparty.address
        );

      const current =
        counterparties.get(
          key
        ) ?? {
          address:
            counterparty.address,

          incomingCount:
            0,

          outgoingCount:
            0,

          trustLineCount:
            0,
        };

      if (
        counterparty.direction ===
        "incoming"
      ) {
        current.incomingCount +=
          1;
      } else {
        current.outgoingCount +=
          1;
      }

      counterparties.set(
        key,
        current
      );
    }
  }

  for (
    const line of
    evidence.trustLines
  ) {
    const key =
      lower(
        line.counterparty
      );

    const current =
      counterparties.get(
        key
      ) ?? {
        address:
          line.counterparty,

        incomingCount:
          0,

        outgoingCount:
          0,

        trustLineCount:
          0,
      };

    current.trustLineCount +=
      1;

    counterparties.set(
      key,
      current
    );
  }

  const currencies =
    new Set(
      evidence.trustLines.map(
        line =>
          line.currency
      )
    );

  const issuers =
    new Set(
      evidence.trustLines.map(
        line =>
          lower(
            line.counterparty
          )
      )
    );

  const byType:
    Record<
      string,
      number
    > = {};

  for (
    const object of
    evidence.accountObjects
  ) {
    byType[
      object.ledgerEntryType
    ] =
      (
        byType[
          object.ledgerEntryType
        ] ??
        0
      ) +
      1;
  }

  const signerCount =
    evidence.signerLists.reduce(
      (
        total,
        list
      ) =>
        total +
        list.signers.length,
      0
    );

  const highestQuorum =
    evidence.signerLists.length >
      0
      ? Math.max(
          ...evidence.signerLists.map(
            list =>
              list.quorum
          )
        )
      : null;

  return {
    flow: {
      incomingCount,

      outgoingCount,

      selfCount,

      observedNativePaymentCount,

      observedIssuedPaymentCount,

      incomingDrops:
        incomingDrops.toString(),

      outgoingDrops:
        outgoingDrops.toString(),

      uniqueCounterpartyCount:
        counterparties.size,
    },

    counterparties: {
      counterpartyCount:
        counterparties.size,

      counterparties: [
        ...counterparties.values(),
      ]
        .map(
          item => ({
            ...item,

            interactionCount:
              item.incomingCount +
              item.outgoingCount +
              item.trustLineCount,
          })
        )
        .sort(
          (
            left,
            right
          ) =>
            right.interactionCount -
            left.interactionCount
        ),
    },

    trustLines: {
      trustLineCount:
        evidence.trustLines.length,

      currencyCount:
        currencies.size,

      issuerCount:
        issuers.size,

      frozenLineCount:
        evidence.trustLines.filter(
          line =>
            line.freeze === true ||
            line.freezePeer ===
              true
        ).length,

      authorizedLineCount:
        evidence.trustLines.filter(
          line =>
            line.authorized ===
              true ||
            line.peerAuthorized ===
              true
        ).length,

      currencies: [
        ...currencies,
      ].sort(),
    },

    accountObjects: {
      objectCount:
        evidence.accountObjects.length,

      byType,
    },

    signer: {
      signerListCount:
        evidence.signerLists.length,

      signerCount,

      highestQuorum,

      multisignConfigured:
        evidence.signerLists.length >
        0,
    },
  };
}