import {
  resolveEvmEntityAttribution,
  type EvmEntityAttribution,
  type EvmEntityEvidence,
} from "./entityAttribution";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

const TRANSACTION_HASH =
  /^0x[0-9a-fA-F]{64}$/;

export type EvmRelationshipDirection =
  | "incoming"
  | "outgoing"
  | "bidirectional";

export type EvmRelationshipEvidenceKind =
  | "evm_transaction"
  | "erc20_transfer";

type EvmRelationshipObservationBase = {
  transactionHash: string;
  blockNumber: number | null;
  timestamp: string | null;
  from: string;
  to: string;
};

export type EvmTransactionRelationshipObservation =
  EvmRelationshipObservationBase & {
    kind: "evm_transaction";
    rawValue: string | null;
  };

export type EvmErc20RelationshipObservation =
  EvmRelationshipObservationBase & {
    kind: "erc20_transfer";
    tokenAddress: string;
    rawValue: string;
  };

export type EvmRelationshipObservation =
  | EvmTransactionRelationshipObservation
  | EvmErc20RelationshipObservation;

export type EvmTransferRelationshipInput = {
  transactionHash: string;
  blockNumber: number | null;
  timestamp: string | null;
  from: string;
  to: string;
  tokenAddress: string;
  value: string;
};

export type EvmWalletRelationshipCoverage = {
  includesEvmTransactions: boolean;
  includesErc20Transfers: boolean;
  includedEvidenceKinds:
    readonly EvmRelationshipEvidenceKind[];
  omittedEvidenceKinds:
    readonly EvmRelationshipEvidenceKind[];
  limitation: string | null;
};

export const ERC20_TRANSFER_ONLY_RELATIONSHIP_COVERAGE:
  EvmWalletRelationshipCoverage = {
  includesEvmTransactions: false,
  includesErc20Transfers: true,
  includedEvidenceKinds: [
    "erc20_transfer",
  ],
  omittedEvidenceKinds: [
    "evm_transaction",
  ],
  limitation:
    "This result covers ERC-20 transfer evidence only; EVM transaction evidence is not included.",
};

export type EvmWalletTokenFlow = {
  tokenAddress: string;
  transferCount: number;
  sentTransferCount: number;
  receivedTransferCount: number;
  sentRawValue: string;
  receivedRawValue: string;
  firstSeen: string | null;
  lastSeen: string | null;
};

export type EvmWalletRelationshipEdge = {
  rank: number;
  counterparty: string;
  direction:
    EvmRelationshipDirection;
  attribution:
    EvmEntityAttribution;
  interactionCount: number;
  incomingInteractionCount: number;
  outgoingInteractionCount: number;
  transactionCount: number;
  transferCount: number;
  sentTransferCount: number;
  receivedTransferCount: number;
  firstSeen: string | null;
  lastSeen: string | null;
  evidenceTransactionHashes:
    readonly string[];
  observedTokenAddresses:
    readonly string[];
  tokenBreakdown:
    readonly EvmWalletTokenFlow[];
};

export type EvmWalletRelationshipIntelligence = {
  walletAddress: string;
  coverage:
    EvmWalletRelationshipCoverage;
  inputEvidenceCount: number;
  interactionCount: number;
  incomingInteractionCount: number;
  outgoingInteractionCount: number;
  transactionCount: number;
  transferCount: number;
  sentTransferCount: number;
  receivedTransferCount: number;
  selfInteractionCount: number;
  ignoredEvidenceCount: number;
  counterpartyCount: number;
  firstSeen: string | null;
  lastSeen: string | null;
  totalsByToken:
    readonly EvmWalletTokenFlow[];
  counterparties:
    readonly EvmWalletRelationshipEdge[];
};

export type AnalyzeEvmWalletRelationshipsRequest = {
  walletAddress: string;
  observations:
    readonly EvmRelationshipObservation[];
  coverage:
    EvmWalletRelationshipCoverage;
  entityEvidence?:
    readonly EvmEntityEvidence[];
};

type SeenRange = {
  firstSeen: string | null;
  firstSeenMs: number | null;
  lastSeen: string | null;
  lastSeenMs: number | null;
};

type TokenFlowAccumulator =
  SeenRange & {
    tokenAddress: string;
    transferCount: number;
    sentTransferCount: number;
    receivedTransferCount: number;
    sentRawValue: bigint;
    receivedRawValue: bigint;
  };

