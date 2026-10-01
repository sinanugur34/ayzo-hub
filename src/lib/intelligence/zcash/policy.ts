import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type ZcashAnalysisPolicy = {
  historyLimit: number;
  canonicalSampleLimit: number;
  utxoLimit: number;
  graphMaxNodes: number;
  graphMaxEdges: number;
  timelineMaxEvents: number;
  providerRequestBudget: number;
};

const POLICIES:
  Record<
    AnalysisDepthPlan,
    ZcashAnalysisPolicy
  > = {
  free: {
    historyLimit: 16,
    canonicalSampleLimit: 4,
    utxoLimit: 24,
    graphMaxNodes: 24,
    graphMaxEdges: 40,
    timelineMaxEvents: 24,
    providerRequestBudget: 12,
  },

  pro: {
    historyLimit: 64,
    canonicalSampleLimit: 12,
    utxoLimit: 96,
    graphMaxNodes: 72,
    graphMaxEdges: 128,
    timelineMaxEvents: 96,
    providerRequestBudget: 32,
  },

  advanced: {
    historyLimit: 180,
    canonicalSampleLimit: 32,
    utxoLimit: 256,
    graphMaxNodes: 180,
    graphMaxEdges: 360,
    timelineMaxEvents: 240,
    providerRequestBudget: 72,
  },
};

export function getZcashAnalysisPolicy(
  plan: AnalysisDepthPlan
): ZcashAnalysisPolicy {
  return POLICIES[plan];
}
