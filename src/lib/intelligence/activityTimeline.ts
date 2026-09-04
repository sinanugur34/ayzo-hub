import type {
  EvmTransaction,
  EvmTransfer,
} from "./evm/types";

export type ActivityTimelineStatus =
  | "complete"
  | "limited"
  | "unavailable";

export type ActivityTimelineDirection =
  | "incoming"
  | "outgoing"
  | "self"
  | "observed";

export type ActivityTimelineEventKind =
  | "native_transfer"
  | "transaction"
  | "token_transfer"
  | "funding_transfer";

export type ActivityTimelineEvidenceState =
  "SUPPORTED";

export type ActivityTimelineEvent = {
  id: string;

  timestamp:
    string | null;

  blockNumber:
    number | null;

  kind:
    ActivityTimelineEventKind;

  direction:
    ActivityTimelineDirection;

  from:
    string | null;

  to:
    string | null;

  counterparty:
    string | null;

  asset:
    string | null;

  assetAddress:
    string | null;

  rawValue:
    string | null;

  formattedValue:
    string | null;

  transactionHash:
    string;

  evidenceState:
    ActivityTimelineEvidenceState;

  whyItMatters:
    string;
};

export type ActivityTimeline = {
  status:
    ActivityTimelineStatus;

  limitation:
    string | null;

  events:
    readonly ActivityTimelineEvent[];

  evidenceWindow: {
    transactionCount:
      number;

    transferCount:
      number;

    maxEvents:
      number;
  };
};

type BuildEvmActivityTimelineInput = {
  analyzedAddress:
    string;

  nativeCurrency:
    string;

  tokenSymbol:
    string | null;

  tokenDecimals:
    number | null;

  transactions:
    readonly EvmTransaction[];

  transfers:
    readonly EvmTransfer[];

  transactionsAvailable:
    boolean;

  transfersRequested:
    boolean;

  transfersAvailable:
    boolean;

  transactionExhausted:
    boolean;

  transferExhausted:
    boolean;

  maxEvents?:
    number;
};

function sameAddress(
  left:
    string | null,
  right:
    string
) {
  return (
    typeof left ===
      "string" &&
    left.toLowerCase() ===
      right.toLowerCase()
  );
}

function directionFor(
  from:
    string | null,
  to:
    string | null,
  analyzedAddress:
    string
): ActivityTimelineDirection {
  const fromTarget =
    sameAddress(
      from,
      analyzedAddress
    );

  const toTarget =
    sameAddress(
      to,
      analyzedAddress
    );

  if (
    fromTarget &&
    toTarget
  ) {
    return "self";
  }

  if (toTarget) {
    return "incoming";
  }

  if (fromTarget) {
    return "outgoing";
  }

  return "observed";
}

function counterpartyFor(
  direction:
    ActivityTimelineDirection,
  from:
    string | null,
  to:
    string | null
) {
  switch (direction) {
    case "incoming":
      return from;

    case "outgoing":
      return to;

    case "self":
      return (
        to ??
        from
      );

    case "observed":
      return null;
  }
}

function hasNonZeroValue(
  raw:
    string | null
) {
  if (!raw) {
    return false;
  }

  try {
    return (
      BigInt(raw) !==
      0n
    );
  } catch {
    return (
      raw !== "0"
    );
  }
}

function formatBaseUnits(
  raw:
    string | null,
  decimals:
    number | null
) {
  if (
    raw === null ||
    decimals === null ||
    !Number.isInteger(
      decimals
    ) ||
    decimals < 0 ||
    decimals > 36
  ) {
    return null;
  }

  try {
    const value =
      BigInt(raw);

    const negative =
      value < 0n;

    const absolute =
      negative
        ? -value
        : value;

    const divisor =
      10n **
      BigInt(decimals);

    const whole =
      absolute /
      divisor;

    if (decimals === 0) {
      return (
        negative
          ? "-"
          : ""
      ) +
        whole.toString();
    }

    const fraction =
      (
        absolute %
        divisor
      )
        .toString()
        .padStart(
          decimals,
          "0"
        )
        .replace(
          /0+$/,
          ""
        )
        .slice(
          0,
          6
        );

    const result =
      fraction
        ? `${whole}.${fraction}`
        : whole.toString();

    return (
      negative
        ? `-${result}`
        : result
    );
  } catch {
    return null;
  }
}

