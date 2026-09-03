import {
  resolveEvmEntityAttribution,
  type EvmEntityAttribution,
  type EvmEntityEvidence,
} from "./entityAttribution";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

const TX_HASH =
  /^0x[0-9a-fA-F]{64}$/;

const MIN_TARGET_WALLETS = 2;
const MAX_TARGET_WALLETS = 10;

export type EvmCoordinationEvidenceKind =
  | "evm_transaction"
  | "erc20_transfer";

export type EvmCoordinationSignalKind =
  | "shared_funder"
  | "shared_counterparty"
  | "direct_interaction"
  | "same_transaction"
  | "shared_token_activity";

export type EvmCoordinationSignalClass =
  | "direct"
  | "corroborating";

type EvmCoordinationObservationBase = {
  transactionHash: string;
  blockNumber: number | null;
  timestamp: string | null;
  from: string;
  to: string;
};

export type EvmTransactionCoordinationObservation =
  EvmCoordinationObservationBase & {
    kind: "evm_transaction";
    rawValue: string | null;
  };

export type EvmTransferCoordinationObservation =
  EvmCoordinationObservationBase & {
    kind: "erc20_transfer";
    tokenAddress: string;
    rawValue: string;
  };

export type EvmCoordinationObservation =
  | EvmTransactionCoordinationObservation
  | EvmTransferCoordinationObservation;

export type EvmTransactionCoordinationInput = {
  hash: string;
  blockNumber: number | null;
  timestamp: string | null;
  from: string | null;
  to: string | null;
  value: string | null;
};

export type EvmTransferCoordinationInput = {
  transactionHash: string;
  blockNumber: number | null;
  timestamp: string | null;
  from: string;
  to: string;
  tokenAddress: string;
  value: string;
};

export type EvmCoordinationCoverage = {
  includesEvmTransactions: boolean;
  includesErc20Transfers: boolean;

  includesSharedFunding: true;
  includesSharedCounterparties: true;
  includesDirectInteractions: true;
  includesSameTransaction: true;
  includesSharedTokenActivity: boolean;

  includesTemporalCorrelation: false;
  includesOwnershipInference: false;

  limitation: string;
};

export type EvmCoordinationSignal = {
  rank: number;

  kind:
    EvmCoordinationSignalKind;

  signalClass:
    EvmCoordinationSignalClass;

  wallets:
    readonly string[];

  externalAddress:
    string | null;

  externalAttribution:
    EvmEntityAttribution | null;

  tokenAddress:
    string | null;

  evidenceKinds:
    readonly EvmCoordinationEvidenceKind[];

  evidenceObservationCount:
    number;

  evidenceTransactionHashes:
    readonly string[];

  firstSeen:
    string | null;

  lastSeen:
    string | null;
};

export type EvmCoordinatedWalletBehavior = {
  targetWallets:
    readonly string[];

  targetWalletCount:
    number;

  inputEvidenceCount:
    number;

  acceptedEvidenceCount:
    number;

  duplicateEvidenceCount:
    number;

  ignoredEvidenceCount:
    number;

  signalCount:
    number;

  directSignalCount:
    number;

  corroboratingSignalCount:
    number;

  corroboratedSignalCount:
    number;

  signalsByKind: {
    sharedFunder: number;
    sharedCounterparty: number;
    directInteraction: number;
    sameTransaction: number;
    sharedTokenActivity: number;
  };

  evidenceTransactionHashes:
    readonly string[];

  firstSeen:
    string | null;

  lastSeen:
    string | null;

  signals:
    readonly EvmCoordinationSignal[];

  coverage:
    EvmCoordinationCoverage;
};

export type AnalyzeEvmCoordinatedWalletBehaviorRequest = {
  walletAddresses:
    readonly string[];

  observations:
    readonly EvmCoordinationObservation[];

  coverage:
    EvmCoordinationCoverage;

  entityEvidence?:
    readonly EvmEntityEvidence[];
};

type SeenRange = {
  firstSeen: string | null;
  firstSeenMs: number | null;
  lastSeen: string | null;
  lastSeenMs: number | null;
};

type SignalAccumulator =
  SeenRange & {
    kind:
      EvmCoordinationSignalKind;

    signalClass:
      EvmCoordinationSignalClass;

    wallets:
      Set<string>;

    externalAddress:
      string | null;

    tokenAddress:
      string | null;

    evidenceKinds:
      Set<EvmCoordinationEvidenceKind>;

    evidenceTransactionHashes:
      Set<string>;

    evidenceObservationKeys:
      Set<string>;
  };

