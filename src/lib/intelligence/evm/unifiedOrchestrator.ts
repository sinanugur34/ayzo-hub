import type {
  IntelligenceEngineResult,
  IntelligenceErrorResponse,
  IntelligenceFinding,
} from "../types";

import {
  analyzeEvmCoordinatedWalletBehavior,
  evmTransactionsToCoordinationObservations,
  evmTransfersToCoordinationObservations,
  type EvmCoordinationCoverage,
  type EvmCoordinationObservation,
} from "./coordinatedWalletBehavior";

import {
  analyzeEvmDeveloperHistory,
  type EvmDeveloperDeploymentObservation,
  type EvmDeveloperHistoryCoverage,
} from "./developerHistory";

import {
  getEvmNetworkContext,
} from "./engine";

import {
  readErc20Metadata,
} from "./erc20";

import {
  analyzeEvmFundingProvenance,
  evmTransactionsToFundingObservations,
  evmTransfersToFundingObservations,
  type EvmFundingCoverage,
  type EvmFundingEvidenceKind,
  type EvmFundingObservation,
} from "./fundingProvenance";

import {
  analyzeEvmTokenHolders,
} from "./holderIntelligence";

import type {
  EvmAddressRequest,
  EvmPaginatedAddressRequest,
  EvmTokenTransfersRequest,
  EvmTransactionReceiptRequest,
} from "./provider";

import {
  alchemyEvmProvider,
} from "./providers/alchemy";

import {
  goldRushEvmProvider,
} from "./providers/goldrush";

import {
  goldRushTransactionsProvider,
} from "./providers/goldrushTransactions";

import {
  goldRushTransfersProvider,
} from "./providers/goldrushTransfers";

import type {
  EvmContractDeploymentLookup,
  EvmProviderResult,
  EvmTokenHolders,
  EvmTokenMetadata,
  EvmTransaction,
  EvmTransactionReceipt,
  EvmTransactionsPage,
  EvmTransfer,
  EvmTransfersPage,
} from "./types";

import {
  buildEvmUnifiedIntelligence,
  type EvmUnifiedAssetKind,
  type EvmUnifiedIntelligence,
  type EvmUnifiedModuleId,
  type EvmUnifiedModuleResult,
} from "./unifiedIntelligence";

import {
  analyzeEvmWalletGraph,
  evmTransactionsToGraphObservations,
  evmTransfersToGraphObservations,
  type EvmWalletGraphEvidenceCoverage,
  type EvmWalletGraphObservation,
} from "./walletGraph";

import {
  rankEvmWalletGraphNeighbors,
} from "./walletGraphDiscovery";

import {
  analyzeEvmWalletRelationships,
  evmTransfersToRelationshipObservations,
  type EvmRelationshipEvidenceKind,
  type EvmRelationshipObservation,
  type EvmWalletRelationshipCoverage,
} from "./walletRelationships";

import type {
  NetworkId,
} from "@/lib/networks/registry";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

const EXPANSION_WALLET_LIMIT = 2;

const GRAPH_MAX_HOPS = 2;
const GRAPH_MAX_NODES = 8;
const GRAPH_MAX_EDGES = 12;

const DEVELOPER_MAX_PAGES = 2;
const DEVELOPER_RECEIPT_LIMIT = 8;

export type EvmUnifiedOrchestratorDependencies = {
  readTokenMetadata(
    request: EvmAddressRequest
  ): Promise<
    EvmProviderResult<EvmTokenMetadata>
  >;

  getTokenHolders(
    request: EvmPaginatedAddressRequest
  ): Promise<
    EvmProviderResult<EvmTokenHolders>
  >;

  getTransactions(
    request: EvmPaginatedAddressRequest
  ): Promise<
    EvmProviderResult<EvmTransactionsPage>
  >;

  getTokenTransfers(
    request: EvmTokenTransfersRequest
  ): Promise<
    EvmProviderResult<EvmTransfersPage>
  >;

  getContractDeployment(
    request: EvmAddressRequest
  ): Promise<
    EvmProviderResult<EvmContractDeploymentLookup>
  >;

  getTransactionReceipt(
    request: EvmTransactionReceiptRequest
  ): Promise<
    EvmProviderResult<EvmTransactionReceipt>
  >;
};

