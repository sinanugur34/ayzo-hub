import {
  resolveEvmEntityAttribution,
  type EvmEntityAttribution,
  type EvmEntityEvidence,
} from "./entityAttribution";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

const TX_HASH =
  /^0x[0-9a-fA-F]{64}$/;

export type EvmFundingEvidenceKind =
  | "evm_transaction"
  | "erc20_transfer";

export type EvmFundingCoverage = {
  includesEvmTransactions: boolean;
  includesErc20Transfers: boolean;
  includedEvidenceKinds:
    readonly EvmFundingEvidenceKind[];
  omittedEvidenceKinds:
    readonly EvmFundingEvidenceKind[];
  limitation: string | null;
};

export const FULL_FUNDING_COVERAGE:
  EvmFundingCoverage = {
  includesEvmTransactions: true,
  includesErc20Transfers: true,
  includedEvidenceKinds: [
    "evm_transaction",
    "erc20_transfer",
  ],
  omittedEvidenceKinds: [],
  limitation: null,
};

export const TRANSACTION_ONLY_FUNDING_COVERAGE:
  EvmFundingCoverage = {
  includesEvmTransactions: true,
  includesErc20Transfers: false,
  includedEvidenceKinds: [
    "evm_transaction",
  ],
  omittedEvidenceKinds: [
    "erc20_transfer",
  ],
  limitation:
    "This result covers direct EVM transaction funding only; ERC-20 transfer evidence was not requested.",
};

export type EvmTransactionFundingInput = {
  hash: string;
  blockNumber: number | null;
  timestamp: string | null;
  from: string | null;
  to: string | null;
  value: string | null;
};

export type EvmTransferFundingInput = {
  transactionHash: string;
  blockNumber: number | null;
  timestamp: string | null;
  from: string;
  to: string;
  tokenAddress: string;
  value: string;
};

export type EvmNativeFundingObservation = {
  kind: "evm_transaction";
  transactionHash: string;
  blockNumber: number | null;
  timestamp: string | null;
  from: string;
  to: string;
  rawValue: string;
};

export type EvmTokenFundingObservation = {
  kind: "erc20_transfer";
  transactionHash: string;
  blockNumber: number | null;
  timestamp: string | null;
  from: string;
  to: string;
  tokenAddress: string;
  rawValue: string;
};

export type EvmFundingObservation =
  | EvmNativeFundingObservation
  | EvmTokenFundingObservation;

export type EvmFundingTokenFlow = {
  tokenAddress: string;
  transferCount: number;
  rawValue: string;
  firstSeen: string | null;
  lastSeen: string | null;
};

export type EvmFundingSource = {
  rank: number;
  sourceAddress: string;
  attribution:
    EvmEntityAttribution;

  fundingObservationCount: number;
  evidenceTransactionCount: number;

  nativeTransactionCount: number;
  erc20TransferCount: number;

  nativeRawValue: string;

  observedTokenAddresses:
    readonly string[];

  tokenFlows:
    readonly EvmFundingTokenFlow[];

  evidenceTransactionHashes:
    readonly string[];

  firstSeen: string | null;
  lastSeen: string | null;

  repeatedFundingSource: boolean;
};

export type EvmFirstObservedFunding = {
  sourceAddress: string;
  transactionHash: string;
  timestamp: string;
  evidenceKind:
    EvmFundingEvidenceKind;
  tokenAddress: string | null;
  rawValue: string;
};

export type EvmFundingProvenanceIntelligence = {
  walletAddress: string;
  coverage:
    EvmFundingCoverage;

  inputEvidenceCount: number;
  fundingObservationCount: number;
  uniqueFundingTransactionCount: number;

  nativeFundingObservationCount: number;
  erc20FundingObservationCount: number;

  selfFundingObservationCount: number;
  ignoredEvidenceCount: number;

  fundingSourceCount: number;
  repeatedFundingSourceCount: number;

  firstSeen: string | null;
  lastSeen: string | null;

  firstObservedFunding:
    EvmFirstObservedFunding | null;

  sources:
    readonly EvmFundingSource[];
};

export type AnalyzeEvmFundingProvenanceRequest = {
  walletAddress: string;
  observations:
    readonly EvmFundingObservation[];
  coverage:
    EvmFundingCoverage;
  entityEvidence?:
    readonly EvmEntityEvidence[];
};

type SeenRange = {
  firstSeen: string | null;
  firstSeenMs: number | null;
  lastSeen: string | null;
  lastSeenMs: number | null;
};

type TokenAccumulator =
  SeenRange & {
    tokenAddress: string;
    transferCount: number;
    rawValue: bigint;
  };