type NormalizedObservation = {
  kind:
    EvmCoordinationEvidenceKind;

  transactionHash: string;
  blockNumber: number | null;
  timestamp: string | null;
  from: string;
  to: string;

  tokenAddress:
    string | null;

  rawValue:
    string | null;
};

function normalizeAddress(
  value: string
): string | null {
  const normalized =
    value.trim().toLowerCase();

  return EVM_ADDRESS.test(
    normalized
  )
    ? normalized
    : null;
}

function normalizeHash(
  value: string
): string | null {
  const normalized =
    value.trim().toLowerCase();

  return TX_HASH.test(
    normalized
  )
    ? normalized
    : null;
}

function normalizeRawValue(
  value: string | null
): string | null {
  if (value === null) {
    return null;
  }

  const normalized =
    value.trim();

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  try {
    return BigInt(
      normalized
    ).toString();
  } catch {
    return null;
  }
}

function isPositiveRawValue(
  value: string | null
): boolean {
  if (value === null) {
    return false;
  }

  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
}

function emptySeenRange():
  SeenRange {
  return {
    firstSeen: null,
    firstSeenMs: null,
    lastSeen: null,
    lastSeenMs: null,
  };
}

function includeTimestamp(
  range: SeenRange,
  timestamp: string | null
) {
  if (!timestamp) {
    return;
  }

  const ms =
    Date.parse(timestamp);

  if (!Number.isFinite(ms)) {
    return;
  }

  if (
    range.firstSeenMs === null ||
    ms < range.firstSeenMs
  ) {
    range.firstSeenMs = ms;
    range.firstSeen =
      timestamp;
  }

  if (
    range.lastSeenMs === null ||
    ms > range.lastSeenMs
  ) {
    range.lastSeenMs = ms;
    range.lastSeen =
      timestamp;
  }
}

function normalizeObservation(
  observation:
    EvmCoordinationObservation
): NormalizedObservation | null {
  const transactionHash =
    normalizeHash(
      observation.transactionHash
    );

  const from =
    normalizeAddress(
      observation.from
    );

  const to =
    normalizeAddress(
      observation.to
    );

  if (
    !transactionHash ||
    !from ||
    !to
  ) {
    return null;
  }

  if (
    observation.kind ===
      "evm_transaction"
  ) {
    const rawValue =
      observation.rawValue === null
        ? null
        : normalizeRawValue(
            observation.rawValue
          );

    if (
      observation.rawValue !== null &&
      rawValue === null
    ) {
      return null;
    }

    return {
      kind:
        observation.kind,

      transactionHash,
      blockNumber:
        observation.blockNumber,
      timestamp:
        observation.timestamp,
      from,
      to,
      tokenAddress:
        null,
      rawValue,
    };
  }

  const tokenAddress =
    normalizeAddress(
      observation.tokenAddress
    );

  const rawValue =
    normalizeRawValue(
      observation.rawValue
    );

  if (
    !tokenAddress ||
    rawValue === null
  ) {
    return null;
  }

  return {
    kind:
      observation.kind,

    transactionHash,
    blockNumber:
      observation.blockNumber,
    timestamp:
      observation.timestamp,
    from,
    to,
    tokenAddress,
    rawValue,
  };
}

function observationKey(
  observation:
    NormalizedObservation
): string {
  return [
    observation.kind,
    observation.transactionHash,
    observation.from,
    observation.to,
    observation.tokenAddress ??
      "",
    observation.rawValue ??
      "",
  ].join(":");
}

function signalKey(
  kind:
    EvmCoordinationSignalKind,
  wallets:
    readonly string[],
  externalAddress:
    string | null,
  tokenAddress:
    string | null,
  transactionHash:
    string | null
): string {
  return [
    kind,
    [...wallets].sort().join(","),
    externalAddress ?? "",
    tokenAddress ?? "",
    transactionHash ?? "",
  ].join("|");
}

function getSignal(
  signals:
    Map<
      string,
      SignalAccumulator
    >,
  key: string,
  kind:
    EvmCoordinationSignalKind,
  signalClass:
    EvmCoordinationSignalClass,
  externalAddress:
    string | null,
  tokenAddress:
    string | null
): SignalAccumulator {
  const existing =
    signals.get(key);

  if (existing) {
    return existing;
  }

  const created:
    SignalAccumulator = {
    kind,
    signalClass,
    wallets:
      new Set(),
    externalAddress,
    tokenAddress,
    evidenceKinds:
      new Set(),
    evidenceTransactionHashes:
      new Set(),
    evidenceObservationKeys:
      new Set(),
    ...emptySeenRange(),
  };

  signals.set(
    key,
    created
  );

  return created;
}