const DEFAULT_DEPENDENCIES:
  EvmUnifiedOrchestratorDependencies = {
  readTokenMetadata:
    request =>
      readErc20Metadata({
        ...request,
        provider:
          alchemyEvmProvider,
      }),

  getTokenHolders:
    request =>
      goldRushEvmProvider
        .getTokenHolders(
          request
        ),

  getTransactions:
    request =>
      goldRushTransactionsProvider
        .getTransactions(
          request
        ),

  getTokenTransfers:
    request =>
      goldRushTransfersProvider
        .getTokenTransfers(
          request
        ),

  getContractDeployment:
    request =>
      alchemyEvmProvider
        .getContractDeployment(
          request
        ),

  getTransactionReceipt:
    request =>
      alchemyEvmProvider
        .getTransactionReceipt(
          request
        ),
};

export type RunEvmUnifiedIntelligenceRequest = {
  networkId: NetworkId;
  address: string;
};

export type RunEvmUnifiedIntelligenceResult =
  IntelligenceEngineResult<
    | EvmUnifiedIntelligence
    | IntelligenceErrorResponse
  >;

function complete(
  data: unknown
): EvmUnifiedModuleResult {
  return {
    status:
      "complete",
    data,
    error:
      null,
    limitation:
      null,
  };
}

function limited(
  data: unknown,
  limitation: string
): EvmUnifiedModuleResult {
  return {
    status:
      "limited",
    data,
    error:
      null,
    limitation,
  };
}

function unavailable(
  error: string,
  limitation: string | null =
    null
): EvmUnifiedModuleResult {
  return {
    status:
      "unavailable",
    data:
      null,
    error,
    limitation,
  };
}

function notRun(
  limitation: string | null =
    null
): EvmUnifiedModuleResult {
  return {
    status:
      "not-run",
    data:
      null,
    error:
      null,
    limitation,
  };
}

function providerFailureStatus(
  code: string
): number {
  if (
    code === "INVALID_ADDRESS"
  ) {
    return 400;
  }

  if (code === "RATE_LIMITED") {
    return 429;
  }

  if (code === "TIMEOUT") {
    return 504;
  }

  return 502;
}

function intelligenceErrorCode(
  code: string
):
  | "INVALID_ADDRESS"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR" {
  if (
    code === "INVALID_ADDRESS"
  ) {
    return "INVALID_ADDRESS";
  }

  if (
    code === "RATE_LIMITED"
  ) {
    return "RATE_LIMITED";
  }

  return "UPSTREAM_ERROR";
}

function assetKindFor(
  metadata: EvmTokenMetadata
): EvmUnifiedAssetKind {
  if (!metadata.isContract) {
    return "wallet";
  }

  return metadata.isErc20
    ? "erc20_contract"
    : "contract";
}

