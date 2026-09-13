import type {
  EvmTransaction,
  EvmTransfer,
} from "./types";

export const EVM_MARKET_FLOW_SCHEMA_VERSION =
  1 as const;

export type EvmMarketFlowDirection =
  | "incoming"
  | "outgoing"
  | "self";

export type EvmMarketFlowEvidenceKind =
  | "native_transaction"
  | "token_transfer";

export type EvmMarketFlowDominantDirection =
  | "incoming"
  | "outgoing"
  | "balanced"
  | "none";

export type EvmMarketFlowEvidence = {
  kind:
    EvmMarketFlowEvidenceKind;

  direction:
    EvmMarketFlowDirection;

  transactionHash:
    string;

  blockNumber:
    number | null;

  timestamp:
    string | null;

  from:
    string | null;

  to:
    string | null;

  counterparty:
    string | null;

  assetAddress:
    string | null;

  rawValue:
    string | null;
};

export type EvmMarketFlowCounterparty = {
  address:
    string;

  incomingObservationCount:
    number;

  outgoingObservationCount:
    number;

  totalObservationCount:
    number;

  firstObservedAt:
    string | null;

  lastObservedAt:
    string | null;

  evidenceTransactionHashes:
    readonly string[];
};

export type EvmMarketFlowAsset = {
  kind:
    | "native"
    | "token";

  assetAddress:
    string | null;

  incomingObservationCount:
    number;

  outgoingObservationCount:
    number;

  totalObservationCount:
    number;
};

export type EvmMarketFlowIntelligence = {
  schemaVersion:
    typeof EVM_MARKET_FLOW_SCHEMA_VERSION;

  dominantDirection:
    EvmMarketFlowDominantDirection;

  incomingObservationCount:
    number;

  outgoingObservationCount:
    number;

  selfObservationCount:
    number;

  totalDirectionalObservationCount:
    number;

  uniqueCounterpartyCount:
    number;

  /*
   * Observation concentration only.
   * This is NOT value concentration.
   */
  topCounterpartyObservationShare:
    number | null;

  firstObservedAt:
    string | null;

  lastObservedAt:
    string | null;

  counterparties:
    readonly EvmMarketFlowCounterparty[];

  assets:
    readonly EvmMarketFlowAsset[];

  recentFlows:
    readonly EvmMarketFlowEvidence[];

  evidenceWindow: {
    transactionCount:
      number;

    transferCount:
      number;

    transactionsAvailable:
      boolean;

    transfersAvailable:
      boolean;

    transactionExhausted:
      boolean;

    transferExhausted:
      boolean;
  };

  methodology:
    string;

  limitation:
    string;
};

export type BuildEvmMarketFlowInput = {
  analyzedAddress:
    string;

  transactions:
    readonly EvmTransaction[];

  transfers:
    readonly EvmTransfer[];

  transactionsAvailable:
    boolean;

  transfersAvailable:
    boolean;

  transactionExhausted:
    boolean;

  transferExhausted:
    boolean;

  maxCounterparties?:
    number;

  maxRecentFlows?:
    number;
};

type CounterpartyAccumulator = {
  incoming:
    number;

  outgoing:
    number;

  timestamps:
    string[];

  hashes:
    Set<string>;
};

type AssetAccumulator = {
  kind:
    | "native"
    | "token";

  assetAddress:
    string | null;

  incoming:
    number;

  outgoing:
    number;
};

const EVM_ADDRESS =
  /^0x[0-9a-f]{40}$/;

function normalizeAddress(
  value:
    string | null
): string | null {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  return EVM_ADDRESS.test(
    normalized
  )
    ? normalized
    : null;
}

function normalizeHash(
  value:
    string
): string | null {
  const normalized =
    value
      .trim()
      .toLowerCase();

  return normalized ||
    null;
}

function validTimestamp(
  value:
    string | null
): string | null {
  if (!value) {
    return null;
  }

  return Number.isFinite(
    Date.parse(
      value
    )
  )
    ? value
    : null;
}

function timestampMs(
  value:
    string | null
): number {
  const timestamp =
    validTimestamp(
      value
    );

  return timestamp
    ? Date.parse(
        timestamp
      )
    : Number.NEGATIVE_INFINITY;
}

function observedRange(
  timestamps:
    readonly string[]
) {
  const sorted =
    timestamps
      .map(
        value => ({
          value,
          ms:
            Date.parse(
              value
            ),
        })
      )
      .filter(
        item =>
          Number.isFinite(
            item.ms
          )
      )
      .sort(
        (
          left,
          right
        ) =>
          left.ms -
          right.ms
      );

  return {
    first:
      sorted[0]
        ?.value ??
      null,

    last:
      sorted[
        sorted.length -
        1
      ]?.value ??
      null,
  };
}