function addSignalEvidence(
  signal:
    SignalAccumulator,
  observation:
    NormalizedObservation,
  wallets:
    readonly string[]
) {
  for (
    const wallet of wallets
  ) {
    signal.wallets.add(
      wallet
    );
  }

  signal.evidenceKinds.add(
    observation.kind
  );

  signal
    .evidenceTransactionHashes
    .add(
      observation.transactionHash
    );

  signal
    .evidenceObservationKeys
    .add(
      observationKey(
        observation
      )
    );

  includeTimestamp(
    signal,
    observation.timestamp
  );
}

function addSignalEvidenceBatch(
  signal:
    SignalAccumulator,
  observations:
    readonly NormalizedObservation[],
  wallets:
    readonly string[]
) {
  for (
    const observation of
      observations
  ) {
    addSignalEvidence(
      signal,
      observation,
      wallets
    );
  }
}

function signalPriority(
  kind:
    EvmCoordinationSignalKind
): number {
  switch (kind) {
    case "direct_interaction":
      return 0;

    case "same_transaction":
      return 1;

    case "shared_funder":
      return 2;

    case "shared_counterparty":
      return 3;

    case "shared_token_activity":
      return 4;
  }
}

export function evmTransactionsToCoordinationObservations(
  transactions:
    readonly EvmTransactionCoordinationInput[]
): readonly EvmTransactionCoordinationObservation[] {
  const observations:
    EvmTransactionCoordinationObservation[] =
      [];

  for (
    const transaction of
      transactions
  ) {
    if (
      transaction.from === null ||
      transaction.to === null
    ) {
      continue;
    }

    observations.push({
      kind:
        "evm_transaction",

      transactionHash:
        transaction.hash,

      blockNumber:
        transaction.blockNumber,

      timestamp:
        transaction.timestamp,

      from:
        transaction.from,

      to:
        transaction.to,

      rawValue:
        transaction.value,
    });
  }

  return observations;
}

export function evmTransfersToCoordinationObservations(
  transfers:
    readonly EvmTransferCoordinationInput[]
): readonly EvmTransferCoordinationObservation[] {
  return transfers.map(
    transfer => ({
      kind:
        "erc20_transfer",

      transactionHash:
        transfer.transactionHash,

      blockNumber:
        transfer.blockNumber,

      timestamp:
        transfer.timestamp,

      from:
        transfer.from,

      to:
        transfer.to,

      tokenAddress:
        transfer.tokenAddress,

      rawValue:
        transfer.value,
    })
  );
}

