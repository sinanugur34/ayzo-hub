import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type TonAnalysisPolicy = {
  historyLimit:
    number;

  earliestHistoryLimit:
    number;

  jettonWalletLimit:
    number;

  jettonTransferLimit:
    number;

  graphMaxNodes:
    number;

  graphMaxEdges:
    number;

  timelineMaxEvents:
    number;
};

const POLICIES:
  Record<
    AnalysisDepthPlan,
    TonAnalysisPolicy
  > = {
  free: {
    historyLimit:
      8,

    earliestHistoryLimit:
      4,

    jettonWalletLimit:
      8,

    jettonTransferLimit:
      8,

    graphMaxNodes:
      8,

    graphMaxEdges:
      12,

    timelineMaxEvents:
      8,
  },

  pro: {
    historyLimit:
      16,

    earliestHistoryLimit:
      8,

    jettonWalletLimit:
      16,

    jettonTransferLimit:
      16,

    graphMaxNodes:
      14,

    graphMaxEdges:
      24,

    timelineMaxEvents:
      16,
  },

  advanced: {
    historyLimit:
      32,

    earliestHistoryLimit:
      16,

    jettonWalletLimit:
      32,

    jettonTransferLimit:
      32,

    graphMaxNodes:
      28,

    graphMaxEdges:
      48,

    timelineMaxEvents:
      32,
  },
};

export function getTonAnalysisPolicy(
  plan:
    AnalysisDepthPlan
): TonAnalysisPolicy {
  return POLICIES[
    plan
  ];
}
