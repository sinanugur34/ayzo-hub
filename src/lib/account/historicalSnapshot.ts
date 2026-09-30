type JsonRecord =
  Record<string, unknown>;

export type HistoricalSnapshotV1 = {
  version: 1;
  capturedAt: string;
  network: string;
  coverage: string | null;
  subjectKind: string | null;

  metrics: {
    holderTop1?: number | null;
    holderTop5?: number | null;
    holderTop10?: number | null;
    holderTop20?: number | null;
    tokenAccountsAnalyzed?: number | null;
    uniqueOwners?: number | null;

    tokenSupplyRaw?: string | null;
    tokenDecimals?: number | null;
    tokenProgram?: string | null;
    mintAuthority?: string | null;
    freezeAuthority?: string | null;

    walletsAnalyzed?: number | null;
    relationshipsDetected?: number | null;
    sharedTransactionsDetected?: number | null;

    incomingTransfersDetected?: number | null;
    sharedFundingSourcesDetected?: number | null;

    transactionCount?: number | null;
    latestTransactionHash?: string | null;
    latestTransactionTimestamp?: string | null;
    latestBlockHeight?: number | null;

    nativeBalanceRaw?: string | null;
    assetBalanceTypeCount?: number | null;
    ownedObjectCount?: number | null;
    objectCreatedCount?: number | null;
    objectDeletedCount?: number | null;

    moduleTotal?: number | null;
    moduleComplete?: number | null;
    moduleLimited?: number | null;
    moduleNotRun?: number | null;
    moduleUnavailable?: number | null;

    relationshipCounterpartyCount?: number | null;
    relationshipInteractionCount?: number | null;
    relationshipLastSeen?: string | null;

    fundingSourceCount?: number | null;
    fundingObservationCount?: number | null;
    fundingLastSeen?: string | null;

    deploymentDeployer?: string | null;
    deploymentTransactionHash?: string | null;
    deploymentBlockNumber?: number | null;

    developerVerifiedDeploymentCount?: number | null;
    developerOtherVerifiedDeploymentCount?: number | null;
  };

  modules:
    Record<string, string>;

  findings: readonly {
    id: string | null;
    category: string | null;
    severity: string | null;
    confidence: string | null;
    title: string | null;
  }[];
};

function record(
  value: unknown
): JsonRecord | null {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  )
    ? value as JsonRecord
    : null;
}

function text(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value
    : null;
}

function numberValue(
  value: unknown
) {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  )
    ? value
    : null;
}

function findingSnapshot(
  value: unknown
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 50)
    .map(item => {
      const row =
        record(item);

      return {
        id:
          text(row?.id),
        category:
          text(row?.category),
        severity:
          text(row?.severity),
        confidence:
          text(row?.confidence),
        title:
          text(row?.title),
      };
    });
}

function moduleSnapshot(
  value: unknown
) {
  const root =
    record(value);

  if (!root) {
    return {};
  }

  const output:
    Record<string, string> =
      {};

  for (
    const [
      key,
      rawValue,
    ] of Object.entries(
      root
    )
  ) {
    const moduleState =
      record(rawValue);

    const status =
      text(
        moduleState?.status
      );

    if (status) {
      output[key] =
        status;
    }
  }

  return output;
}

function solanaSnapshot(
  network: string,
  root: JsonRecord
): HistoricalSnapshotV1 {
  const holders =
    record(root.holders);

  const concentration =
    record(
      holders?.concentration
    );

  const relationships =
    record(
      root.relationships
    );

  const funding =
    record(
      root.funding
    );

  const tokenVerification =
    record(
      root.tokenVerification
    );

  return {
    version: 1,
    capturedAt:
      new Date().toISOString(),
    network,
    coverage:
      text(root.coverage),
    subjectKind:
      "token",

    metrics: {
      holderTop1:
        numberValue(
          concentration?.top1
        ),

      holderTop5:
        numberValue(
          concentration?.top5
        ),

      holderTop10:
        numberValue(
          concentration?.top10
        ),

      holderTop20:
        numberValue(
          concentration?.top20
        ),

      tokenAccountsAnalyzed:
        numberValue(
          holders
            ?.tokenAccountsAnalyzed
        ),

      uniqueOwners:
        numberValue(
          holders?.uniqueOwners
        ),

      tokenSupplyRaw:
        text(
          tokenVerification?.supply
        ),

      tokenDecimals:
        numberValue(
          tokenVerification?.decimals
        ),

      tokenProgram:
        text(
          tokenVerification?.tokenProgram
        ),

      mintAuthority:
        text(
          tokenVerification?.mintAuthority
        ),

      freezeAuthority:
        text(
          tokenVerification?.freezeAuthority
        ),

      walletsAnalyzed:
        numberValue(
          relationships
            ?.walletsAnalyzed ??
          funding
            ?.walletsAnalyzed
        ),

      relationshipsDetected:
        numberValue(
          relationships
            ?.relationshipsDetected
        ),

      sharedTransactionsDetected:
        numberValue(
          relationships
            ?.sharedTransactionsDetected
        ),

      incomingTransfersDetected:
        numberValue(
          funding
            ?.incomingTransfersDetected
        ),

      sharedFundingSourcesDetected:
        numberValue(
          funding
            ?.sharedFundingSourcesDetected
        ),
    },

    modules:
      moduleSnapshot(
        root.modules
      ),

    findings:
      findingSnapshot(
        root.findings
      ),
  };
}

