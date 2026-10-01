import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type BitcoinAnalysisPolicy = {
  historyLimit:
    number;

  canonicalSampleLimit:
    number;

  graphMaxNodes:
    number;

  graphMaxEdges:
    number;

  timelineMaxEvents:
    number;
};

/*
 * Bitcoin remains intentionally bounded because
 * each canonical transaction can require multiple
 * prevout lookups.
 *
 * Free preserves the existing entry experience.
 * Pro expands both history and canonical evidence.
 * Advanced materially increases the native UTXO
 * investigation window while remaining provider-safe.
 */
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

      graphMaxNodes:
        8,

      graphMaxEdges:
        12,

      timelineMaxEvents:
        5,
    },

    pro: {
      historyLimit:
        15,

      canonicalSampleLimit:
        3,

      graphMaxNodes:
        14,

      graphMaxEdges:
        24,

      timelineMaxEvents:
        15,
    },

    advanced: {
      historyLimit:
        30,

      canonicalSampleLimit:
        5,

      graphMaxNodes:
        28,

      graphMaxEdges:
        48,

      timelineMaxEvents:
        25,
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
