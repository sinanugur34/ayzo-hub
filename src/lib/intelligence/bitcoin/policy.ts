import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type BitcoinAnalysisPolicy = {
  historyLimit:
    number;

  canonicalSampleLimit:
    number;
};

const POLICIES:
  Record<
    AnalysisDepthPlan,
    BitcoinAnalysisPolicy
  > = {
    free: {
      historyLimit:
        5,

      canonicalSampleLimit:
        1,
    },

    pro: {
      historyLimit:
        10,

      canonicalSampleLimit:
        1,
    },

    advanced: {
      historyLimit:
        20,

      canonicalSampleLimit:
        1,
    },
  };

export function getBitcoinAnalysisPolicy(
  plan:
    AnalysisDepthPlan
): BitcoinAnalysisPolicy {
  return POLICIES[
    plan
  ];
}