function directionFor(
  from:
    string | null,
  to:
    string | null,
  analyzedAddress:
    string
):
  | {
      direction:
        EvmMarketFlowDirection;

      from:
        string | null;

      to:
        string | null;

      counterparty:
        string | null;
    }
  | null {
  const normalizedFrom =
    normalizeAddress(
      from
    );

  const normalizedTo =
    normalizeAddress(
      to
    );

  const fromTarget =
    normalizedFrom ===
      analyzedAddress;

  const toTarget =
    normalizedTo ===
      analyzedAddress;

  if (
    fromTarget &&
    toTarget
  ) {
    return {
      direction:
        "self",

      from:
        normalizedFrom,

      to:
        normalizedTo,

      counterparty:
        null,
    };
  }

  if (toTarget) {
    return {
      direction:
        "incoming",

      from:
        normalizedFrom,

      to:
        normalizedTo,

      counterparty:
        normalizedFrom,
    };
  }

  if (fromTarget) {
    return {
      direction:
        "outgoing",

      from:
        normalizedFrom,

      to:
        normalizedTo,

      counterparty:
        normalizedTo,
    };
  }

  return null;
}

function dominantDirection(
  incoming:
    number,
  outgoing:
    number
):
  EvmMarketFlowDominantDirection {
  if (
    incoming === 0 &&
    outgoing === 0
  ) {
    return "none";
  }

  if (
    incoming ===
    outgoing
  ) {
    return "balanced";
  }

  return incoming >
    outgoing
    ? "incoming"
    : "outgoing";
}