type RelationshipAccumulator =
  SeenRange & {
    counterparty: string;
    interactionCount: number;
    incomingInteractionCount: number;
    outgoingInteractionCount: number;
    transactionCount: number;
    transferCount: number;
    sentTransferCount: number;
    receivedTransferCount: number;
    evidenceTransactionHashes:
      Set<string>;
    observedTokenAddresses:
      Set<string>;
    tokens:
      Map<
        string,
        TokenFlowAccumulator
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

function normalizeTransactionHash(
  value: string
): string | null {
  const normalized =
    value.trim().toLowerCase();

  return TRANSACTION_HASH.test(
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

function getTokenFlow(
  flows:
    Map<
      string,
      TokenFlowAccumulator
    >,
  tokenAddress: string
): TokenFlowAccumulator {
  const existing =
    flows.get(tokenAddress);

  if (existing) {
    return existing;
  }

  const created:
    TokenFlowAccumulator = {
    tokenAddress,
    transferCount: 0,
    sentTransferCount: 0,
    receivedTransferCount: 0,
    sentRawValue: 0n,
    receivedRawValue: 0n,
    ...emptySeenRange(),
  };

  flows.set(
    tokenAddress,
    created
  );

  return created;
}

function getRelationship(
  relationships:
    Map<
      string,
      RelationshipAccumulator
    >,
  counterparty: string
): RelationshipAccumulator {
  const existing =
    relationships.get(
      counterparty
    );

  if (existing) {
    return existing;
  }

  const created:
    RelationshipAccumulator = {
    counterparty,
    interactionCount: 0,
    incomingInteractionCount: 0,
    outgoingInteractionCount: 0,
    transactionCount: 0,
    transferCount: 0,
    sentTransferCount: 0,
    receivedTransferCount: 0,
    evidenceTransactionHashes:
      new Set(),
    observedTokenAddresses:
      new Set(),
    tokens: new Map(),
    ...emptySeenRange(),
  };

  relationships.set(
    counterparty,
    created
  );

  return created;
}

function addTokenTransfer(
  flow: TokenFlowAccumulator,
  direction: "incoming" | "outgoing",
  value: bigint,
  timestamp: string | null
) {
  flow.transferCount += 1;

  if (direction === "outgoing") {
    flow.sentTransferCount += 1;
    flow.sentRawValue += value;
  } else {
    flow.receivedTransferCount +=
      1;
    flow.receivedRawValue +=
      value;
  }

  includeTimestamp(
    flow,
    timestamp
  );
}

function normalizeTokenFlow(
  flow: TokenFlowAccumulator
): EvmWalletTokenFlow {
  return {
    tokenAddress:
      flow.tokenAddress,
    transferCount:
      flow.transferCount,
    sentTransferCount:
      flow.sentTransferCount,
    receivedTransferCount:
      flow.receivedTransferCount,
    sentRawValue:
      flow.sentRawValue
        .toString(),
    receivedRawValue:
      flow.receivedRawValue
        .toString(),
    firstSeen:
      flow.firstSeen,
    lastSeen:
      flow.lastSeen,
  };
}

function sortTokenFlows(
  flows:
    Iterable<TokenFlowAccumulator>
): EvmWalletTokenFlow[] {
  return [...flows]
    .sort(
      (a, b) =>
        b.transferCount -
          a.transferCount ||
        a.tokenAddress.localeCompare(
          b.tokenAddress
        )
    )
    .map(normalizeTokenFlow);
}

function directionFor(
  relationship:
    RelationshipAccumulator
): EvmRelationshipDirection {
  if (
    relationship
      .incomingInteractionCount > 0 &&
    relationship
      .outgoingInteractionCount > 0
  ) {
    return "bidirectional";
  }

  return relationship
    .incomingInteractionCount > 0
    ? "incoming"
    : "outgoing";
}

function lastSeenRank(
  relationship:
    RelationshipAccumulator
): number {
  return (
    relationship.lastSeenMs ??
    Number.NEGATIVE_INFINITY
  );
}

export function evmTransfersToRelationshipObservations(
  transfers:
    readonly EvmTransferRelationshipInput[]
): readonly EvmErc20RelationshipObservation[] {
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
      from: transfer.from,
      to: transfer.to,
      tokenAddress:
        transfer.tokenAddress,
      rawValue:
        transfer.value,
    })
  );
}

