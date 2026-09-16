import type {
  EvmCoordinatedWalletBehavior,
} from "./coordinatedWalletBehavior";

import type {
  EvmDeepDeployerInvestigation,
} from "./deepDeployerInvestigation";

import type {
  EvmDeepFundingTracing,
} from "./deepFundingTracing";

import type {
  EvmWalletGraph,
} from "./walletGraph";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

const TX_HASH =
  /^0x[0-9a-fA-F]{64}$/;

export type EvmAdvancedSynthesisHighlightKind =
  | "deep_funding"
  | "deep_deployer"
  | "wallet_graph"
  | "coordination";

export type EvmAdvancedSynthesisHighlight = {
  kind:
    EvmAdvancedSynthesisHighlightKind;

  summary:
    string;
};

export type EvmAdvancedInvestigationSynthesisCoverage = {
  includesDeepFunding:
    boolean;

  includesDeepDeployer:
    boolean;

  includesWalletGraph:
    boolean;

  includesCoordination:
    boolean;

  includesOwnershipInference:
    false;

  includesIdentityInference:
    false;

  includesIntentInference:
    false;

  includesRiskScoring:
    false;

  limitation:
    string;
};

export type EvmAdvancedInvestigationSynthesis = {
  schemaVersion: 1;

  rootAddress:
    string;

  sourceModuleCount:
    number;

  evidenceTransactionCount:
    number;

  evidenceTransactionHashes:
    readonly string[];

  funding: {
    available:
      boolean;

    pathCount:
      number;

    maxDepthReached:
      number;

    nodeCount:
      number;

    edgeCount:
      number;
  };

  deployer: {
    available:
      boolean;

    verifiedDeploymentCount:
      number;

    otherVerifiedDeploymentCount:
      number;

    repeatedDeploymentActivity:
      boolean;

    fundingSourceCount:
      number;

    counterpartyCount:
      number;
  };

  graph: {
    available:
      boolean;

    nodeCount:
      number;

    edgeCount:
      number;

    maxDepthReached:
      number;
  };

  coordination: {
    available:
      boolean;

    signalCount:
      number;

    directSignalCount:
      number;

    corroboratingSignalCount:
      number;

    temporalCorrelationSignalCount:
      number;

    multiHopPathCorroborationCount:
      number;
  };

  highlights:
    readonly EvmAdvancedSynthesisHighlight[];

  coverage:
    EvmAdvancedInvestigationSynthesisCoverage;
};

