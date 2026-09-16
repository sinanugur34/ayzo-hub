import type {
  EvmDeveloperDeployment,
  EvmDeveloperHistory,
} from "./developerHistory";

export type EvmDeepDeployerChronologyEntry = {
  rank: number;

  contractAddress: string;
  deployerAddress: string;
  transactionHash: string;

  blockNumber: number;
  timestamp: string | null;

  isTargetContract:
    boolean;
};

export type EvmDeepDeployerCoverage = {
  includesReceiptBackedTopLevelCreate:
    true;

  includesInternalCreate:
    false;

  includesCreate2:
    false;

  includesFundingContext:
    boolean;

  includesRelationshipContext:
    boolean;

  includesOwnershipInference:
    false;

  includesIdentityInference:
    false;

  includesIntentInference:
    false;

  limitation:
    string;
};

export type EvmDeepDeployerFundingSource = {
  rank: number;

  sourceAddress: string;

  fundingObservationCount:
    number;

  evidenceTransactionCount:
    number;

  nativeRawValue:
    string;

  firstSeen:
    string | null;

  lastSeen:
    string | null;

  repeatedFundingSource:
    boolean;

  evidenceTransactionHashes:
    readonly string[];
};

export type EvmDeepDeployerFundingContext = {
  fundingObservationCount:
    number;

  uniqueFundingTransactionCount:
    number;

  fundingSourceCount:
    number;

  repeatedFundingSourceCount:
    number;

  firstSeen:
    string | null;

  lastSeen:
    string | null;

  firstObservedFunding:
    {
      sourceAddress:
        string;

      transactionHash:
        string;

      timestamp:
        string;

      rawValue:
        string;
    } | null;

  strongestSources:
    readonly EvmDeepDeployerFundingSource[];

  limitation:
    string;
};

export type EvmDeepDeployerRelationship = {
  rank: number;

  counterparty:
    string;

  direction:
    | "incoming"
    | "outgoing"
    | "bidirectional";

  interactionCount:
    number;

  incomingInteractionCount:
    number;

  outgoingInteractionCount:
    number;

  transactionCount:
    number;

  firstSeen:
    string | null;

  lastSeen:
    string | null;

  evidenceTransactionHashes:
    readonly string[];
};

export type EvmDeepDeployerRelationshipContext = {
  interactionCount:
    number;

  incomingInteractionCount:
    number;

  outgoingInteractionCount:
    number;

  transactionCount:
    number;

  counterpartyCount:
    number;

  firstSeen:
    string | null;

  lastSeen:
    string | null;

  strongestCounterparties:
    readonly EvmDeepDeployerRelationship[];

  limitation:
    string;
};

export type EvmDeepDeployerInvestigation = {
  schemaVersion: 1;

  targetContractAddress:
    string;

  deployerAddress:
    string;

  verifiedDeploymentCount:
    number;

  otherVerifiedDeploymentCount:
    number;

  repeatedDeploymentActivity:
    boolean;

  targetDeploymentRank:
    number | null;

  verifiedDeploymentsBeforeTargetCount:
    number;

  verifiedDeploymentsAfterTargetCount:
    number;

  timestampedDeploymentCount:
    number;

  firstObservedAt:
    string | null;

  lastObservedAt:
    string | null;

  observedDeploymentSpanSeconds:
    number | null;

  firstDeployment:
    EvmDeepDeployerChronologyEntry | null;

  lastDeployment:
    EvmDeepDeployerChronologyEntry | null;

  chronology:
    readonly EvmDeepDeployerChronologyEntry[];

  evidenceTransactionHashes:
    readonly string[];

  fundingContext:
    EvmDeepDeployerFundingContext | null;

  relationshipContext:
    EvmDeepDeployerRelationshipContext | null;

  coverage:
    EvmDeepDeployerCoverage;
};

export type AnalyzeEvmDeepDeployerInvestigationRequest = {
  developerHistory:
    EvmDeveloperHistory;

  fundingContext?:
    EvmDeepDeployerFundingContext | null;

  relationshipContext?:
    EvmDeepDeployerRelationshipContext | null;
};