function evmSnapshot(
  network: string,
  root: JsonRecord
): HistoricalSnapshotV1 {
  const summary =
    record(
      root.moduleSummary
    );

  const modules =
    record(
      root.modules
    );

  const relationshipsModule =
    record(
      modules
        ?.walletRelationships
    );

  const relationships =
    record(
      relationshipsModule
        ?.data
    );

  const fundingModule =
    record(
      modules
        ?.fundingProvenance
    );

  const funding =
    record(
      fundingModule
        ?.data
    );

  const deploymentModule =
    record(
      modules
        ?.deploymentIntelligence
    );

  const deploymentLookup =
    record(
      deploymentModule
        ?.data
    );

  const deployment =
    record(
      deploymentLookup
        ?.deployment
    );

  const developerModule =
    record(
      modules
        ?.developerHistory
    );

  const developer =
    record(
      developerModule
        ?.data
    );

  return {
    version: 1,
    capturedAt:
      new Date().toISOString(),
    network,
    coverage:
      text(root.coverage),
    subjectKind:
      text(root.assetKind),

    metrics: {
      moduleTotal:
        numberValue(
          summary?.total
        ),

      moduleComplete:
        numberValue(
          summary?.complete
        ),

      moduleLimited:
        numberValue(
          summary?.limited
        ),

      moduleNotRun:
        numberValue(
          summary?.notRun
        ),

      moduleUnavailable:
        numberValue(
          summary?.unavailable
        ),

      relationshipCounterpartyCount:
        numberValue(
          relationships
            ?.counterpartyCount
        ),

      relationshipInteractionCount:
        numberValue(
          relationships
            ?.interactionCount
        ),

      relationshipLastSeen:
        text(
          relationships
            ?.lastSeen
        ),

      fundingSourceCount:
        numberValue(
          funding
            ?.fundingSourceCount
        ),

      fundingObservationCount:
        numberValue(
          funding
            ?.fundingObservationCount
        ),

      fundingLastSeen:
        text(
          funding
            ?.lastSeen
        ),

      deploymentDeployer:
        text(
          deployment
            ?.deployerAddress
        ),

      deploymentTransactionHash:
        text(
          deployment
            ?.transactionHash
        ),

      deploymentBlockNumber:
        numberValue(
          deployment
            ?.blockNumber
        ),

      developerVerifiedDeploymentCount:
        numberValue(
          developer
            ?.verifiedDeploymentCount
        ),

      developerOtherVerifiedDeploymentCount:
        numberValue(
          developer
            ?.otherVerifiedDeploymentCount
        ),
    },

    modules:
      moduleSnapshot(
        root.modules
      ),

    findings:
      findingSnapshot(
        root.findings
      ),
  };
}

function utxoSnapshot(
  network: string,
  root: JsonRecord
): HistoricalSnapshotV1 {
  const history =
    record(root.history);

  const transactions =
    Array.isArray(
      history?.transactions
    )
      ? history.transactions
      : [];

  const latest =
    record(
      transactions[0]
    );

  const derived =
    record(
      root.derived
    );

  const flow =
    record(
      derived?.flow
    );

  const counterparties =
    record(
      derived?.counterparties
    );

  return {
    version: 1,
    capturedAt:
      new Date().toISOString(),
    network,
    coverage:
      text(root.coverage),
    subjectKind:
      "wallet",

    metrics: {
      transactionCount:
        transactions.length,

      latestTransactionHash:
        text(
          latest
            ?.transactionHash
        ),

      latestTransactionTimestamp:
        text(
          latest?.timestamp
        ),

      latestBlockHeight:
        numberValue(
          latest?.blockHeight
        ),

      relationshipsDetected:
        numberValue(
          counterparties?.count
        ),

      incomingTransfersDetected:
        numberValue(
          flow?.incomingTransactionCount
        ),
    },

    modules:
      moduleSnapshot(
        root.modules
      ),

    findings:
      findingSnapshot(
        root.findings
      ),
  };
}