export type AnalyzeEvmAdvancedInvestigationSynthesisRequest = {
  rootAddress:
    string;

  deepFundingTracing?:
    EvmDeepFundingTracing | null;

  deepDeployerInvestigation?:
    EvmDeepDeployerInvestigation | null;

  walletGraph?:
    EvmWalletGraph | null;

  coordination?:
    EvmCoordinatedWalletBehavior | null;
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

function normalizeTransactionHashes(
  values:
    readonly string[]
): readonly string[] {
  const hashes =
    new Set<string>();

  for (
    const value of
      values
  ) {
    const normalized =
      value
        .trim()
        .toLowerCase();

    if (
      TX_HASH.test(
        normalized
      )
    ) {
      hashes.add(
        normalized
      );
    }
  }

  return [
    ...hashes,
  ].sort();
}

export function analyzeEvmAdvancedInvestigationSynthesis(
  request:
    AnalyzeEvmAdvancedInvestigationSynthesisRequest
): EvmAdvancedInvestigationSynthesis {
  const rootAddress =
    normalizeAddress(
      request.rootAddress
    );

  if (!rootAddress) {
    throw new Error(
      "Invalid EVM synthesis root address."
    );
  }

  const deepFunding =
    request
      .deepFundingTracing ??
    null;

  const deepDeployer =
    request
      .deepDeployerInvestigation ??
    null;

  const graph =
    request.walletGraph ??
    null;

  const coordination =
    request.coordination ??
    null;

  const sourceModuleCount =
    [
      deepFunding,
      deepDeployer,
      graph,
      coordination,
    ].filter(
      value =>
        value !== null
    ).length;

  const evidenceTransactionHashes =
    normalizeTransactionHashes([
      ...(
        deepFunding
          ?.evidenceTransactionHashes ??
        []
      ),

      ...(
        deepDeployer
          ?.evidenceTransactionHashes ??
        []
      ),

      ...(
        graph
          ?.edges
          .flatMap(
            edge =>
              edge
                .evidenceTransactionHashes
          ) ??
        []
      ),

      ...(
        coordination
          ?.evidenceTransactionHashes ??
        []
      ),
    ]);

  const highlights:
    EvmAdvancedSynthesisHighlight[] =
      [];

  if (
    deepFunding &&
    deepFunding.pathCount >
      0
  ) {
    highlights.push({
      kind:
        "deep_funding",

      summary:
        `Observed ${deepFunding.pathCount} bounded upstream funding path(s) reaching up to ${deepFunding.maxDepthReached} hop(s).`,
    });
  }

  if (
    deepDeployer &&
    deepDeployer
      .verifiedDeploymentCount >
      0
  ) {
    highlights.push({
      kind:
        "deep_deployer",

      summary:
        `Observed ${deepDeployer.verifiedDeploymentCount} receipt-backed deployment record(s) for the verified deployer in the bounded history window.`,
    });
  }

  if (
    graph &&
    graph.edgeCount >
      0
  ) {
    highlights.push({
      kind:
        "wallet_graph",

      summary:
        `Observed a bounded relationship graph containing ${graph.nodeCount} node(s) and ${graph.edgeCount} evidence-backed edge(s).`,
    });
  }

  if (
    coordination &&
    coordination.signalCount >
      0
  ) {
    highlights.push({
      kind:
        "coordination",

      summary:
        `Observed ${coordination.signalCount} evidence-backed coordination signal(s), including ${coordination.corroboratedSignalCount} corroborated signal(s).`,
    });
  }

  return {
    schemaVersion:
      1,

    rootAddress,

    sourceModuleCount,

    evidenceTransactionCount:
      evidenceTransactionHashes
        .length,

    evidenceTransactionHashes,

    funding: {
      available:
        deepFunding !== null,

      pathCount:
        deepFunding
          ?.pathCount ??
        0,

      maxDepthReached:
        deepFunding
          ?.maxDepthReached ??
        0,

      nodeCount:
        deepFunding
          ?.nodeCount ??
        0,

      edgeCount:
        deepFunding
          ?.edgeCount ??
        0,
    },

    deployer: {
      available:
        deepDeployer !==
        null,

      verifiedDeploymentCount:
        deepDeployer
          ?.verifiedDeploymentCount ??
        0,

      otherVerifiedDeploymentCount:
        deepDeployer
          ?.otherVerifiedDeploymentCount ??
        0,

      repeatedDeploymentActivity:
        deepDeployer
          ?.repeatedDeploymentActivity ??
        false,

      fundingSourceCount:
        deepDeployer
          ?.fundingContext
          ?.fundingSourceCount ??
        0,

      counterpartyCount:
        deepDeployer
          ?.relationshipContext
          ?.counterpartyCount ??
        0,
    },

    graph: {
      available:
        graph !== null,

      nodeCount:
        graph
          ?.nodeCount ??
        0,

      edgeCount:
        graph
          ?.edgeCount ??
        0,

      maxDepthReached:
        graph
          ?.maxDepthReached ??
        0,
    },

    coordination: {
      available:
        coordination !==
        null,

      signalCount:
        coordination
          ?.signalCount ??
        0,

      directSignalCount:
        coordination
          ?.directSignalCount ??
        0,

      corroboratingSignalCount:
        coordination
          ?.corroboratingSignalCount ??
        0,

      temporalCorrelationSignalCount:
        coordination
          ?.temporalCorrelationSignalCount ??
        0,

      multiHopPathCorroborationCount:
        coordination
          ?.multiHopPathCorroborationCount ??
        0,
    },

    highlights,

    coverage: {
      includesDeepFunding:
        deepFunding !==
        null,

      includesDeepDeployer:
        deepDeployer !==
        null,

      includesWalletGraph:
        graph !== null,

      includesCoordination:
        coordination !==
        null,

      includesOwnershipInference:
        false,

      includesIdentityInference:
        false,

      includesIntentInference:
        false,

      includesRiskScoring:
        false,

      limitation:
        "Advanced Investigation Synthesis combines bounded evidence already produced by AYZO intelligence modules. Cross-module proximity, repeated observations, funding paths, graph connections and coordination signals do not establish ownership, identity, common control, intent, malicious behavior or exhaustive transaction history.",
    },
  };
}