export function analyzeEvmWalletRelationships(
  request:
    AnalyzeEvmWalletRelationshipsRequest
): EvmWalletRelationshipIntelligence {
  const wallet =
    normalizeAddress(
      request.walletAddress
    );

  if (!wallet) {
    throw new Error(
      "Invalid EVM wallet address."
    );
  }

  const relationships =
    new Map<
      string,
      RelationshipAccumulator
    >();

  const totalsByToken =
    new Map<
      string,
      TokenFlowAccumulator
    >();

  const overallRange =
    emptySeenRange();

  let interactionCount = 0;
  let incomingInteractionCount = 0;
  let outgoingInteractionCount = 0;
  let transactionCount = 0;
  let transferCount = 0;
  let sentTransferCount = 0;
  let receivedTransferCount = 0;
  let selfInteractionCount = 0;
  let ignoredEvidenceCount = 0;

  for (
    const observation of
      request.observations
  ) {
    const transactionHash =
      normalizeTransactionHash(
        observation
          .transactionHash
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
      ignoredEvidenceCount += 1;
      continue;
    }

    const isOutgoing =
      from === wallet;
    const isIncoming =
      to === wallet;

    if (
      !isOutgoing &&
      !isIncoming
    ) {
      ignoredEvidenceCount += 1;
      continue;
    }

    if (isOutgoing && isIncoming) {
      selfInteractionCount += 1;
      continue;
    }

    let tokenAddress:
      string | null = null;
    let rawValue:
      bigint | null = null;

    if (
      observation.kind ===
        "erc20_transfer"
    ) {
      tokenAddress =
        normalizeAddress(
          observation
            .tokenAddress
        );
      rawValue =
        parseRawValue(
          observation.rawValue
        );

      if (
        !tokenAddress ||
        rawValue === null
      ) {
        ignoredEvidenceCount +=
          1;
        continue;
      }
    }

    const direction =
      isOutgoing
        ? "outgoing" as const
        : "incoming" as const;

    const counterparty =
      isOutgoing
        ? to
        : from;

    const relationship =
      getRelationship(
        relationships,
        counterparty
      );

    relationship.interactionCount +=
      1;
    relationship
      .evidenceTransactionHashes
      .add(transactionHash);

    if (direction === "outgoing") {
      relationship
        .outgoingInteractionCount += 1;
      outgoingInteractionCount += 1;
    } else {
      relationship
        .incomingInteractionCount += 1;
      incomingInteractionCount += 1;
    }

    interactionCount += 1;

    if (
      observation.kind ===
        "evm_transaction"
    ) {
      relationship.transactionCount +=
        1;
      transactionCount += 1;
    } else {
      if (
        tokenAddress === null ||
        rawValue === null
      ) {
        ignoredEvidenceCount += 1;
        continue;
      }

      relationship.transferCount +=
        1;
      transferCount += 1;

      if (direction === "outgoing") {
        relationship.sentTransferCount +=
          1;
        sentTransferCount += 1;
      } else {
        relationship
          .receivedTransferCount += 1;
        receivedTransferCount += 1;
      }

      relationship
        .observedTokenAddresses
        .add(tokenAddress);

      addTokenTransfer(
        getTokenFlow(
          relationship.tokens,
          tokenAddress
        ),
        direction,
        rawValue,
        observation.timestamp
      );

      addTokenTransfer(
        getTokenFlow(
          totalsByToken,
          tokenAddress
        ),
        direction,
        rawValue,
        observation.timestamp
      );
    }

    includeTimestamp(
      relationship,
      observation.timestamp
    );
    includeTimestamp(
      overallRange,
      observation.timestamp
    );
  }

  const sortedRelationships =
    [...relationships.values()]
      .sort(
        (a, b) =>
          b.interactionCount -
            a.interactionCount ||
          lastSeenRank(b) -
            lastSeenRank(a) ||
          a.counterparty.localeCompare(
            b.counterparty
          )
      );

  const entityEvidence =
    request.entityEvidence ?? [];

  const counterparties =
    sortedRelationships.map(
      (
        relationship,
        index
      ): EvmWalletRelationshipEdge => ({
        rank: index + 1,
        counterparty:
          relationship.counterparty,
        direction:
          directionFor(
            relationship
          ),
        attribution:
          resolveEvmEntityAttribution(
            relationship.counterparty,
            entityEvidence
          ),
        interactionCount:
          relationship.interactionCount,
        incomingInteractionCount:
          relationship
            .incomingInteractionCount,
        outgoingInteractionCount:
          relationship
            .outgoingInteractionCount,
        transactionCount:
          relationship.transactionCount,
        transferCount:
          relationship.transferCount,
        sentTransferCount:
          relationship.sentTransferCount,
        receivedTransferCount:
          relationship
            .receivedTransferCount,
        firstSeen:
          relationship.firstSeen,
        lastSeen:
          relationship.lastSeen,
        evidenceTransactionHashes:
          [
            ...relationship
              .evidenceTransactionHashes,
          ].sort(),
        observedTokenAddresses:
          [
            ...relationship
              .observedTokenAddresses,
          ].sort(),
        tokenBreakdown:
          sortTokenFlows(
            relationship.tokens
              .values()
          ),
      })
    );

  return {
    walletAddress: wallet,
    coverage:
      request.coverage,
    inputEvidenceCount:
      request.observations.length,
    interactionCount,
    incomingInteractionCount,
    outgoingInteractionCount,
    transactionCount,
    transferCount,
    sentTransferCount,
    receivedTransferCount,
    selfInteractionCount,
    ignoredEvidenceCount,
    counterpartyCount:
      counterparties.length,
    firstSeen:
      overallRange.firstSeen,
    lastSeen:
      overallRange.lastSeen,
    totalsByToken:
      sortTokenFlows(
        totalsByToken.values()
      ),
    counterparties,
  };
}
