import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type HyperliquidAnalysisPolicy = {
  fillLimit:
    number;

  fundingLimit:
    number;

  fundingLookbackDays:
    number;

  positionLimit:
    number;

  spotBalanceLimit:
    number;

  portfolioPointLimit:
    number;

  ledgerLimit:
    number;

  ledgerLookbackDays:
    number;

  timelineMaxEvents:
    number;

  graphMaxNodes:
    number;

  graphMaxEdges:
    number;
};

const POLICIES:
  Record<
    AnalysisDepthPlan,
    HyperliquidAnalysisPolicy
  > = {
  free: {
    fillLimit:
      12,

    fundingLimit:
      12,

    fundingLookbackDays:
      7,

    positionLimit:
      8,

    spotBalanceLimit:
      8,

    portfolioPointLimit:
      12,

    ledgerLimit:
      16,

    ledgerLookbackDays:
      7,

    timelineMaxEvents:
      8,

    graphMaxNodes:
      6,

    graphMaxEdges:
      8,
  },

  pro: {
    fillLimit:
      32,

    fundingLimit:
      32,

    fundingLookbackDays:
      30,

    positionLimit:
      16,

    spotBalanceLimit:
      16,

    portfolioPointLimit:
      32,

    ledgerLimit:
      48,

    ledgerLookbackDays:
      30,

    timelineMaxEvents:
      16,

    graphMaxNodes:
      10,

    graphMaxEdges:
      14,
  },

  advanced: {
    fillLimit:
      64,

    fundingLimit:
      64,

    fundingLookbackDays:
      90,

    positionLimit:
      32,

    spotBalanceLimit:
      32,

    portfolioPointLimit:
      64,

    ledgerLimit:
      96,

    ledgerLookbackDays:
      90,

    timelineMaxEvents:
      32,

    graphMaxNodes:
      16,

    graphMaxEdges:
      24,
  },
};

export function getHyperliquidAnalysisPolicy(
  plan:
    AnalysisDepthPlan
): HyperliquidAnalysisPolicy {
  return POLICIES[
    plan
  ];
}
