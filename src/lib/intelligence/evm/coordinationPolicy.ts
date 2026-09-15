import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type EvmCoordinationPolicy = {
  includesTemporalCorrelation:
    boolean;

  temporalWindowMs:
    number | null;
};

export const ADVANCED_TEMPORAL_WINDOW_MS =
  15 * 60 * 1000;

const STANDARD_POLICY:
  EvmCoordinationPolicy = {
    includesTemporalCorrelation:
      false,

    temporalWindowMs:
      null,
  };

const ADVANCED_POLICY:
  EvmCoordinationPolicy = {
    includesTemporalCorrelation:
      true,

    temporalWindowMs:
      ADVANCED_TEMPORAL_WINDOW_MS,
  };

export function getEvmCoordinationPolicy(
  plan:
    AnalysisDepthPlan
): EvmCoordinationPolicy {
  return plan === "advanced"
    ? ADVANCED_POLICY
    : STANDARD_POLICY;
}