export function buildEvmMarketFlowIntelligence(
  input:
    BuildEvmMarketFlowInput
): EvmMarketFlowIntelligence {
  const analyzedAddress =
    normalizeAddress(
      input.analyzedAddress
    );

  if (!analyzedAddress) {
    throw new Error(
      "Market Flow Intelligence requires a valid EVM address."
    );
  }

  const maxCounterparties =
    Math.max(
      1,
      Math.min(
        input.maxCounterparties ??
          10,
        25
      )
    );

  const maxRecentFlows =
    Math.max(
      1,
      Math.min(
        input.maxRecentFlows ??
          12,
        50
      )
    );

  const observations:
    EvmMarketFlowEvidence[] =
      [];

  const counterparties =
    new Map<
      string,
      CounterpartyAccumulator
    >();

  const assets =
    new Map<
      string,
      AssetAccumulator
    >();

  let incoming =
    0;

  let outgoing =
    0;

  let self =
    0;

  function record(
    evidence:
      EvmMarketFlowEvidence
  ) {
    observations.push(
      evidence
    );

    if (
      evidence.direction ===
        "self"
    ) {
      self += 1;
      return;
    }

    if (
      evidence.direction ===
        "incoming"
    ) {
      incoming += 1;
    } else {
      outgoing += 1;
    }

    if (
      evidence.counterparty
    ) {
      const current =
        counterparties.get(
          evidence.counterparty
        ) ?? {
          incoming: 0,
          outgoing: 0,
          timestamps: [],
          hashes:
            new Set<string>(),
        };

      if (
        evidence.direction ===
          "incoming"
      ) {
        current.incoming +=
          1;
      } else {
        current.outgoing +=
          1;
      }

      if (
        evidence.timestamp
      ) {
        current.timestamps.push(
          evidence.timestamp
        );
      }

      current.hashes.add(
        evidence.transactionHash
      );

      counterparties.set(
        evidence.counterparty,
        current
      );
    }

    const assetKey =
      evidence.kind ===
        "native_transaction"
        ? "native"
        : `token:${evidence.assetAddress ?? "unknown"}`;

    const currentAsset =
      assets.get(
        assetKey
      ) ?? {
        kind:
          evidence.kind ===
            "native_transaction"
            ? "native"
            : "token",

        assetAddress:
          evidence.kind ===
            "native_transaction"
            ? null
            : evidence.assetAddress,

        incoming: 0,
        outgoing: 0,
      };

    if (
      evidence.direction ===
        "incoming"
    ) {
      currentAsset.incoming +=
        1;
    } else {
      currentAsset.outgoing +=
        1;
    }

    assets.set(
      assetKey,
      currentAsset
    );
  }

  for (
    const transaction of
      input.transactions
  ) {
    const hash =
      normalizeHash(
        transaction.hash
      );

    const direction =
      directionFor(
        transaction.from,
        transaction.to,
        analyzedAddress
      );

    if (
      !hash ||
      !direction
    ) {
      continue;
    }

    record({
      kind:
        "native_transaction",

      direction:
        direction.direction,

      transactionHash:
        hash,

      blockNumber:
        transaction.blockNumber,

      timestamp:
        validTimestamp(
          transaction.timestamp
        ),

      from:
        direction.from,

      to:
        direction.to,

      counterparty:
        direction.counterparty,

      assetAddress:
        null,

      rawValue:
        transaction.value,
    });
  }

  for (
    const transfer of
      input.transfers
  ) {
    const hash =
      normalizeHash(
        transfer.transactionHash
      );

    const direction =
      directionFor(
        transfer.from,
        transfer.to,
        analyzedAddress
      );

    if (
      !hash ||
      !direction
    ) {
      continue;
    }

    record({
      kind:
        "token_transfer",

      direction:
        direction.direction,

      transactionHash:
        hash,

      blockNumber:
        transfer.blockNumber,

      timestamp:
        validTimestamp(
          transfer.timestamp
        ),

      from:
        direction.from,

      to:
        direction.to,

      counterparty:
        direction.counterparty,

      assetAddress:
        normalizeAddress(
          transfer.tokenAddress
        ),

      rawValue:
        transfer.value,
    });
  }

  const rankedCounterparties =
    Array.from(
      counterparties.entries()
    )
      .map(
        ([
          address,
          value,
        ]) => {
          const range =
            observedRange(
              value.timestamps
            );

          return {
            address,

            incomingObservationCount:
              value.incoming,

            outgoingObservationCount:
              value.outgoing,

            totalObservationCount:
              value.incoming +
              value.outgoing,

            firstObservedAt:
              range.first,

            lastObservedAt:
              range.last,

            evidenceTransactionHashes:
              Array.from(
                value.hashes
              ).sort(),
          };
        }
      )
      .sort(
        (
          left,
          right
        ) =>
          right.totalObservationCount -
            left.totalObservationCount ||
          right.incomingObservationCount -
            left.incomingObservationCount ||
          left.address.localeCompare(
            right.address
          )
      );

  const rankedAssets =
    Array.from(
      assets.values()
    )
      .map(
        asset => ({
          kind:
            asset.kind,

          assetAddress:
            asset.assetAddress,

          incomingObservationCount:
            asset.incoming,

          outgoingObservationCount:
            asset.outgoing,

          totalObservationCount:
            asset.incoming +
            asset.outgoing,
        })
      )
      .sort(
        (
          left,
          right
        ) =>
          right.totalObservationCount -
            left.totalObservationCount ||
          (
            left.assetAddress ??
            ""
          ).localeCompare(
            right.assetAddress ??
              ""
          )
      );

  const recentFlows =
    [...observations]
      .sort(
        (
          left,
          right
        ) =>
          timestampMs(
            right.timestamp
          ) -
            timestampMs(
              left.timestamp
            ) ||
          (
            right.blockNumber ??
            -1
          ) -
            (
              left.blockNumber ??
              -1
            ) ||
          left.transactionHash.localeCompare(
            right.transactionHash
          )
      )
      .slice(
        0,
        maxRecentFlows
      );

  const range =
    observedRange(
      observations
        .map(
          observation =>
            observation.timestamp
        )
        .filter(
          (
            value
          ): value is string =>
            value !== null
        )
    );

  const totalDirectional =
    incoming +
    outgoing;

  const topCounterparty =
    rankedCounterparties[0];

  const topCounterpartyObservationShare =
    topCounterparty &&
    totalDirectional >
      0
      ? Number(
          (
            topCounterparty
              .totalObservationCount /
            totalDirectional
          ).toFixed(
            4
          )
        )
      : null;

  const bounded =
    !input.transactionExhausted ||
    (
      input.transfersAvailable &&
      !input.transferExhausted
    );

  return {
    schemaVersion:
      EVM_MARKET_FLOW_SCHEMA_VERSION,

    dominantDirection:
      dominantDirection(
        incoming,
        outgoing
      ),

    incomingObservationCount:
      incoming,

    outgoingObservationCount:
      outgoing,

    selfObservationCount:
      self,

    totalDirectionalObservationCount:
      totalDirectional,

    uniqueCounterpartyCount:
      counterparties.size,

    topCounterpartyObservationShare,

    firstObservedAt:
      range.first,

    lastObservedAt:
      range.last,

    counterparties:
      rankedCounterparties.slice(
        0,
        maxCounterparties
      ),

    assets:
      rankedAssets,

    recentFlows,

    evidenceWindow: {
      transactionCount:
        input.transactions.length,

      transferCount:
        input.transfers.length,

      transactionsAvailable:
        input.transactionsAvailable,

      transfersAvailable:
        input.transfersAvailable,

      transactionExhausted:
        input.transactionExhausted,

      transferExhausted:
        input.transferExhausted,
    },

    methodology:
      "Market Flow Intelligence classifies observed EVM transaction and token-transfer evidence relative to the analyzed address. Counts are evidence observations, not monetary totals. AYZO never combines raw values from different assets.",

    limitation:
      bounded
        ? "Market Flow Intelligence uses a bounded evidence window and must not be interpreted as exhaustive wallet history, total economic flow, or fiat value."
        : "Market Flow Intelligence reflects only evidence returned by the current analysis window and does not estimate fiat value.",
  };
}
