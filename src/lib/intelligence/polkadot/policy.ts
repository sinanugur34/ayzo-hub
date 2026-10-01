import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type PolkadotAnalysisPolicy = {
  transferLimit:
    number;

  extrinsicLimit:
    number;

  proxyLimit:
    number;

  multisigLimit:
    number;

  graphMaxNodes:
    number;

  graphMaxEdges:
    number;

  timelineMaxEvents:
    number;

  providerRequestBudget:
    number;
};

const POLICIES:
  Record<
    AnalysisDepthPlan,
    PolkadotAnalysisPolicy
  > = {
  free: {
    transferLimit:
      20,

    extrinsicLimit:
      20,

    proxyLimit:
      8,

    multisigLimit:
      8,

    graphMaxNodes:
      24,

    graphMaxEdges:
      40,

    timelineMaxEvents:
      24,

    providerRequestBudget:
      8,
  },

  pro: {
    transferLimit:
      80,

    extrinsicLimit:
      80,

    proxyLimit:
      24,

    multisigLimit:
      24,

    graphMaxNodes:
      72,

    graphMaxEdges:
      128,

    timelineMaxEvents:
      96,

    providerRequestBudget:
      16,
  },

  advanced: {
    transferLimit:
      200,

    extrinsicLimit:
      200,

    proxyLimit:
      64,

    multisigLimit:
      64,

    graphMaxNodes:
      180,

    graphMaxEdges:
      360,

    timelineMaxEvents:
      240,

    providerRequestBudget:
      32,
  },
};

export function getPolkadotAnalysisPolicy(
  plan:
    AnalysisDepthPlan
): PolkadotAnalysisPolicy {
  return POLICIES[
    plan
  ];
}