function timestampMs(
  value: string | null
): number | null {
  if (!value) {
    return null;
  }

  const parsed =
    Date.parse(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function normalizeChronologyEntry(
  deployment:
    EvmDeveloperDeployment
): EvmDeepDeployerChronologyEntry {
  return {
    rank:
      deployment.rank,

    contractAddress:
      deployment.contractAddress,

    deployerAddress:
      deployment.deployerAddress,

    transactionHash:
      deployment.transactionHash,

    blockNumber:
      deployment.blockNumber,

    timestamp:
      deployment.timestamp,

    isTargetContract:
      deployment.isTargetContract,
  };
}

export function analyzeEvmDeepDeployerInvestigation(
  request:
    AnalyzeEvmDeepDeployerInvestigationRequest
): EvmDeepDeployerInvestigation {
  const history =
    request.developerHistory;

  const chronology =
    [...history.deployments]
      .sort(
        (left, right) =>
          left.blockNumber -
            right.blockNumber ||
          left.transactionHash
            .localeCompare(
              right.transactionHash
            )
      )
      .map(
        normalizeChronologyEntry
      );

  const targetIndex =
    chronology.findIndex(
      deployment =>
        deployment
          .isTargetContract
    );

  const targetDeploymentRank =
    targetIndex >= 0
      ? targetIndex + 1
      : null;

  const verifiedDeploymentsBeforeTargetCount =
    targetIndex >= 0
      ? targetIndex
      : 0;

  const verifiedDeploymentsAfterTargetCount =
    targetIndex >= 0
      ? Math.max(
          0,
          chronology.length -
            targetIndex -
            1
        )
      : 0;

  const timestamped =
    chronology
      .map(
        deployment => ({
          timestamp:
            deployment.timestamp,

          timestampMs:
            timestampMs(
              deployment.timestamp
            ),
        })
      )
      .filter(
        (
          item
        ): item is {
          timestamp: string;
          timestampMs: number;
        } =>
          item.timestamp !==
            null &&
          item.timestampMs !==
            null
      )
      .sort(
        (left, right) =>
          left.timestampMs -
          right.timestampMs
      );

  const firstObservedAt =
    timestamped[0]
      ?.timestamp ??
    null;

  const lastObservedAt =
    timestamped[
      timestamped.length - 1
    ]?.timestamp ??
    null;

  const observedDeploymentSpanSeconds =
    timestamped.length >= 2
      ? Math.max(
          0,
          Math.floor(
            (
              timestamped[
                timestamped.length -
                  1
              ].timestampMs -
              timestamped[0]
                .timestampMs
            ) /
              1000
          )
        )
      : null;

  return {
    schemaVersion: 1,

    targetContractAddress:
      history
        .targetContractAddress,

    deployerAddress:
      history.deployerAddress,

    verifiedDeploymentCount:
      chronology.length,

    otherVerifiedDeploymentCount:
      chronology.filter(
        deployment =>
          !deployment
            .isTargetContract
      ).length,

    repeatedDeploymentActivity:
      chronology.length > 1,

    targetDeploymentRank,

    verifiedDeploymentsBeforeTargetCount,

    verifiedDeploymentsAfterTargetCount,

    timestampedDeploymentCount:
      timestamped.length,

    firstObservedAt,

    lastObservedAt,

    observedDeploymentSpanSeconds,

    firstDeployment:
      chronology[0] ??
      null,

    lastDeployment:
      chronology[
        chronology.length - 1
      ] ?? null,

    chronology,

    evidenceTransactionHashes:
      chronology
        .map(
          deployment =>
            deployment
              .transactionHash
        )
        .sort(),

    fundingContext:
      request.fundingContext ??
      null,

    relationshipContext:
      request.relationshipContext ??
      null,

    coverage: {
      includesReceiptBackedTopLevelCreate:
        true,

      includesInternalCreate:
        false,

      includesCreate2:
        false,

      includesFundingContext:
        request.fundingContext !==
        undefined &&
        request.fundingContext !==
        null,

      includesRelationshipContext:
        request.relationshipContext !==
        undefined &&
        request.relationshipContext !==
        null,

      includesOwnershipInference:
        false,

      includesIdentityInference:
        false,

      includesIntentInference:
        false,

      limitation:
        "Advanced Deep Deployer investigation is bounded to the collected developer transaction-history window. Deployment chronology covers receipt-backed top-level CREATE evidence only. Funding and relationship context cover native EVM transaction evidence only. Internal CREATE, CREATE2, ERC-20 deployer transfer history, ownership, identity and intent are not inferred.",
    },
  };
}