function transactionRelationshipObservations(
  transactions:
    readonly EvmTransaction[]
): EvmRelationshipObservation[] {
  const observations:
    EvmRelationshipObservation[] =
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

function relationshipCoverage(
  hasTransactions: boolean,
  hasTransfers: boolean,
  transactionExhausted: boolean,
  transferExhausted: boolean
): EvmWalletRelationshipCoverage {
  const included: EvmRelationshipEvidenceKind[] = [];

  if (hasTransactions) {
    included.push(
      "evm_transaction" as const
    );
  }

  if (hasTransfers) {
    included.push(
      "erc20_transfer" as const
    );
  }

  const omitted: EvmRelationshipEvidenceKind[] = [];

  if (!hasTransactions) {
    omitted.push(
      "evm_transaction" as const
    );
  }

  if (!hasTransfers) {
    omitted.push(
      "erc20_transfer" as const
    );
  }

  const limitations:
    string[] = [];

  if (!hasTransactions) {
    limitations.push(
      "EVM transaction relationship evidence was unavailable."
    );
  } else if (!transactionExhausted) {
    limitations.push(
      "EVM transaction relationship evidence was bounded to the first page."
    );
  }

  if (!hasTransfers) {
    limitations.push(
      "ERC-20 transfer relationship evidence was not included."
    );
  } else if (!transferExhausted) {
    limitations.push(
      "ERC-20 relationship evidence was bounded to the first transfer page."
    );
  }

  return {
    includesEvmTransactions:
      hasTransactions,

    includesErc20Transfers:
      hasTransfers,

    includedEvidenceKinds:
      included,

    omittedEvidenceKinds:
      omitted,

    limitation:
      limitations.length > 0
        ? limitations.join(" ")
        : null,
  };
}

function fundingCoverage(
  hasTransactions: boolean,
  hasTransfers: boolean,
  transactionExhausted: boolean,
  transferExhausted: boolean
): EvmFundingCoverage {
  const included: EvmFundingEvidenceKind[] = [];

  if (hasTransactions) {
    included.push(
      "evm_transaction" as const
    );
  }

  if (hasTransfers) {
    included.push(
      "erc20_transfer" as const
    );
  }

  const omitted: EvmFundingEvidenceKind[] = [];

  if (!hasTransactions) {
    omitted.push(
      "evm_transaction" as const
    );
  }

  if (!hasTransfers) {
    omitted.push(
      "erc20_transfer" as const
    );
  }

  const limitations:
    string[] = [];

  if (!hasTransactions) {
    limitations.push(
      "Direct EVM transaction funding evidence was unavailable."
    );
  } else if (!transactionExhausted) {
    limitations.push(
      "Transaction funding evidence was bounded to the first page."
    );
  }

  if (!hasTransfers) {
    limitations.push(
      "ERC-20 funding evidence was not included."
    );
  } else if (!transferExhausted) {
    limitations.push(
      "ERC-20 funding evidence was bounded to the first transfer page."
    );
  }

  return {
    includesEvmTransactions:
      hasTransactions,

    includesErc20Transfers:
      hasTransfers,

    includedEvidenceKinds:
      included,

    omittedEvidenceKinds:
      omitted,

    limitation:
      limitations.length > 0
        ? limitations.join(" ")
        : null,
  };
}

function moduleStatusFromCoverage(
  limitation: string | null
):
  | "complete"
  | "limited" {
  return limitation
    ? "limited"
    : "complete";
}

function createModule(
  status:
    | "complete"
    | "limited",
  data: unknown,
  limitation: string | null
): EvmUnifiedModuleResult {
  return status === "complete"
    ? complete(data)
    : limited(
        data,
        limitation ??
          "Coverage is limited."
      );
}

async function buildDeveloperHistory(
  network:
    NonNullable<
      ReturnType<
        typeof getEvmNetworkContext
      >
    >,
  target:
    EvmContractDeploymentLookup,
  deps:
    EvmUnifiedOrchestratorDependencies,
  transactionCache:
    Map<
      string,
      Promise<
        EvmProviderResult<
          EvmTransactionsPage
        >
      >
    >
): Promise<
  EvmUnifiedModuleResult
> {
  if (!target.isContract) {
    return notRun(
      "Developer history applies to verified contract deployment evidence."
    );
  }

  if (!target.deployment) {
    return unavailable(
      "Verified top-level deployment evidence was not available.",
      target.coverage
        .limitation
    );
  }

  const deployer =
    target.deployment
      .deployerAddress
      .toLowerCase();

  const transactions:
    EvmTransaction[] = [];

  let cursor:
    string | null = null;

  let scannedPages = 0;
  let historyExhausted =
    false;

  for (
    let page = 0;
    page <
      DEVELOPER_MAX_PAGES;
    page += 1
  ) {
    const key =
      `${deployer}:${cursor ?? ""}`;

    let resultPromise =
      transactionCache.get(
        key
      );

    if (!resultPromise) {
      resultPromise =
        deps.getTransactions({
          network,
          address:
            deployer,
          cursor,
        });

      transactionCache.set(
        key,
        resultPromise
      );
    }

    const result =
      await resultPromise;

    if (!result.ok) {
      return unavailable(
        result.error,
        "Developer transaction history could not be completed."
      );
    }

    scannedPages += 1;

    transactions.push(
      ...result.data
        .transactions
    );

    cursor =
      result.data
        .nextCursor;

    if (cursor === null) {
      historyExhausted =
        true;
      break;
    }
  }

  const candidates =
    [
      ...new Map(
        transactions
          .filter(
            transaction =>
              transaction.from
                ?.toLowerCase() ===
                deployer &&
              transaction.to === null
          )
          .map(
            transaction => [
              transaction.hash
                .toLowerCase(),
              transaction,
            ] as const
          )
      ).values(),
    ].sort(
      (left, right) =>
        (
          left.blockNumber ??
          Number.MAX_SAFE_INTEGER
        ) -
          (
            right.blockNumber ??
            Number.MAX_SAFE_INTEGER
          ) ||
        left.hash.localeCompare(
          right.hash
        )
    );

  const receiptCheckLimited =
    candidates.length >
      DEVELOPER_RECEIPT_LIMIT;

  const candidatesToCheck =
    candidates.slice(
      0,
      DEVELOPER_RECEIPT_LIMIT
    );

  const deployments:
    EvmDeveloperDeploymentObservation[] =
      [];

  let receiptVerificationFailureCount =
    0;

  for (
    const transaction of
      candidatesToCheck
  ) {
    const receiptResult =
      await deps
        .getTransactionReceipt({
          network,
          transactionHash:
            transaction.hash,
        });

    if (!receiptResult.ok) {
      receiptVerificationFailureCount +=
        1;
      continue;
    }

    const receipt =
      receiptResult.data;

    if (
      receipt.success === false ||
      receipt.to !== null ||
      receipt.contractAddress ===
        null ||
      receipt.from
        .toLowerCase() !==
        deployer
    ) {
      continue;
    }

    deployments.push({
      contractAddress:
        receipt.contractAddress,

      deployerAddress:
        receipt.from,

      transactionHash:
        receipt.transactionHash,

      blockNumber:
        receipt.blockNumber,

      timestamp:
        transaction.timestamp,

      creationKind:
        "top_level_create",

      evidenceKind:
        "transaction_receipt",
    });
  }

  const limitations = [
    "Only top-level CREATE deployments verified by transaction receipts are included.",
    "Internal CREATE and CREATE2 deployments are not included because trace evidence is not enabled.",
  ];

  if (!historyExhausted) {
    limitations.push(
      `Developer transaction history was bounded to ${DEVELOPER_MAX_PAGES} page(s).`
    );
  }

  if (receiptCheckLimited) {
    limitations.push(
      `Only ${DEVELOPER_RECEIPT_LIMIT} creation candidate(s) were receipt-checked.`
    );
  }

  if (
    receiptVerificationFailureCount >
      0
  ) {
    limitations.push(
      `${receiptVerificationFailureCount} receipt verification request(s) failed and were excluded.`
    );
  }

  const coverage:
    EvmDeveloperHistoryCoverage = {
    transactionHistorySource:
      "goldrush_transactions_v3",

    requestedMaxPages:
      DEVELOPER_MAX_PAGES,

    scannedPages,

    historyExhausted,

    receiptCheckLimit:
      DEVELOPER_RECEIPT_LIMIT,

    receiptCheckLimited,

    receiptVerificationFailureCount,

    includesTopLevelCreate:
      true,

    includesInternalCreate:
      false,

    includesCreate2:
      false,

    limitation:
      limitations.join(" "),
  };

  const intelligence =
    analyzeEvmDeveloperHistory({
      targetContractAddress:
        target
          .deployment
          .contractAddress,

      targetDeployment: {
        contractAddress:
          target
            .deployment
            .contractAddress,

        deployerAddress:
          target
            .deployment
            .deployerAddress,

        transactionHash:
          target
            .deployment
            .transactionHash,

        blockNumber:
          target
            .deployment
            .blockNumber,

        timestamp:
          target
            .deployment
            .timestamp,

        creationKind:
          "top_level_create",

        evidenceKind:
          "transaction_receipt",
      },

      observedDeployments:
        deployments,

      coverage,
    });

  const publicDeveloperHistory = {
    ...intelligence,

    coverage: {
      requestedMaxPages:
        intelligence.coverage
          .requestedMaxPages,

      scannedPages:
        intelligence.coverage
          .scannedPages,

      historyExhausted:
        intelligence.coverage
          .historyExhausted,

      receiptCheckLimit:
        intelligence.coverage
          .receiptCheckLimit,

      receiptCheckLimited:
        intelligence.coverage
          .receiptCheckLimited,

      receiptVerificationFailureCount:
        intelligence.coverage
          .receiptVerificationFailureCount,

      includesTopLevelCreate:
        intelligence.coverage
          .includesTopLevelCreate,

      includesInternalCreate:
        intelligence.coverage
          .includesInternalCreate,

      includesCreate2:
        intelligence.coverage
          .includesCreate2,

      limitation:
        intelligence.coverage
          .limitation,
    },
  };

  return limited(
    publicDeveloperHistory,
    coverage.limitation
  );
}

export async function runEvmUnifiedIntelligence(
  request:
    RunEvmUnifiedIntelligenceRequest,
  deps:
    EvmUnifiedOrchestratorDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  RunEvmUnifiedIntelligenceResult
> {
  const address =
    request.address
      .trim()
      .toLowerCase();

  if (
    !EVM_ADDRESS.test(
      address
    )
  ) {
    return {
      status: 400,
      data: {
        ok: false,
        code:
          "INVALID_ADDRESS",
        error:
          "Invalid EVM address.",
        network:
          request.networkId,
      },
    };
  }

  const network =
    getEvmNetworkContext(
      request.networkId
    );

  if (!network) {
    return {
      status: 503,
      data: {
        ok: false,
        code:
          "NETWORK_NOT_AVAILABLE",
        error:
          "EVM intelligence is not available for this network.",
        network:
          request.networkId,
      },
    };
  }

  const metadataResult =
    await deps
      .readTokenMetadata({
        network,
        address,
      });

  if (!metadataResult.ok) {
    return {
      status:
        providerFailureStatus(
          metadataResult.code
        ),

      data: {
        ok: false,
        code:
          intelligenceErrorCode(
            metadataResult.code
          ),
        error:
          metadataResult.error,
        network:
          request.networkId,
      },
    };
  }

  const metadata =
    metadataResult.data;

  const assetKind =
    assetKindFor(
      metadata
    );

  const modules:
    Partial<
      Record<
        EvmUnifiedModuleId,
        EvmUnifiedModuleResult
      >
    > = {
    assetVerification:
      complete(metadata),
  };

  const findings:
    IntelligenceFinding[] = [];

  const caveats = [
    "AYZO reports observed on-chain evidence and does not establish ownership, identity, intent, or control.",
  ];

  const transactionCache =
    new Map<
      string,
      Promise<
        EvmProviderResult<
          EvmTransactionsPage
        >
      >
    >();

  const getTransactions = (
    wallet: string,
    cursor: string | null =
      null
  ) => {
    const normalized =
      wallet.toLowerCase();

    const key =
      `${normalized}:${cursor ?? ""}`;

    let result =
      transactionCache.get(
        key
      );

    if (!result) {
      result =
        deps.getTransactions({
          network,
          address:
            normalized,
          cursor,
        });

      transactionCache.set(
        key,
        result
      );
    }

    return result;
  };

  const rootTransactionResult =
    await getTransactions(
      address
    );

  const rootTransactions:
    EvmTransaction[] =
      rootTransactionResult.ok
        ? [
            ...rootTransactionResult
              .data
              .transactions,
          ]
        : [];

  const transactionExhausted =
    rootTransactionResult.ok &&
    rootTransactionResult
      .data
      .nextCursor === null;

  let holdersResult:
    EvmProviderResult<EvmTokenHolders> | null =
      null;

  let transferResult:
    EvmProviderResult<EvmTransfersPage> | null =
      null;

  if (
    assetKind ===
      "erc20_contract"
  ) {
    [
      holdersResult,
      transferResult,
    ] = await Promise.all([
      deps.getTokenHolders({
        network,
        address,
        limit: 100,
        cursor: null,
      }),

      deps.getTokenTransfers({
        network,
        address,
        tokenAddress:
          address,
        limit: 100,
        cursor: null,
      }),
    ]);
  }

  const rootTransfers:
    EvmTransfer[] =
      transferResult?.ok
        ? [
            ...transferResult
              .data
              .transfers,
          ]
        : [];

  const transferExhausted =
    transferResult?.ok ===
      true &&
    transferResult.data
      .nextCursor === null;

  if (
    assetKind ===
      "erc20_contract"
  ) {
    if (
      holdersResult?.ok
    ) {
      const holderIntelligence =
        analyzeEvmTokenHolders(
          holdersResult.data
        );

      const holderLimitation =
        holdersResult.data
          .nextCursor !== null
          ? "Holder intelligence was bounded to the first 100 holders."
          : null;

      modules
        .holderIntelligence =
        createModule(
          moduleStatusFromCoverage(
            holderLimitation
          ),
          holderIntelligence,
          holderLimitation
        );

      findings.push({
        id:
          "evm-holder-concentration-observed",

        category:
          "holders",

        title:
          "Holder concentration measured",

        severity:
          "informational",

        confidence:
          "high",

        summary:
          `AYZO measured holder concentration across ${holderIntelligence.analyzedHolderCount} analyzed holder(s).`,

        caveat:
          holderLimitation ??
          "Concentration is descriptive evidence, not a trading recommendation.",
      });
    } else {
      modules
        .holderIntelligence =
        unavailable(
          holdersResult?.error ??
            "Holder intelligence was unavailable."
        );
    }
  } else {
    modules
      .holderIntelligence =
      notRun(
        "Holder concentration is only run for detected ERC-20 contracts."
      );
  }

  const relationshipObservations:
    EvmRelationshipObservation[] =
      [];

  if (
    rootTransactionResult.ok
  ) {
    relationshipObservations.push(
      ...transactionRelationshipObservations(
        rootTransactions
      )
    );
  }

  if (
    transferResult?.ok
  ) {
    relationshipObservations.push(
      ...evmTransfersToRelationshipObservations(
        rootTransfers
      )
    );
  }

  const hasRelationshipTransactions =
    rootTransactionResult.ok;

  const hasRelationshipTransfers =
    transferResult?.ok ===
    true;

  if (
    hasRelationshipTransactions ||
    hasRelationshipTransfers
  ) {
    const coverage =
      relationshipCoverage(
        hasRelationshipTransactions,
        hasRelationshipTransfers,
        transactionExhausted,
        transferExhausted
      );

    const intelligence =
      analyzeEvmWalletRelationships({
        walletAddress:
          address,

        observations:
          relationshipObservations,

        coverage,
      });

    modules
      .walletRelationships =
      createModule(
        moduleStatusFromCoverage(
          coverage.limitation
        ),
        intelligence,
        coverage.limitation
      );
  } else {
    modules
      .walletRelationships =
      unavailable(
        rootTransactionResult.ok
          ? (
              transferResult?.ok ===
              false
                ? transferResult.error
                : "Relationship evidence was unavailable."
            )
          : rootTransactionResult.error
      );
  }

  const fundingObservations:
    EvmFundingObservation[] = [];

  if (
    rootTransactionResult.ok
  ) {
    fundingObservations.push(
      ...evmTransactionsToFundingObservations(
        rootTransactions
      )
    );
  }

  if (
    transferResult?.ok
  ) {
    fundingObservations.push(
      ...evmTransfersToFundingObservations(
        rootTransfers
      )
    );
  }

  if (
    rootTransactionResult.ok ||
    transferResult?.ok
  ) {
    const coverage =
      fundingCoverage(
        rootTransactionResult.ok,
        transferResult?.ok ===
          true,
        transactionExhausted,
        transferExhausted
      );

    const intelligence =
      analyzeEvmFundingProvenance({
        walletAddress:
          address,

        observations:
          fundingObservations,

        coverage,
      });

    modules
      .fundingProvenance =
      createModule(
        moduleStatusFromCoverage(
          coverage.limitation
        ),
        intelligence,
        coverage.limitation
      );

    if (
      intelligence
        .fundingSourceCount >
      0
    ) {
      findings.push({
        id:
          "evm-funding-provenance-observed",

        category:
          "funding",

        title:
          "Funding provenance observed",

        severity:
          "informational",

        confidence:
          "high",

        summary:
          `AYZO observed ${intelligence.fundingSourceCount} funding source address(es) in the analyzed evidence.`,

        caveat:
          "Observed funding sources do not establish ownership or ultimate origin.",
      });
    }
  } else {
    modules
      .fundingProvenance =
      unavailable(
        "Funding evidence providers were unavailable."
      );
  }

  let deployment:
    EvmContractDeploymentLookup | null =
      null;

  if (
    metadata.isContract
  ) {
    const result =
      await deps
        .getContractDeployment({
          network,
          address,
        });

    if (result.ok) {
      deployment =
        result.data;

      modules
        .deploymentIntelligence =
        result.data
          .coverage
          .limitation
          ? limited(
              result.data,
              result.data
                .coverage
                .limitation
            )
          : complete(
              result.data
            );

      if (
        result.data
          .deployment
      ) {
        findings.push({
          id:
            "evm-deployment-evidence-observed",

          category:
            "deployment",

          title:
            "Contract deployment verified",

          severity:
            "informational",

          confidence:
            "high",

          summary:
            "AYZO verified top-level contract deployment evidence from an on-chain transaction receipt.",

          caveat:
            "The deployer address is a provable creation-event role and does not establish current ownership.",
        });
      }
    } else {
      modules
        .deploymentIntelligence =
        unavailable(
          result.error
        );
    }
  } else {
    modules
      .deploymentIntelligence =
      notRun(
        "Deployment intelligence applies to contract addresses."
      );
  }

  if (deployment) {
    modules
      .developerHistory =
      await buildDeveloperHistory(
        network,
        deployment,
        deps,
        transactionCache
      );

    const developerData =
      modules
        .developerHistory
        ?.data;

    if (
      developerData &&
      typeof developerData ===
        "object" &&
      "repeatedDeploymentActivity" in
        developerData &&
      developerData
        .repeatedDeploymentActivity ===
        true
    ) {
      findings.push({
        id:
          "evm-repeated-deployment-activity",

        category:
          "developer-history",

        title:
          "Repeated deployment activity observed",

        severity:
          "informational",

        confidence:
          "high",

        summary:
          "The verified deployer has additional receipt-backed top-level contract deployment evidence in the analyzed history window.",

        caveat:
          "Repeated deployment activity is descriptive and does not imply malicious intent or common ownership.",
      });
    }
  } else if (
    metadata.isContract
  ) {
    modules
      .developerHistory =
      unavailable(
        "Developer history requires verified deployment intelligence."
      );
  } else {
    modules
      .developerHistory =
      notRun(
        "Developer history applies to contract addresses."
      );
  }

  const rootGraphObservations:
    EvmWalletGraphObservation[] =
      [];

  if (
    rootTransactionResult.ok
  ) {
    rootGraphObservations.push(
      ...evmTransactionsToGraphObservations(
        rootTransactions
      )
    );
  }

  if (
    transferResult?.ok
  ) {
    rootGraphObservations.push(
      ...evmTransfersToGraphObservations(
        rootTransfers
      )
    );
  }

  const strongestNeighbors =
    rankEvmWalletGraphNeighbors(
      address,
      rootGraphObservations
    ).slice(
      0,
      EXPANSION_WALLET_LIMIT
    );

  const expansionTransactions:
    EvmTransaction[] = [];

  for (
    const neighbor of
      strongestNeighbors
  ) {
    const result =
      await getTransactions(
        neighbor.address
      );

    if (result.ok) {
      expansionTransactions.push(
        ...result.data
          .transactions
      );
    }
  }

  const coordinationWallets = [
    address,
    ...strongestNeighbors.map(
      neighbor =>
        neighbor.address
    ),
  ];

  if (
    coordinationWallets.length >=
      2
  ) {
    const observations:
      EvmCoordinationObservation[] =
        [];

    if (
      rootTransactionResult.ok
    ) {
      observations.push(
        ...evmTransactionsToCoordinationObservations(
          rootTransactions
        )
      );
    }

    if (
      transferResult?.ok
    ) {
      observations.push(
        ...evmTransfersToCoordinationObservations(
          rootTransfers
        )
      );
    }

    observations.push(
      ...evmTransactionsToCoordinationObservations(
        expansionTransactions
      )
    );

    const coverage:
      EvmCoordinationCoverage = {
      includesEvmTransactions:
        rootTransactionResult.ok,

      includesErc20Transfers:
        transferResult?.ok ===
        true,

      includesSharedFunding:
        true,

      includesSharedCounterparties:
        true,

      includesDirectInteractions:
        true,

      includesSameTransaction:
        true,

      includesSharedTokenActivity:
        transferResult?.ok ===
        true,

      includesTemporalCorrelation:
        false,

      includesOwnershipInference:
        false,

      limitation:
        "Coordination analysis is bounded to the analyzed address and up to two strongest observed counterparties. Secondary wallet expansion uses one transaction page. Temporal-correlation scoring and ownership inference are not included.",
    };

    const intelligence =
      analyzeEvmCoordinatedWalletBehavior({
        walletAddresses:
          coordinationWallets,

        observations,

        coverage,
      });

    modules
      .coordinatedWalletBehavior =
      limited(
        intelligence,
        coverage.limitation
      );

    if (
      intelligence.signalCount >
        0
    ) {
      findings.push({
        id:
          "evm-coordination-signals-observed",

        category:
          "coordination",

        title:
          "Coordination signals observed",

        severity:
          "informational",

        confidence:
          "high",

        summary:
          `AYZO produced ${intelligence.signalCount} evidence-backed coordination signal(s) in the bounded wallet set.`,

        caveat:
          "Coordination signals describe on-chain relationships and do not establish common ownership, identity, intent, or control.",
      });
    }
  } else {
    modules
      .coordinatedWalletBehavior =
      notRun(
        "No second wallet with sufficient direct evidence was available in the bounded root evidence."
      );
  }

  const graphObservations = [
    ...rootGraphObservations,

    ...evmTransactionsToGraphObservations(
      expansionTransactions
    ),
  ];

  if (
    graphObservations.length >
      0
  ) {
    const graphCoverage:
      EvmWalletGraphEvidenceCoverage = {
      includesEvmTransactions:
        rootTransactionResult.ok,

      includesErc20Transfers:
        transferResult?.ok ===
        true,

      includesOwnershipInference:
        false,

      limitation:
        "Unified analysis uses a bounded graph expansion: the root address plus up to two strongest observed counterparties, with one transaction page per expanded address. This is not an exhaustive recursive graph.",
    };

    const graph =
      analyzeEvmWalletGraph({
        rootAddress:
          address,

        observations:
          graphObservations,

        maxHops:
          GRAPH_MAX_HOPS,

        maxNodes:
          GRAPH_MAX_NODES,

        maxEdges:
          GRAPH_MAX_EDGES,

        evidenceCoverage:
          graphCoverage,
      });

    modules.walletGraph =
      limited(
        graph,
        graphCoverage
          .limitation
      );

    if (graph.edgeCount > 0) {
      findings.push({
        id:
          "evm-wallet-graph-observed",

        category:
          "wallet-graph",

        title:
          "Multi-hop relationship graph observed",

        severity:
          "informational",

        confidence:
          "high",

        summary:
          `AYZO constructed a bounded graph containing ${graph.nodeCount} node(s) and ${graph.edgeCount} evidence-backed edge(s).`,

        caveat:
          "Graph proximity does not establish common ownership, identity, intent, or control.",
      });
    }
  } else {
    modules.walletGraph =
      unavailable(
        "No usable transaction or transfer evidence was available for graph construction."
      );
  }

  return {
    status: 200,

    data:
      buildEvmUnifiedIntelligence({
        network,
        address,
        assetKind,
        modules,
        findings,
        caveats,
      }),
  };
}