function suiSnapshot(
  network:
    string,
  root:
    JsonRecord
): HistoricalSnapshotV1 {
  const account =
    record(
      root.account
    );

  const history =
    record(
      root.history
    );

  const transactions =
    Array.isArray(
      history?.transactions
    )
      ? history.transactions
      : [];

  const latest =
    record(
      transactions[0]
    );

  const balances =
    Array.isArray(
      root.balances
    )
      ? root.balances
      : [];

  const objects =
    Array.isArray(
      root.ownedObjects
    )
      ? root.ownedObjects
      : [];

  const derived =
    record(
      root.derived
    );

  const flow =
    record(
      derived?.flow
    );

  const counterparties =
    record(
      derived?.counterparties
    );

  const objectActivity =
    record(
      derived?.objectActivity
    );

  return {
    version:
      1,

    capturedAt:
      new Date().toISOString(),

    network,

    coverage:
      text(
        root.coverage
      ),

    subjectKind:
      "wallet",

    metrics: {
      nativeBalanceRaw:
        text(
          account
            ?.suiBalanceMist
        ),

      assetBalanceTypeCount:
        balances.length,

      ownedObjectCount:
        objects.length,

      objectCreatedCount:
        numberValue(
          objectActivity
            ?.created
        ),

      objectDeletedCount:
        numberValue(
          objectActivity
            ?.deleted
        ),

      transactionCount:
        transactions.length,

      latestTransactionHash:
        text(
          latest
            ?.transactionHash
        ),

      latestTransactionTimestamp:
        text(
          latest
            ?.timestamp
        ),

      relationshipsDetected:
        numberValue(
          counterparties
            ?.count
        ),

      incomingTransfersDetected:
        numberValue(
          flow
            ?.incomingTransactionCount
        ),
    },

    modules:
      moduleSnapshot(
        root.modules
      ),

    findings:
      findingSnapshot(
        root.findings
      ),
  };
}

function tronSnapshot(
  network:
    string,
  root:
    JsonRecord
): HistoricalSnapshotV1 {
  const history =
    record(
      root.history
    );

  const transactions =
    Array.isArray(
      history?.transactions
    )
      ? history.transactions
      : [];

  const latest =
    record(
      transactions[0]
    );

  const derived =
    record(
      root.derived
    );

  const flow =
    record(
      derived?.flow
    );

  const counterparties =
    record(
      derived?.counterparties
    );

  return {
    version:
      1,

    capturedAt:
      new Date().toISOString(),

    network,

    coverage:
      text(
        root.coverage
      ),

    subjectKind:
      "wallet",

    metrics: {
      transactionCount:
        transactions.length,

      latestTransactionHash:
        text(
          latest
            ?.transactionHash
        ),

      latestTransactionTimestamp:
        text(
          latest
            ?.timestamp
        ),

      latestBlockHeight:
        numberValue(
          latest
            ?.blockHeight
        ),

      relationshipsDetected:
        numberValue(
          counterparties
            ?.count
        ),

      incomingTransfersDetected:
        numberValue(
          flow
            ?.incomingTransactionCount
        ),
    },

    modules:
      moduleSnapshot(
        root.modules
      ),

    findings:
      findingSnapshot(
        root.findings
      ),
  };
}

export function buildHistoricalSnapshot(
  network: string,
  value: unknown
): HistoricalSnapshotV1 | null {
  const root =
    record(value);

  if (!root) {
    return null;
  }

  if (
    network ===
    "solana"
  ) {
    return solanaSnapshot(
      network,
      root
    );
  }

  if (
    network ===
      "sui"
  ) {
    return suiSnapshot(
      network,
      root
    );
  }

  if (
    network ===
      "bitcoin" ||
    network ===
      "dogecoin" ||
    network ===
      "litecoin" ||
    network ===
      "xrp"
  ) {
    return utxoSnapshot(
      network,
      root
    );
  }

  if (
    network ===
      "tron"
  ) {
    return tronSnapshot(
      network,
      root
    );
  }

  return evmSnapshot(
    network,
    root
  );
}
