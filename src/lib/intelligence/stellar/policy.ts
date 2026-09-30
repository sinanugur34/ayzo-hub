import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type StellarAnalysisPolicy = {
  transactionLimit:
    number;

  paymentLimit:
    number;

  earliestPaymentLimit:
    number;

  operationLimit:
    number;

  offerLimit:
    number;

  tradeLimit:
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
    StellarAnalysisPolicy
  > = {
  free: {
    transactionLimit:
      8,

    paymentLimit:
      8,

    earliestPaymentLimit:
      4,

    operationLimit:
      8,

    offerLimit:
      8,

    tradeLimit:
      8,

    graphMaxNodes:
      8,

    graphMaxEdges:
      12,

    timelineMaxEvents:
      8,
  },

  pro: {
    transactionLimit:
      16,

    paymentLimit:
      16,

    earliestPaymentLimit:
      8,

    operationLimit:
      16,

    offerLimit:
      16,

    tradeLimit:
      16,

    graphMaxNodes:
      14,

    graphMaxEdges:
      24,

    timelineMaxEvents:
      16,
  },

  advanced: {
    transactionLimit:
      32,

    paymentLimit:
      32,

    earliestPaymentLimit:
      16,

    operationLimit:
      32,

    offerLimit:
      32,

    tradeLimit:
      32,

    graphMaxNodes:
      28,

    graphMaxEdges:
      48,

    timelineMaxEvents:
      32,
  },
};

export function getStellarAnalysisPolicy(
  plan:
    AnalysisDepthPlan
): StellarAnalysisPolicy {
  return POLICIES[
    plan
  ];
}