type SourceAccumulator =
  SeenRange & {
    sourceAddress: string;
    fundingObservationCount: number;
    nativeTransactionCount: number;
    erc20TransferCount: number;
    nativeRawValue: bigint;

    transactionHashes:
      Set<string>;

    observedTokenAddresses:
      Set<string>;

    tokenFlows:
      Map<
        string,
        TokenAccumulator
      >;
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

function parseRawValue(
  value: string
): bigint | null {
  const normalized =
    value.trim();

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  try {
    return BigInt(normalized);
  } catch {
    return null;
  }
}

function emptySeenRange(): SeenRange {
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

  const timestampMs =
    Date.parse(timestamp);

  if (!Number.isFinite(timestampMs)) {
    return;
  }

  if (
    range.firstSeenMs === null ||
    timestampMs <
      range.firstSeenMs
  ) {
    range.firstSeen =
      timestamp;
    range.firstSeenMs =
      timestampMs;
  }

  if (
    range.lastSeenMs === null ||
    timestampMs >
      range.lastSeenMs
  ) {
    range.lastSeen =
      timestamp;
    range.lastSeenMs =
      timestampMs;
  }
}

function getSource(
  sources:
    Map<
      string,
      SourceAccumulator
    >,
  sourceAddress: string
): SourceAccumulator {
  const existing =
    sources.get(sourceAddress);

  if (existing) {
    return existing;
  }

  const created:
    SourceAccumulator = {
    sourceAddress,
    fundingObservationCount: 0,
    nativeTransactionCount: 0,
    erc20TransferCount: 0,
    nativeRawValue: 0n,
    transactionHashes:
      new Set(),
    observedTokenAddresses:
      new Set(),
    tokenFlows:
      new Map(),
    ...emptySeenRange(),
  };

  sources.set(
    sourceAddress,
    created
  );

  return created;
}

function getTokenFlow(
  source: SourceAccumulator,
  tokenAddress: string
): TokenAccumulator {
  const existing =
    source.tokenFlows.get(
      tokenAddress
    );

  if (existing) {
    return existing;
  }

  const created:
    TokenAccumulator = {
    tokenAddress,
    transferCount: 0,
    rawValue: 0n,
    ...emptySeenRange(),
  };

  source.tokenFlows.set(
    tokenAddress,
    created
  );

  return created;
}

function lastSeenRank(
  source: SourceAccumulator
): number {
  return (
    source.lastSeenMs ??
    Number.NEGATIVE_INFINITY
  );
}

function normalizeTokenFlow(
  token:
    TokenAccumulator
): EvmFundingTokenFlow {
  return {
    tokenAddress:
      token.tokenAddress,
    transferCount:
      token.transferCount,
    rawValue:
      token.rawValue.toString(),
    firstSeen:
      token.firstSeen,
    lastSeen:
      token.lastSeen,
  };
}

export function evmTransactionsToFundingObservations(
  transactions:
    readonly EvmTransactionFundingInput[]
): readonly EvmNativeFundingObservation[] {
  const observations:
    EvmNativeFundingObservation[] = [];

  for (
    const transaction of
      transactions
  ) {
    if (
      transaction.from === null ||
      transaction.to === null ||
      transaction.value === null
    ) {
      continue;
    }

    observations.push({
      kind: "evm_transaction",
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

export function evmTransfersToFundingObservations(
  transfers:
    readonly EvmTransferFundingInput[]
): readonly EvmTokenFundingObservation[] {
  return transfers.map(
    transfer => ({
      kind: "erc20_transfer",
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

export function analyzeEvmFundingProvenance(
  request:
    AnalyzeEvmFundingProvenanceRequest
): EvmFundingProvenanceIntelligence {
  const wallet =
    normalizeAddress(
      request.walletAddress
    );

  if (!wallet) {
    throw new Error(
      "Invalid EVM wallet address."
    );
  }

  const sources =
    new Map<
      string,
      SourceAccumulator
    >();

  const allHashes =
    new Set<string>();

  const overallRange =
    emptySeenRange();

  let fundingObservationCount = 0;
  let nativeFundingObservationCount = 0;
  let erc20FundingObservationCount = 0;
  let selfFundingObservationCount = 0;
  let ignoredEvidenceCount = 0;

  let firstObservedFunding:
    EvmFirstObservedFunding | null =
      null;

  let firstObservedFundingMs:
    number | null = null;

  for (
    const observation of
      request.observations
  ) {
    const hash =
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
      !hash ||
      !from ||
      !to
    ) {
      ignoredEvidenceCount += 1;
      continue;
    }

    if (to !== wallet) {
      ignoredEvidenceCount += 1;
      continue;
    }

    if (from === wallet) {
      selfFundingObservationCount +=
        1;
      continue;
    }

    const rawValue =
      parseRawValue(
        observation.rawValue
      );

    if (
      rawValue === null ||
      rawValue <= 0n
    ) {
      ignoredEvidenceCount += 1;
      continue;
    }

    let tokenAddress:
      string | null = null;

    if (
      observation.kind ===
        "erc20_transfer"
    ) {
      tokenAddress =
        normalizeAddress(
          observation
            .tokenAddress
        );

      if (!tokenAddress) {
        ignoredEvidenceCount += 1;
        continue;
      }
    }

    const source =
      getSource(
        sources,
        from
      );

    source.fundingObservationCount +=
      1;

    source.transactionHashes.add(
      hash
    );

    allHashes.add(hash);

    fundingObservationCount += 1;

    if (
      observation.kind ===
        "evm_transaction"
    ) {
      source.nativeTransactionCount +=
        1;

      source.nativeRawValue +=
        rawValue;

      nativeFundingObservationCount +=
        1;
    } else {
      if (tokenAddress === null) {
        ignoredEvidenceCount += 1;
        continue;
      }

      source.erc20TransferCount +=
        1;

      source
        .observedTokenAddresses
        .add(tokenAddress);

      const token =
        getTokenFlow(
          source,
          tokenAddress
        );

      token.transferCount += 1;
      token.rawValue += rawValue;

      includeTimestamp(
        token,
        observation.timestamp
      );

      erc20FundingObservationCount +=
        1;
    }

    includeTimestamp(
      source,
      observation.timestamp
    );

    includeTimestamp(
      overallRange,
      observation.timestamp
    );

    if (observation.timestamp) {
      const timestampMs =
        Date.parse(
          observation.timestamp
        );

      if (
        Number.isFinite(timestampMs) &&
        (
          firstObservedFundingMs ===
            null ||
          timestampMs <
            firstObservedFundingMs ||
          (
            timestampMs ===
              firstObservedFundingMs &&
            (
              firstObservedFunding ===
                null ||
              hash <
                firstObservedFunding
                  .transactionHash
            )
          )
        )
      ) {
        firstObservedFundingMs =
          timestampMs;

        firstObservedFunding = {
          sourceAddress: from,
          transactionHash: hash,
          timestamp:
            observation.timestamp,
          evidenceKind:
            observation.kind,
          tokenAddress,
          rawValue:
            rawValue.toString(),
        };
      }
    }
  }

  const entityEvidence =
    request.entityEvidence ?? [];

  const sortedSources =
    [...sources.values()]
      .sort(
        (a, b) =>
          b.fundingObservationCount -
            a.fundingObservationCount ||
          b.transactionHashes.size -
            a.transactionHashes.size ||
          lastSeenRank(b) -
            lastSeenRank(a) ||
          a.sourceAddress.localeCompare(
            b.sourceAddress
          )
      );

  const normalizedSources:
    EvmFundingSource[] =
      sortedSources.map(
        (
          source,
          index
        ) => ({
          rank: index + 1,

          sourceAddress:
            source.sourceAddress,

          attribution:
            resolveEvmEntityAttribution(
              source.sourceAddress,
              entityEvidence
            ),

          fundingObservationCount:
            source
              .fundingObservationCount,

          evidenceTransactionCount:
            source
              .transactionHashes
              .size,

          nativeTransactionCount:
            source
              .nativeTransactionCount,

          erc20TransferCount:
            source
              .erc20TransferCount,

          nativeRawValue:
            source
              .nativeRawValue
              .toString(),

          observedTokenAddresses:
            [
              ...source
                .observedTokenAddresses,
            ].sort(),

          tokenFlows:
            [
              ...source
                .tokenFlows
                .values(),
            ]
              .sort(
                (a, b) =>
                  b.transferCount -
                    a.transferCount ||
                  a.tokenAddress
                    .localeCompare(
                      b.tokenAddress
                    )
              )
              .map(
                normalizeTokenFlow
              ),

          evidenceTransactionHashes:
            [
              ...source
                .transactionHashes,
            ].sort(),

          firstSeen:
            source.firstSeen,

          lastSeen:
            source.lastSeen,

          repeatedFundingSource:
            source
              .transactionHashes
              .size > 1,
        })
      );

  return {
    walletAddress:
      wallet,

    coverage:
      request.coverage,

    inputEvidenceCount:
      request.observations.length,

    fundingObservationCount,

    uniqueFundingTransactionCount:
      allHashes.size,

    nativeFundingObservationCount,

    erc20FundingObservationCount,

    selfFundingObservationCount,

    ignoredEvidenceCount,

    fundingSourceCount:
      normalizedSources.length,

    repeatedFundingSourceCount:
      normalizedSources.filter(
        source =>
          source
            .repeatedFundingSource
      ).length,

    firstSeen:
      overallRange.firstSeen,

    lastSeen:
      overallRange.lastSeen,

    firstObservedFunding,

    sources:
      normalizedSources,
  };
}
