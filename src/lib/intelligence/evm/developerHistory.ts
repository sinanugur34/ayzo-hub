const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

const TX_HASH =
  /^0x[0-9a-fA-F]{64}$/;

export type EvmDeveloperDeploymentObservation = {
  contractAddress: string;
  deployerAddress: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: string | null;

  creationKind:
    "top_level_create";

  evidenceKind:
    "transaction_receipt";
};

export type EvmDeveloperHistoryCoverage = {
  transactionHistorySource:
    "goldrush_transactions_v3";

  requestedMaxPages: number;
  scannedPages: number;
  historyExhausted: boolean;

  receiptCheckLimit: number;
  receiptCheckLimited: boolean;

  receiptVerificationFailureCount:
    number;

  includesTopLevelCreate: true;
  includesInternalCreate: false;
  includesCreate2: false;

  limitation: string;
};

export type EvmDeveloperDeployment = {
  rank: number;

  contractAddress: string;
  deployerAddress: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: string | null;

  creationKind:
    "top_level_create";

  evidenceKind:
    "transaction_receipt";

  isTargetContract: boolean;
};

export type EvmDeveloperHistory = {
  targetContractAddress: string;
  deployerAddress: string;

  verifiedDeploymentCount: number;

  otherVerifiedDeploymentCount:
    number;

  repeatedDeploymentActivity:
    boolean;

  duplicateEvidenceCount: number;
  ignoredEvidenceCount: number;

  firstDeployment:
    EvmDeveloperDeployment | null;

  lastDeployment:
    EvmDeveloperDeployment | null;

  evidenceTransactionHashes:
    readonly string[];

  deployments:
    readonly EvmDeveloperDeployment[];

  coverage:
    EvmDeveloperHistoryCoverage;
};

export type AnalyzeEvmDeveloperHistoryRequest = {
  targetContractAddress: string;

  targetDeployment:
    EvmDeveloperDeploymentObservation;

  observedDeployments:
    readonly EvmDeveloperDeploymentObservation[];

  coverage:
    EvmDeveloperHistoryCoverage;
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

function normalizeObservation(
  value:
    EvmDeveloperDeploymentObservation
): EvmDeveloperDeploymentObservation | null {
  const contractAddress =
    normalizeAddress(
      value.contractAddress
    );

  const deployerAddress =
    normalizeAddress(
      value.deployerAddress
    );

  const transactionHash =
    normalizeHash(
      value.transactionHash
    );

  if (
    !contractAddress ||
    !deployerAddress ||
    !transactionHash ||
    !Number.isSafeInteger(
      value.blockNumber
    ) ||
    value.blockNumber < 0
  ) {
    return null;
  }

  return {
    contractAddress,
    deployerAddress,
    transactionHash,
    blockNumber:
      value.blockNumber,
    timestamp:
      value.timestamp,
    creationKind:
      "top_level_create",
    evidenceKind:
      "transaction_receipt",
  };
}

export function analyzeEvmDeveloperHistory(
  request:
    AnalyzeEvmDeveloperHistoryRequest
): EvmDeveloperHistory {
  const targetContractAddress =
    normalizeAddress(
      request.targetContractAddress
    );

  if (!targetContractAddress) {
    throw new Error(
      "Invalid target contract address."
    );
  }

  const targetDeployment =
    normalizeObservation(
      request.targetDeployment
    );

  if (!targetDeployment) {
    throw new Error(
      "Invalid target deployment evidence."
    );
  }

  if (
    targetDeployment
      .contractAddress !==
    targetContractAddress
  ) {
    throw new Error(
      "Target deployment does not match target contract."
    );
  }

  const deployerAddress =
    targetDeployment
      .deployerAddress;

  const byTransaction =
    new Map<
      string,
      EvmDeveloperDeploymentObservation
    >();

  const byContract =
    new Map<
      string,
      string
    >();

  byTransaction.set(
    targetDeployment
      .transactionHash,
    targetDeployment
  );

  byContract.set(
    targetDeployment
      .contractAddress,
    targetDeployment
      .transactionHash
  );

  let duplicateEvidenceCount = 0;
  let ignoredEvidenceCount = 0;

  for (
    const raw of
      request.observedDeployments
  ) {
    const observation =
      normalizeObservation(raw);

    if (!observation) {
      ignoredEvidenceCount += 1;
      continue;
    }

    if (
      observation
        .deployerAddress !==
      deployerAddress
    ) {
      ignoredEvidenceCount += 1;
      continue;
    }

    const existingByTx =
      byTransaction.get(
        observation.transactionHash
      );

    if (existingByTx) {
      if (
        existingByTx
          .contractAddress ===
        observation.contractAddress
      ) {
        duplicateEvidenceCount += 1;
      } else {
        ignoredEvidenceCount += 1;
      }

      continue;
    }

    const existingByContract =
      byContract.get(
        observation.contractAddress
      );

    if (existingByContract) {
      duplicateEvidenceCount += 1;
      continue;
    }

    byTransaction.set(
      observation.transactionHash,
      observation
    );

    byContract.set(
      observation.contractAddress,
      observation.transactionHash
    );
  }

  const sorted =
    [...byTransaction.values()]
      .sort(
        (a, b) =>
          a.blockNumber -
            b.blockNumber ||
          a.transactionHash
            .localeCompare(
              b.transactionHash
            )
      );

  const deployments:
    EvmDeveloperDeployment[] =
      sorted.map(
        (
          deployment,
          index
        ) => ({
          rank:
            index + 1,

          ...deployment,

          isTargetContract:
            deployment
              .contractAddress ===
            targetContractAddress,
        })
      );

  return {
    targetContractAddress,
    deployerAddress,

    verifiedDeploymentCount:
      deployments.length,

    otherVerifiedDeploymentCount:
      deployments.filter(
        deployment =>
          !deployment
            .isTargetContract
      ).length,

    repeatedDeploymentActivity:
      deployments.length > 1,

    duplicateEvidenceCount,
    ignoredEvidenceCount,

    firstDeployment:
      deployments[0] ??
      null,

    lastDeployment:
      deployments[
        deployments.length - 1
      ] ?? null,

    evidenceTransactionHashes:
      deployments
        .map(
          deployment =>
            deployment
              .transactionHash
        )
        .sort(),

    deployments,

    coverage:
      request.coverage,
  };
}