export function analyzeEvmCoordinatedWalletBehavior(
  request:
    AnalyzeEvmCoordinatedWalletBehaviorRequest
): EvmCoordinatedWalletBehavior {
  const normalizedTargets =
    request.walletAddresses
      .map(normalizeAddress)
      .filter(
        (
          address
        ): address is string =>
          address !== null
      );

  const targetWallets =
    [
      ...new Set(
        normalizedTargets
      ),
    ].sort();

  if (
    targetWallets.length <
      MIN_TARGET_WALLETS ||
    targetWallets.length >
      MAX_TARGET_WALLETS
  ) {
    throw new Error(
      `Expected between ${MIN_TARGET_WALLETS} and ${MAX_TARGET_WALLETS} unique valid EVM target wallets.`
    );
  }

  const targetSet =
    new Set(
      targetWallets
    );

  const acceptedObservations:
    NormalizedObservation[] =
      [];

  const seenEvidence =
    new Set<string>();

  let duplicateEvidenceCount = 0;
  let ignoredEvidenceCount = 0;

  const overallRange =
    emptySeenRange();

  for (
    const raw of
      request.observations
  ) {
    const observation =
      normalizeObservation(raw);

    if (!observation) {
      ignoredEvidenceCount += 1;
      continue;
    }

    const fromTarget =
      targetSet.has(
        observation.from
      );

    const toTarget =
      targetSet.has(
        observation.to
      );

    if (
      !fromTarget &&
      !toTarget
    ) {
      ignoredEvidenceCount += 1;
      continue;
    }

    const key =
      observationKey(
        observation
      );

    if (
      seenEvidence.has(key)
    ) {
      duplicateEvidenceCount +=
        1;
      continue;
    }

    seenEvidence.add(key);

    acceptedObservations.push(
      observation
    );

    includeTimestamp(
      overallRange,
      observation.timestamp
    );
  }

  const signals =
    new Map<
      string,
      SignalAccumulator
    >();

  const byTransaction =
    new Map<
      string,
      {
        wallets:
          Set<string>;
        observations:
          NormalizedObservation[];
      }
    >();

  const byCounterparty =
    new Map<
      string,
      {
        wallets:
          Set<string>;
        observations:
          NormalizedObservation[];
      }
    >();

  const byFunder =
    new Map<
      string,
      {
        wallets:
          Set<string>;
        observations:
          NormalizedObservation[];
      }
    >();

  const byToken =
    new Map<
      string,
      {
        wallets:
          Set<string>;
        observations:
          NormalizedObservation[];
      }
    >();

  for (
    const observation of
      acceptedObservations
  ) {
    const fromTarget =
      targetSet.has(
        observation.from
      );

    const toTarget =
      targetSet.has(
        observation.to
      );

    const transactionBucket =
      byTransaction.get(
        observation.transactionHash
      ) ?? {
        wallets:
          new Set<string>(),
        observations: [],
      };

    if (fromTarget) {
      transactionBucket.wallets.add(
        observation.from
      );
    }

    if (toTarget) {
      transactionBucket.wallets.add(
        observation.to
      );
    }

    transactionBucket
      .observations
      .push(
        observation
      );

    byTransaction.set(
      observation.transactionHash,
      transactionBucket
    );

    if (
      fromTarget &&
      toTarget &&
      observation.from !==
        observation.to
    ) {
      const pair = [
        observation.from,
        observation.to,
      ].sort();

      const key =
        signalKey(
          "direct_interaction",
          pair,
          null,
          observation.tokenAddress,
          null
        );

      const signal =
        getSignal(
          signals,
          key,
          "direct_interaction",
          "direct",
          null,
          observation.tokenAddress
        );

      addSignalEvidence(
        signal,
        observation,
        pair
      );
    }

    if (
      fromTarget !==
      toTarget
    ) {
      const targetWallet =
        fromTarget
          ? observation.from
          : observation.to;

      const counterparty =
        fromTarget
          ? observation.to
          : observation.from;

      if (
        !targetSet.has(
          counterparty
        )
      ) {
        const bucket =
          byCounterparty.get(
            counterparty
          ) ?? {
            wallets:
              new Set<string>(),
            observations: [],
          };

        bucket.wallets.add(
          targetWallet
        );

        bucket
          .observations
          .push(
            observation
          );

        byCounterparty.set(
          counterparty,
          bucket
        );
      }
    }

    if (
      toTarget &&
      !fromTarget &&
      isPositiveRawValue(
        observation.rawValue
      )
    ) {
      const bucket =
        byFunder.get(
          observation.from
        ) ?? {
          wallets:
            new Set<string>(),
          observations: [],
        };

      bucket.wallets.add(
        observation.to
      );

      bucket
        .observations
        .push(
          observation
        );

      byFunder.set(
        observation.from,
        bucket
      );
    }

    if (
      observation.kind ===
        "erc20_transfer" &&
      observation.tokenAddress
    ) {
      const bucket =
        byToken.get(
          observation.tokenAddress
        ) ?? {
          wallets:
            new Set<string>(),
          observations: [],
        };

      if (fromTarget) {
        bucket.wallets.add(
          observation.from
        );
      }

      if (toTarget) {
        bucket.wallets.add(
          observation.to
        );
      }

      bucket
        .observations
        .push(
          observation
        );

      byToken.set(
        observation.tokenAddress,
        bucket
      );
    }
  }

  for (
    const [
      transactionHash,
      bucket,
    ] of byTransaction
  ) {
    if (
      bucket.wallets.size < 2
    ) {
      continue;
    }

    const wallets =
      [...bucket.wallets]
        .sort();

    const key =
      signalKey(
        "same_transaction",
        wallets,
        null,
        null,
        transactionHash
      );

    const signal =
      getSignal(
        signals,
        key,
        "same_transaction",
        "direct",
        null,
        null
      );

    addSignalEvidenceBatch(
      signal,
      bucket.observations,
      wallets
    );
  }

  for (
    const [
      counterparty,
      bucket,
    ] of byCounterparty
  ) {
    if (
      bucket.wallets.size < 2
    ) {
      continue;
    }

    const wallets =
      [...bucket.wallets]
        .sort();

    const key =
      signalKey(
        "shared_counterparty",
        wallets,
        counterparty,
        null,
        null
      );

    const signal =
      getSignal(
        signals,
        key,
        "shared_counterparty",
        "corroborating",
        counterparty,
        null
      );

    addSignalEvidenceBatch(
      signal,
      bucket.observations,
      wallets
    );
  }

  for (
    const [
      funder,
      bucket,
    ] of byFunder
  ) {
    if (
      bucket.wallets.size < 2
    ) {
      continue;
    }

    const wallets =
      [...bucket.wallets]
        .sort();

    const key =
      signalKey(
        "shared_funder",
        wallets,
        funder,
        null,
        null
      );

    const signal =
      getSignal(
        signals,
        key,
        "shared_funder",
        "corroborating",
        funder,
        null
      );

    addSignalEvidenceBatch(
      signal,
      bucket.observations,
      wallets
    );
  }

  for (
    const [
      tokenAddress,
      bucket,
    ] of byToken
  ) {
    if (
      bucket.wallets.size < 2
    ) {
      continue;
    }

    const wallets =
      [...bucket.wallets]
        .sort();

    const key =
      signalKey(
        "shared_token_activity",
        wallets,
        null,
        tokenAddress,
        null
      );

    const signal =
      getSignal(
        signals,
        key,
        "shared_token_activity",
        "corroborating",
        null,
        tokenAddress
      );

    addSignalEvidenceBatch(
      signal,
      bucket.observations,
      wallets
    );
  }

  const entityEvidence =
    request.entityEvidence ??
      [];

  const normalizedSignals:
    EvmCoordinationSignal[] =
      [...signals.values()]
        .filter(
          signal =>
            signal.wallets.size >=
            2
        )
        .sort(
          (a, b) =>
            signalPriority(
              a.kind
            ) -
              signalPriority(
                b.kind
              ) ||
            b.evidenceTransactionHashes
              .size -
              a.evidenceTransactionHashes
                .size ||
            [...a.wallets]
              .sort()
              .join(",")
              .localeCompare(
                [...b.wallets]
                  .sort()
                  .join(",")
              ) ||
            (
              a.externalAddress ??
              ""
            ).localeCompare(
              b.externalAddress ??
              ""
            )
        )
        .map(
          (
            signal,
            index
          ) => ({
            rank:
              index + 1,

            kind:
              signal.kind,

            signalClass:
              signal.signalClass,

            wallets:
              [...signal.wallets]
                .sort(),

            externalAddress:
              signal.externalAddress,

            externalAttribution:
              signal.externalAddress
                ? resolveEvmEntityAttribution(
                    signal.externalAddress,
                    entityEvidence
                  )
                : null,

            tokenAddress:
              signal.tokenAddress,

            evidenceKinds:
              [...signal.evidenceKinds]
                .sort(),

            evidenceObservationCount:
              signal
                .evidenceObservationKeys
                .size,

            evidenceTransactionHashes:
              [
                ...signal
                  .evidenceTransactionHashes,
              ].sort(),

            firstSeen:
              signal.firstSeen,

            lastSeen:
              signal.lastSeen,
          })
        );

  const allEvidenceHashes =
    new Set<string>();

  for (
    const signal of
      normalizedSignals
  ) {
    for (
      const hash of
        signal
          .evidenceTransactionHashes
    ) {
      allEvidenceHashes.add(
        hash
      );
    }
  }

  const countKind = (
    kind:
      EvmCoordinationSignalKind
  ) =>
    normalizedSignals.filter(
      signal =>
        signal.kind === kind
    ).length;

  return {
    targetWallets,

    targetWalletCount:
      targetWallets.length,

    inputEvidenceCount:
      request.observations.length,

    acceptedEvidenceCount:
      acceptedObservations.length,

    duplicateEvidenceCount,

    ignoredEvidenceCount,

    signalCount:
      normalizedSignals.length,

    directSignalCount:
      normalizedSignals.filter(
        signal =>
          signal.signalClass ===
          "direct"
      ).length,

    corroboratingSignalCount:
      normalizedSignals.filter(
        signal =>
          signal.signalClass ===
          "corroborating"
      ).length,

    corroboratedSignalCount:
      normalizedSignals.filter(
        signal =>
          signal
            .evidenceTransactionHashes
            .length > 1
      ).length,

    signalsByKind: {
      sharedFunder:
        countKind(
          "shared_funder"
        ),

      sharedCounterparty:
        countKind(
          "shared_counterparty"
        ),

      directInteraction:
        countKind(
          "direct_interaction"
        ),

      sameTransaction:
        countKind(
          "same_transaction"
        ),

      sharedTokenActivity:
        countKind(
          "shared_token_activity"
        ),
    },

    evidenceTransactionHashes:
      [...allEvidenceHashes]
        .sort(),

    firstSeen:
      overallRange.firstSeen,

    lastSeen:
      overallRange.lastSeen,

    signals:
      normalizedSignals,

    coverage:
      request.coverage,
  };
}