function eventTime(
  timestamp:
    string | null
) {
  if (!timestamp) {
    return -1;
  }

  const parsed =
    Date.parse(
      timestamp
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : -1;
}

function whyTransactionMatters(
  direction:
    ActivityTimelineDirection,
  hasValue:
    boolean
) {
  if (hasValue) {
    switch (direction) {
      case "incoming":
        return "Native value was received by the analyzed address.";

      case "outgoing":
        return "Native value was sent by the analyzed address.";

      case "self":
        return "Native value moved in a self-directed transaction.";

      case "observed":
        return "Native-value activity was observed in the bounded address evidence.";
    }
  }

  switch (direction) {
    case "incoming":
      return "An on-chain transaction targeted the analyzed address.";

    case "outgoing":
      return "The analyzed address initiated an on-chain transaction.";

    case "self":
      return "A self-directed on-chain transaction was observed.";

    case "observed":
      return "An on-chain transaction was observed in the bounded evidence.";
  }
}

function whyTransferMatters(
  direction:
    ActivityTimelineDirection
) {
  switch (direction) {
    case "incoming":
      return "Token value was received by the analyzed address.";

    case "outgoing":
      return "Token value was sent by the analyzed address.";

    case "self":
      return "A self-directed token transfer was observed.";

    case "observed":
      return "A transfer of the analyzed token was observed on-chain.";
  }
}

export function buildEvmActivityTimeline(
  input:
    BuildEvmActivityTimelineInput
): ActivityTimeline {
  const maxEvents =
    Math.min(
      25,
      Math.max(
        1,
        input.maxEvents ??
          12
      )
    );

  const transactionEvents =
    input.transactionsAvailable
      ? input.transactions.map(
          (
            transaction,
            index
          ): ActivityTimelineEvent => {
            const direction =
              directionFor(
                transaction.from,
                transaction.to,
                input.analyzedAddress
              );

            const hasValue =
              hasNonZeroValue(
                transaction.value
              );

            return {
              id:
                `evm-tx:${transaction.hash}:${index}`,

              timestamp:
                transaction.timestamp,

              blockNumber:
                transaction.blockNumber,

              kind:
                hasValue
                  ? "native_transfer"
                  : "transaction",

              direction,

              from:
                transaction.from,

              to:
                transaction.to,

              counterparty:
                counterpartyFor(
                  direction,
                  transaction.from,
                  transaction.to
                ),

              asset:
                hasValue
                  ? input.nativeCurrency
                  : null,

              assetAddress:
                null,

              rawValue:
                hasValue
                  ? transaction.value
                  : null,

              /*
               * Current AYZO live EVM networks use
               * 18-decimal native assets.
               * Raw value remains attached as evidence.
               */
              formattedValue:
                hasValue
                  ? formatBaseUnits(
                      transaction.value,
                      18
                    )
                  : null,

              transactionHash:
                transaction.hash,

              evidenceState:
                "SUPPORTED",

              whyItMatters:
                whyTransactionMatters(
                  direction,
                  hasValue
                ),
            };
          }
        )
      : [];

  const transferEvents =
    input.transfersRequested &&
    input.transfersAvailable
      ? input.transfers.map(
          (
            transfer,
            index
          ): ActivityTimelineEvent => {
            const direction =
              directionFor(
                transfer.from,
                transfer.to,
                input.analyzedAddress
              );

            return {
              id:
                `evm-transfer:${transfer.transactionHash}:${index}`,

              timestamp:
                transfer.timestamp,

              blockNumber:
                transfer.blockNumber,

              kind:
                "token_transfer",

              direction,

              from:
                transfer.from,

              to:
                transfer.to,

              counterparty:
                counterpartyFor(
                  direction,
                  transfer.from,
                  transfer.to
                ),

              asset:
                input.tokenSymbol ??
                "ERC-20",

              assetAddress:
                transfer.tokenAddress,

              rawValue:
                transfer.value,

              formattedValue:
                formatBaseUnits(
                  transfer.value,
                  input.tokenDecimals
                ),

              transactionHash:
                transfer.transactionHash,

              evidenceState:
                "SUPPORTED",

              whyItMatters:
                whyTransferMatters(
                  direction
                ),
            };
          }
        )
      : [];

  const events = [
    ...transactionEvents,
    ...transferEvents,
  ]
    .sort(
      (
        left,
        right
      ) => {
        const timeDelta =
          eventTime(
            right.timestamp
          ) -
          eventTime(
            left.timestamp
          );

        if (
          timeDelta !==
          0
        ) {
          return timeDelta;
        }

        const blockDelta =
          (
            right.blockNumber ??
            -1
          ) -
          (
            left.blockNumber ??
            -1
          );

        if (
          blockDelta !==
          0
        ) {
          return blockDelta;
        }

        return left.id.localeCompare(
          right.id
        );
      }
    )
    .slice(
      0,
      maxEvents
    );

  const anySourceAvailable =
    input.transactionsAvailable ||
    (
      input.transfersRequested &&
      input.transfersAvailable
    );

  if (!anySourceAvailable) {
    return {
      status:
        "unavailable",

      limitation:
        "Recent EVM transaction and transfer evidence was unavailable.",

      events: [],

      evidenceWindow: {
        transactionCount:
          input.transactions.length,

        transferCount:
          input.transfers.length,

        maxEvents,
      },
    };
  }

  const limitations:
    string[] = [];

  if (
    !input.transactionsAvailable
  ) {
    limitations.push(
      "Transaction history evidence was unavailable."
    );
  } else if (
    !input.transactionExhausted
  ) {
    limitations.push(
      "Transaction history was bounded to the current provider page."
    );
  }

  if (
    input.transfersRequested
  ) {
    if (
      !input.transfersAvailable
    ) {
      limitations.push(
        "ERC-20 transfer evidence was unavailable."
      );
    } else if (
      !input.transferExhausted
    ) {
      limitations.push(
        "ERC-20 transfer history was bounded to the current provider page."
      );
    }
  }

  return {
    status:
      limitations.length >
      0
        ? "limited"
        : "complete",

    limitation:
      limitations.length >
      0
        ? `${limitations.join(
            " "
          )} Timeline events are bounded evidence and should not be interpreted as exhaustive activity history.`
        : null,

    events,

    evidenceWindow: {
      transactionCount:
        input.transactions.length,

      transferCount:
        input.transfers.length,

      maxEvents,
    },
  };
}


type BuildBitcoinActivityTimelineInput = {
  transactions:
    readonly {
      transactionHash:
        string;

      blockHeight:
        number | null;

      timestamp:
        string | null;
    }[];

  nextCursor:
    string | null;

  maxEvents?:
    number;
};

export function buildBitcoinActivityTimeline(
  input:
    BuildBitcoinActivityTimelineInput
): ActivityTimeline {
  const maxEvents =
    Math.min(
      25,
      Math.max(
        1,
        input.maxEvents ??
          12
      )
    );

  const events =
    input.transactions
      .map(
        (
          transaction,
          index
        ): ActivityTimelineEvent => ({
          id:
            `bitcoin-tx:${transaction.transactionHash}:${index}`,

          timestamp:
            transaction.timestamp,

          blockNumber:
            transaction.blockHeight,

          kind:
            "transaction",

          direction:
            "observed",

          from:
            null,

          to:
            null,

          counterparty:
            null,

          asset:
            null,

          assetAddress:
            null,

          rawValue:
            null,

          formattedValue:
            null,

          transactionHash:
            transaction.transactionHash,

          evidenceState:
            "SUPPORTED",

          whyItMatters:
            "This transaction was observed in the bounded Bitcoin address-history evidence.",
        })
      )
      .sort(
        (
          left,
          right
        ) => {
          const timeDelta =
            eventTime(
              right.timestamp
            ) -
            eventTime(
              left.timestamp
            );

          if (
            timeDelta !==
            0
          ) {
            return timeDelta;
          }

          return (
            (
              right.blockNumber ??
              -1
            ) -
            (
              left.blockNumber ??
              -1
            )
          );
        }
      )
      .slice(
        0,
        maxEvents
      );

  const paginationNote =
    input.nextCursor !==
      null
      ? " Additional provider pages are available."
      : "";

  return {
    status:
      "limited",

    limitation:
      "Bitcoin activity is bounded to the address-history provider page collected by AYZO and is not exhaustive." +
      paginationNote,

    events,

    evidenceWindow: {
      transactionCount:
        input.transactions.length,

      transferCount:
        0,

      maxEvents,
    },
  };
}


type BuildSolanaFundingActivityTimelineInput = {
  funding:
    | {
        ok:
          true;

        walletsAnalyzed:
          number;

        incomingTransfersDetected:
          number;

        sharedFundingSourcesDetected:
          number;

        perWallet:
          readonly {
            wallet:
              string;

            recentIncomingTransfers:
              readonly {
                source:
                  string;

                sol:
                  number;

                signature:
                  string;

                destination?:
                  string;

                blockTime?:
                  number | null;

                lamports?:
                  string;
              }[];
          }[];
      }
    | null;

  maxEvents?:
    number;
};

function solanaTimestamp(
  blockTime:
    number | null | undefined
) {
  if (
    typeof blockTime !==
      "number" ||
    !Number.isFinite(
      blockTime
    ) ||
    blockTime <=
      0
  ) {
    return null;
  }

  return new Date(
    blockTime *
      1000
  ).toISOString();
}

export function buildSolanaFundingActivityTimeline(
  input:
    BuildSolanaFundingActivityTimelineInput
): ActivityTimeline {
  const maxEvents =
    Math.min(
      25,
      Math.max(
        1,
        input.maxEvents ??
          12
      )
    );

  if (!input.funding) {
    return {
      status:
        "unavailable",

      limitation:
        "Recent Solana funding evidence was unavailable for this analysis.",

      events: [],

      evidenceWindow: {
        transactionCount:
          0,

        transferCount:
          0,

        maxEvents,
      },
    };
  }

  const events:
    ActivityTimelineEvent[] = [];

  for (
    const wallet of
    input.funding.perWallet
  ) {
    for (
      let index = 0;
      index <
      wallet
        .recentIncomingTransfers
        .length;
      index += 1
    ) {
      const transfer =
        wallet
          .recentIncomingTransfers[
            index
          ];

      const destination =
        transfer.destination ??
        wallet.wallet;

      events.push({
        id:
          `solana-funding:${transfer.signature}:${destination}:${index}`,

        timestamp:
          solanaTimestamp(
            transfer.blockTime
          ),

        blockNumber:
          null,

        kind:
          "funding_transfer",

        direction:
          "incoming",

        from:
          transfer.source,

        to:
          destination,

        counterparty:
          transfer.source,

        asset:
          "SOL",

        assetAddress:
          null,

        rawValue:
          transfer.lamports ??
          String(
            transfer.sol
          ),

        formattedValue:
          Number.isFinite(
            transfer.sol
          )
            ? String(
                transfer.sol
              )
            : null,

        transactionHash:
          transfer.signature,

        evidenceState:
          "SUPPORTED",

        whyItMatters:
          "An analyzed holder wallet recently received direct SOL funding from this source.",
      });
    }
  }

  events.sort(
    (
      left,
      right
    ) =>
      eventTime(
        right.timestamp
      ) -
      eventTime(
        left.timestamp
      )
  );

  return {
    status:
      "limited",

    limitation:
      "Solana timeline evidence is limited to recent direct SOL funding transfers observed for the analyzed holder-wallet set. It does not represent exhaustive token or wallet activity and does not establish common ownership.",

    events:
      events.slice(
        0,
        maxEvents
      ),

    evidenceWindow: {
      transactionCount:
        input.funding
          .incomingTransfersDetected,

      transferCount:
        0,

      maxEvents,
    },
  };
}
